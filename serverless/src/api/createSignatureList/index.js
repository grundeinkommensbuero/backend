const AWS = require('aws-sdk');
const generatePdf = require('./createPDF');
const sendMail = require('./sendMail');
const fs = require('fs');
const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();
const config = require('./../../../config');
const usersTableName = config.tableNameUsers;
const signaturesTableName = config.signaturesTableName;
const inputPDF = fs.readFileSync(__dirname + '/list_sh.pdf');
const URL = 'https://expedition-grundeinkommen.de/scan?id=';
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

/*  Model for signature lists in db

  id: string (of 7 digits)
  userId: string or email:string
  createdAt: timestamp (YYYY-MM-DD)
  campaign: object
  downloads: number
  received: number
  pdfUrl: string

*/

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);
    //create a (nice to later work with) object, which campaign it is
    const campaign = constructCampaignId(requestBody.campaignCode);

    const date = new Date();
    //we only want the current day (YYYY-MM-DD), then it is also easier to filter
    const timestamp = date.toISOString().substring(0, 10);
    //get user id from request body (might not exist, in that case we go a different route)
    let userId;
    //we need the email to later send the pdf
    let email;
    if ('userId' in requestBody) {
      userId = requestBody.userId;
      //now we want to validate if the user actually exists
      try {
        const user = await getUser(userId);
        //if user does not have Item as property, there was no user found
        if (!('Item' in user) || typeof user.Item === 'undefined') {
          return errorResponse(400, 'No user found with the passed user id');
        }

        email = user.Item.email;
      } catch (error) {
        return errorResponse(500, 'Error while getting user', error);
      }
    } else if ('email' in requestBody) {
      email = requestBody.email;
      //in case the api only got the email instead of the id we need to get the user id from the db
      try {
        const result = await getUserByMail(email);
        if (result.Count === 0) {
          return errorResponse(400, 'No user found with the passed email');
        } else {
          userId = result.Items[0].cognitoId;
        }
      } catch (error) {
        return errorResponse(500, 'Error while getting user by email', error);
      }
    } else {
      userId = 'anonymous';
    }

    //in does not matter, if the user is anonymous or not...
    //now we check, if there already is an entry for the list for this day
    const foundSignatureLists = await getSignatureList(userId, timestamp);
    if (foundSignatureLists.Count !== 0) {
      //if there was a signature list for this day found
      //we want to update the downloads counter and send the list id and the url to the pdf as response
      const signatureList = foundSignatureLists.Items[0]; //we definitely only have one value (per user/day)
      console.log('signature list', signatureList);
      try {
        //update list entry to increment the download count
        await incrementDownloads(signatureList.id, signatureList.downloads);
        //after the signature list was successfully updated we return it (id and url to pdf)
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: JSON.stringify({
            signatureList: { id: signatureList.id, url: signatureList.pdfUrl },
            message:
              'There was already an entry in signatures db and a pdf for this day and user (or anonymous)',
          }),
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log('Error while updating list entry', error);
        return errorResponse(500, 'Error while updating list entry', error);
      }
    } else {
      //if there was no signature list with the user as "owner" found
      //we are going to create a new one

      //because the id is quite small we need to check if the newly created one already exists (unlikely)
      let idExists = true;
      let pdfId;
      while (idExists) {
        pdfId = generateRandomId(7);
        idExists = await checkIfIdExists(pdfId);
        console.log('id already exists?', idExists);
      }
      try {
        //we are going to generate the pdf
        let currentMillis = new Date().getTime();
        const generatedPdf = await generatePdf(URL, pdfId, inputPDF);
        console.log(
          'generating pdf takes',
          new Date().getTime() - currentMillis
        );
        //upload pdf to s3 after generation was successful
        const uploadResult = await uploadPDF(pdfId, generatedPdf);
        console.log('success uploading pdf to bucket', uploadResult);
        const url = uploadResult.Location;
        try {
          //if the upload process was successful, we create the list entry in the db
          //userId might be 'anonymous'
          await createSignatureList(pdfId, timestamp, url, campaign, userId);

          try {
            //if the download was not anonymous send a mail with the attached pdf
            if (userId !== 'anonymous') {
              let currentMillis = new Date().getTime();
              await sendMail(email, generatedPdf);
              console.log(
                'sending mail takes',
                new Date().getTime() - currentMillis
              );
            }
            return {
              statusCode: 201,
              headers: responseHeaders,
              body: JSON.stringify({
                signatureList: { id: pdfId, url: url },
                message:
                  'There was no signature list of this user, created new pdf and uploaded it',
              }),
              isBase64Encoded: false,
            };
          } catch (error) {
            console.log('Error while sending email', error);
            return errorResponse(500, 'Error while sending email', error);
          }
        } catch (error) {
          console.log('error while creating new signature list in db', error);
          return errorResponse(
            500,
            'Error while creating new signature list in db',
            error
          );
        }
      } catch (error) {
        return errorResponse(
          500,
          'Error while generating or uploading PDF',
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

const getUserByMail = email => {
  const params = {
    TableName: usersTableName,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    ProjectionExpression: 'cognitoId',
  };
  return ddb.scan(params).promise();
};

//function to check, if there already is a signature list for this specific day (owned by user or anonymous)
const getSignatureList = (userId, timestamp) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression: 'userId = :userId AND createdAt = :timestamp',
    ExpressionAttributeValues: { ':userId': userId, ':timestamp': timestamp },
    ProjectionExpression: 'id, pdfUrl, downloads',
  };
  return ddb.scan(params).promise();
};

//Checks, if the passed id already exists in the signatures table (returns true or false)
const checkIfIdExists = async id => {
  const params = {
    TableName: signaturesTableName,
    Key: {
      id: id,
    },
    ProjectionExpression: 'id',
  };
  const result = await ddb.get(params).promise();
  //if there is Item in result, there was an entry found
  return 'Item' in result && typeof result.Item !== 'undefined';
};

//function to create new signature list, userId can be null (anonymous list)
const createSignatureList = (id, timestamp, url, campaign, userId = null) => {
  const params = {
    TableName: signaturesTableName,
    Item: {
      id: id,
      pdfUrl: url,
      downloads: 1,
      received: 0,
      campaign: campaign,
      createdAt: timestamp,
    },
  };

  // if the list is not supposed to be anonymous, append user id
  if (userId !== null) {
    params.Item.userId = userId;
  }

  return ddb.put(params).promise();
};

//updates entry in signature lists db to increment the download (the current download count is passed)
const incrementDownloads = (id, downloads) => {
  downloads++;
  const params = {
    TableName: signaturesTableName,
    Key: { id: id },
    UpdateExpression: 'SET downloads = :downloads',
    ExpressionAttributeValues: { ':downloads': downloads },
  };
  return ddb.update(params).promise();
};

//uploads pdf to s3 bucket
const uploadPDF = (id, pdf) => {
  return s3
    .upload({
      Bucket: 'signature-lists',
      ACL: 'public-read',
      Key: `${id}.pdf`,
      Body: Buffer.from(pdf),
      ContentType: 'application/pdf',
    })
    .promise();
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

const generateRandomId = length => {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const constructCampaignId = campaignCode => {
  const campaign = {};
  if (typeof campaignCode !== 'undefined') {
    //we want to remove the last characters from the string (brandenburg-2 -> brandenburg)
    campaign.state = campaignCode.substring(0, campaignCode.length - 2);
    //...and take the last char and save it as number
    campaign.round = parseInt(
      campaignCode.substring(campaignCode.length - 1, campaignCode.length)
    );
    campaign.code = campaignCode;
  }
  return campaign;
};
