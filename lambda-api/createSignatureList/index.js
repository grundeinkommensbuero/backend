const AWS = require('aws-sdk');

const uuid = require('uuid/v4');

const ddb = new AWS.DynamoDB.DocumentClient();

const usersTableName = process.env.TABLE_NAME_USERS;

const signaturesTableName = process.env.TABLE_NAME_SIGNATURES;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);
    const date = new Date();
    const timestamp = date.toISOString();
    //get user id from request body (might not exist)
    if ('userId' in requestBody) {
      const userId = requestBody.userId;
      try {
        const user = await getUser(userId);
        //if user does not have Item as property, there was no user found
        if (!('Item' in user) || typeof user.Item === 'undefined') {
          return errorResponse(400, 'No user found with the passed user id');
        }
        //user was found, proceed by checking if signature list entry with userId already exists
        const foundSignatureLists = await getSignatureListByUser(userId);
        if (foundSignatureLists.Count !== 0) {
          //if there was a signature list with the user as "owner" found
          //we just want to send the list id as response
          return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({
              signatureList: foundSignatureLists.Items[0], //in the current setup user definitely only has one
              message: 'User already had an entry in signatures db',
            }),
            isBase64Encoded: false,
          };
        } else {
          //if there was no signature list with the user as "owner" found
          //we are going to create a new one
          const id = uuid();
          try {
            await createSignatureList(id, timestamp, userId);
            //creation of new list was successful, which is why we are going to return the new id
            return {
              statusCode: 201,
              headers: responseHeaders,
              body: JSON.stringify({
                signatureList: { id: id },
                message:
                  'There was no signature list of this user, created new one',
              }),
              isBase64Encoded: false,
            };
          } catch (error) {
            console.log('error while creating new signature list', error);
            return errorResponse(
              500,
              'error while creating new signature list',
              error
            );
          }
        }
      } catch (error) {
        console.log('error while getting user or signature list', error);
        return errorResponse(
          500,
          'error while getting user or signature list',
          error
        );
      }
    } else {
      //user id does not exist: create new list entry without userid
      const id = uuid();
      try {
        await createSignatureList(id, timestamp);
        //creation of new list was successful, which is why we are going to return the new id
        return {
          statusCode: 201,
          headers: responseHeaders,
          body: JSON.stringify({
            signatureList: { id: id },
            message: 'Created new anonymous signature list',
          }),
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log('error while creating new signature list', error);
        return errorResponse(
          500,
          'error while creating new signature list',
          error
        );
      }
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const getUser = userId => {
  const params = {
    TableName: usersTableName,
    Key: {
      cognitoId: userId,
    },
  };
  return ddb.get(params).promise();
};

//function to check, if there already is a signature list owned by the user
const getSignatureListByUser = userId => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ProjectionExpression: 'id',
  };
  return ddb.scan(params).promise();
};

//function to create new signature list, userId can be null (anonymous list)
const createSignatureList = (id, timestamp, userId = null) => {
  const params = {
    TableName: signaturesTableName,
    Item: {
      id: id,
      createdAt: timestamp,
    },
  };

  // if the list is not supposed to be anonymous, append user id
  if (userId !== null) {
    params.Item.userId = userId;
  }

  return ddb.put(params).promise();
};

const errorResponse = (statusCode, message, error = null) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error,
    });
  } else {
    body = JSON.stringify({
      message: message,
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: responseHeaders,
    isBase64Encoded: false,
  };
};
