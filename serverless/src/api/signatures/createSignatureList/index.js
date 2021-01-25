const AWS = require('aws-sdk');
const generatePdf = require('../../../shared/signatures/createPdf/createPDF');
const generateAttachments = require('../../../shared/signatures/createPdf/generateAttachments');
const sendMail = require('./sendMail');
const createSignatureList = require('./createListInDynamo');
const { getUser, getUserByMail } = require('../../../shared/users');
const { checkIfIdExists } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const mailAttachments = require('../../../shared/signatures/createPdf/attachments');
const qrCodeUrls = require('../../../shared/signatures/createPdf/qrCodeUrls');
const {
  constructCampaignId,
  generateRandomId,
} = require('../../../shared/utils');

const config = { region: 'eu-central-1' };
const s3 = new AWS.S3(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const signaturesTableName =
  process.env.SIGNATURES_TABLE_NAME || 'prod-signatures';
const usersTableName = process.env.USERS_TABLE_NAME || 'prod-users';
const bucket = process.env.SIGNATURE_LISTS_BUCKET;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

/*  Model for signature lists in db

  id: string (of 7 digits)
  userId: string
  createdAt: timestamp (YYYY-MM-DD)
  campaign: object
  downloads: number
  pdfUrl: string
  received: array
  scannedByUser: array

*/

const handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    // Only for the backend of the expedition we have been passed a campaign code,
    // not for the prototype fund
    let campaignCode;

    if (process.env.IS_XBGE) {
      if (!('campaignCode' in requestBody)) {
        return errorResponse(400, 'Campaign code not provided');
      }

      campaignCode = requestBody.campaignCode;

      // create a (nice to later work with) object, which campaign it is
    } else {
      campaignCode = 'direct-democracy-1';
    }

    const campaign = constructCampaignId(campaignCode);

    const date = new Date();
    // we only want the current day (YYYY-MM-DD), then it is also easier to filter
    const timestamp = date.toISOString().substring(0, 10);

    // get user id from request body (might not exist, in that case we go a different route)
    let userId;
    // we need the email to later send the pdf
    let email;
    let username;
    if (event.pathParameters) {
      userId = event.pathParameters.userId;

      // now we want to validate if the user actually exists
      try {
        const result = await getUser(userId);

        // if user does not have Item as property, there was no user found
        if (!('Item' in result) || typeof result.Item === 'undefined') {
          return errorResponse(404, 'No user found with the passed user id');
        }

        // If we came from authenticated route with userId in path params,
        // we need to check if the user is authorized (same user as in token)
        if (event.pathParameters && !isAuthorized(event)) {
          return errorResponse(401, 'Token points to a different user');
        }

        email = result.Item.email;
        username = result.Item.username;
      } catch (error) {
        console.log('error', error);
        return errorResponse(500, 'Error while getting user', error);
      }
    } else {
      userId = 'anonymous';
    }

    // it does not matter, if the user is anonymous or not...
    // now we check, if there already is an entry for the list for this day
    const foundSignatureLists = await getSignatureList(
      userId,
      timestamp,
      campaign.code
    );

    if (
      foundSignatureLists.Count !== 0 &&
      !foundSignatureLists.Items[0].manually
    ) {
      // if there was a signature list for this day found
      // we want to update the downloads counter and send the list id and the url to the pdf as response
      const signatureList = foundSignatureLists.Items[0]; // we definitely only have one value (per user/day)

      try {
        // update list entry to increment the download count
        await incrementDownloads(signatureList.id, signatureList.downloads);

        // after the signature list was successfully updated we return it (id and url to pdf)
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
      // if there was no signature list with the user as "owner" found
      // we are going to create a new one

      // because the id is quite small we need to check if the newly created one already exists (unlikely)
      let idExists = true;
      let pdfId;

      while (idExists) {
        pdfId = generateRandomId(7);
        idExists = await checkIfIdExists(pdfId);
      }

      try {
        // we are going to generate the pdf
        const qrCodeUrl = qrCodeUrls[campaign.state]
          ? qrCodeUrls[campaign.state]
          : qrCodeUrls.default;

        const generatedPdfCombined = await generatePdf(
          qrCodeUrl,
          pdfId,
          'COMBINED',
          campaign.code
        );

        // upload pdf to s3 after generation was successful
        const uploadResult = await uploadPDF(pdfId, generatedPdfCombined);

        const url = uploadResult.Location;

        try {
          // if the upload process was successful, we create the list entry in the db
          // userId might be 'anonymous'
          const promises = [
            createSignatureList(
              pdfId,
              timestamp,
              url,
              campaign,
              false,
              false,
              userId
            ),
          ];

          // Also create a promise to update the user record to save the signature campaign
          if (userId !== 'anonymous') {
            promises.push(updateUser(userId, campaign));
          }

          // Do (maybe) both promises async to increase performance
          await Promise.all(promises);

          try {
            // if the download was not anonymous send a mail with the attached pdf
            // we only want to this if the endpoint was not triggered by an admin
            if (userId !== 'anonymous' && !requestBody.triggeredByAdmin) {
              const attachments = await generateAttachments(
                mailAttachments[campaign.code],
                qrCodeUrl,
                pdfId,
                campaign.code
              );

              await sendMail(email, username, attachments, campaign);
            }

            return {
              statusCode: 201,
              headers: responseHeaders,
              body: JSON.stringify({
                signatureList: { id: pdfId, url },
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
        console.log('Error while generating or uploading PDF', error);
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

// function to check, if there already is a signature list for this specific day (owned by user or anonymous)
const getSignatureList = async (userId, timestamp, campaignCode) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression:
      'createdAt = :timestamp AND campaign.code = :campaignCode AND attribute_not_exists(fakeScannedByUser)',
    IndexName: 'userIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':timestamp': timestamp,
      ':campaignCode': campaignCode,
    },
  };

  return ddb.query(params).promise();
};

// updates entry in signature lists db to increment the download (the current download count is passed)
const incrementDownloads = (id, downloads) => {
  downloads++;
  const params = {
    TableName: signaturesTableName,
    Key: { id },
    UpdateExpression: 'SET downloads = :downloads',
    ExpressionAttributeValues: { ':downloads': downloads },
  };
  return ddb.update(params).promise();
};

// uploads pdf to s3 bucket
const uploadPDF = (id, pdf) => {
  return s3
    .upload({
      Bucket: bucket,
      ACL: 'public-read',
      Key: `${id}.pdf`,
      Body: Buffer.from(pdf),
      ContentType: 'application/pdf',
    })
    .promise();
};

const updateUser = (userId, campaign) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'SET signatureCampaigns = list_append(if_not_exists(signatureCampaigns, :emptyList), :campaign), updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':campaign': [campaign],
      ':emptyList': [],
      ':updatedAt': timestamp,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

module.exports = {
  uploadPDF,
  handler,
};
