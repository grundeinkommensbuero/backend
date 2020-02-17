const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const {
  getSignatureList,
  getSignatureListsOfUser,
  checkIfIdExists,
} = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const { getUserByMail } = require('../../../shared/users');
const {
  constructCampaignId,
  generateRandomId,
} = require('../../../shared/utils');

const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get user id from path parameter
    const body = JSON.parse(event.body);
    const { listId, email, campaignCode } = body;
    let { userId, count } = body;

    //if the one of the needed params is somehow undefined return error
    if (!validateParams(listId, userId, email, count, campaignCode)) {
      return errorResponse(
        400,
        'List id (or user id) or count not provided or incorrect in request'
      );
    }

    count = parseInt(count);

    //check which pledge it is (e.g. pledgeId='brandenburg-1')
    //create a (nice to later work with) object, which campaign it is
    const campaign = constructCampaignId(campaignCode);

    try {
      let listToUpdateId;

      // Check if list id is provided
      if (typeof listId !== 'undefined') {
        // check if there even is a list with the id
        // (update creates a new entry, if it does not exist)
        const result = await getSignatureList(listId);

        // if result does not have Item as property, there was no list found
        if (!('Item' in result)) {
          return errorResponse(404, 'No list found with the passed id');
        }

        listToUpdateId = listId;
      } else {
        // userId or email was provided,
        // therefore we want to find a list for this user

        // if email was provided instead of user id we first need the userid
        if (typeof userId === 'undefined') {
          const result = await getUserByMail(email);

          if (result.Count === 0) {
            return errorResponse(404, 'No user with that email found');
          }

          userId = result.Items[0].cognitoId;
        }

        const list = await getFirstSignatureListOfUser(userId, campaignCode);

        // if function returned null, there was no list found
        if (!list) {
          // If no lists were found we want to create a new list for this user
          listToUpdateId = await createSignatureList(userId, campaign);
        } else {
          listToUpdateId = list.id;
        }
      }

      // Proceed by updating dynamo resource
      try {
        await updateSignatureList(listToUpdateId, count);
        // return message (no content)
        return {
          statusCode: 204,
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log('Error while updating signature list', error);
        return errorResponse(500, 'Error while updating signature list', error);
      }
    } catch (error) {
      console.log('Error while getting signature list', error);
      return errorResponse(500, 'Error while getting signature list', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

//function to set the count for the signature list
const updateSignatureList = (id, count) => {
  //needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count),
      timestamp: new Date().toISOString(),
    },
  ];
  const params = {
    TableName: signaturesTableName,
    Key: { id: id },
    UpdateExpression:
      'SET scannedByUser = list_append(if_not_exists(scannedByUser, :emptyList), :count)',
    ExpressionAttributeValues: { ':count': countObject, ':emptyList': [] },
  };
  return ddb.update(params).promise();
};

// Creates a new "fake" signature list and returns the id
const createSignatureList = async (userId, campaign) => {
  //because the id is quite small we need to check if the newly created one already exists (unlikely)
  let idExists = true;
  let id;

  while (idExists) {
    id = generateRandomId(7);
    idExists = await checkIfIdExists(id);
    console.log('id already exists?', idExists);
  }

  const date = new Date();
  //we only want the current day (YYYY-MM-DD), then it is also easier to filter
  const timestamp = date.toISOString().substring(0, 10);

  const params = {
    TableName: signaturesTableName,
    Item: {
      id: id,
      campaign: campaign,
      createdAt: timestamp,
      userId: userId,
      fakeScannedByUser: true,
    },
  };

  await ddb.put(params).promise();

  return id;
};

// Function to get the first list of the user
const getFirstSignatureListOfUser = async (userId, campaignCode) => {
  // First get all lists for this user
  const signatureLists = await getSignatureListsOfUser(userId, campaignCode);

  // if result does not have Item as property, there was no list found
  if (signatureLists.length === 0) {
    return null;
  }

  // Then check the date to get the first one
  let firstList = signatureLists[0];

  for (let list of signatureLists) {
    // Check if this list was created earlier than the current firstList
    if (new Date(list.createdAt) < new Date(firstList.createdAt)) {
      console.log(`${list.createdAt} is earlier than ${firstList.createdAt}`);
      firstList = list;
    }
  }

  console.log('first list', firstList);
  return firstList;
};

const validateParams = (listId, userId, email, count) => {
  if (
    (typeof listId === 'undefined' &&
      typeof userId === 'undefined' &&
      typeof email === 'undefined') ||
    typeof count === 'undefined'
  ) {
    return false;
  }

  const parsedCount = parseInt(count);
  return (
    Number.isInteger(parsedCount) && parsedCount >= 0 && parsedCount < 1000
  );
};
