const AWS = require('aws-sdk');
const generatePdf = require('./createPDF');
const sendMail = require('./sendMail');
const fs = require('fs');
const { getUser, getUserByMail } = require('../../../shared/users');
const { checkIfIdExists } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const {
  constructCampaignId,
  generateRandomId,
} = require('../../../shared/utils');

const config = { region: 'eu-central-1' };
const s3 = new AWS.S3(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const signaturesTableName =
  process.env.SIGNATURES_TABLE_NAME || 'prod-signatures';
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const qrCodeUrls = {
  'schleswig-holstein': 'https://xbge.de/qr/sh/?listId=',
  brandenburg: 'https://xbge.de/qr/bb/?listId=',
  hamburg: 'https://xbge.de/qr/hh/?listId=',
  bremen: 'https://xbge.de/qr/hb/?listId=',
  berlin: 'https://xbge.de/qr/b/?listId=',
  default: 'https://xbge.de/qr/default/?listId=',
};

const MAIL_ATTACHMENTS = {
  'hamburg-1': [
    {
      filename: 'Tipps_zum_Unterschriftensammeln.pdf',
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/TIPPS.pdf'),
    },
    {
      filename: 'Liste_schwarz-weiss.pdf',
      type: 'SINGLE_SW',
    },
    {
      filename: 'Liste_Farbig.pdf',
      type: 'SINGLE',
    },
    {
      filename: 'Newsletter.pdf',
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/NEWSLETTER.pdf'),
    },
    {
      filename: 'Gesetzestext.pdf',
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/GESETZ.pdf'),
    },
  ],
  'brandenburg-1': [
    {
      filename: 'Tipps_zum_Unterschriftensammeln.pdf',
      file: fs.readFileSync(__dirname + '/pdf/brandenburg-1/TIPPS.pdf'),
    },
    {
      filename: 'Liste.pdf',
      type: 'MULTI',
    },
  ],
  'schleswig-holstein-1': [
    {
      filename: 'Tipps_zum_Unterschriftensammeln.pdf',
      file: fs.readFileSync(__dirname + '/pdf/sh-1/TIPPS.pdf'),
    },
    {
      filename: 'Liste_1er_SW.pdf',
      type: 'SINGLE_SW',
    },
    {
      filename: 'Liste_5er_SW.pdf',
      type: 'MULTI_SW',
    },
    {
      filename: 'Liste_1er_Farbe.pdf',
      type: 'SINGLE',
    },
    {
      filename: 'Liste_5er_Farbe.pdf',
      type: 'MULTI',
    },
  ],
};

/*  Model for signature lists in db

  id: string (of 7 digits)
  userId: string or email:string
  createdAt: timestamp (YYYY-MM-DD)
  campaign: object
  downloads: number
  pdfUrl: string

*/

const handler = async event => {
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
        const result = await getUser(userId);
        console.log('user after getting user', user);

        //if user does not have Item as property, there was no user found
        if (!('Item' in result) || typeof result.Item === 'undefined') {
          return errorResponse(400, 'No user found with the passed user id');
        }

        // If user does not have newsletter consent we want to return 401
        if (
          !('newsletterConsent' in result.Item) ||
          !result.Item.newsletterConsent.value
        ) {
          return errorResponse(401, 'User does not have newsletter consent');
        }

        email = result.Item.email;
      } catch (error) {
        console.log('error', error);
        return errorResponse(500, 'Error while getting user', error);
      }
    } else if ('email' in requestBody) {
      email = requestBody.email;
      //in case the api only got the email instead of the id we need to get the user id from the db
      try {
        const result = await getUserByMail(email);
        console.log('result after getting user by mail', result);

        if (result.Count === 0) {
          console.log('error', 'no user found', result);
          return errorResponse(400, 'No user found with the passed email');
        }

        // If user does not have newsletter consent we want to return 401
        if (
          !('newsletterConsent' in result.Items[0]) ||
          !result.Items[0].newsletterConsent.value
        ) {
          return errorResponse(401, 'User does not have newsletter consent');
        }

        userId = result.Items[0].cognitoId;
      } catch (error) {
        console.log('error', error);
        return errorResponse(500, 'Error while getting user by email', error);
      }
    } else {
      userId = 'anonymous';
    }

    //in does not matter, if the user is anonymous or not...
    //now we check, if there already is an entry for the list for this day
    const foundSignatureLists = await getSignatureList(
      userId,
      timestamp,
      campaign.code
    );

    if (
      foundSignatureLists.Count !== 0 &&
      !foundSignatureLists.Items[0].manually
    ) {
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

        const qrCodeUrl = qrCodeUrls[campaign.state]
          ? qrCodeUrls[campaign.state]
          : qrCodeUrls.default;
        const generatedPdfCombined = await generatePdf(
          qrCodeUrl,
          pdfId,
          'COMBINED',
          requestBody.campaignCode
        );

        console.log(
          'generating pdf takes',
          new Date().getTime() - currentMillis
        );

        //upload pdf to s3 after generation was successful
        const uploadResult = await uploadPDF(pdfId, generatedPdfCombined);
        console.log('success uploading pdf to bucket', uploadResult);
        const url = uploadResult.Location;

        try {
          //if the upload process was successful, we create the list entry in the db
          //userId might be 'anonymous'
          const promises = [
            createSignatureList(pdfId, timestamp, url, campaign, false, userId),
          ];

          // Also create a promise to update the user record to save the signature campaign
          if (userId !== 'anonymous') {
            promises.push(updateUser(userId, campaign));
          }

          // Do (maybe) both promises async to increase performance
          await Promise.all(promises);

          try {
            //if the download was not anonymous send a mail with the attached pdf
            if (userId !== 'anonymous') {
              const attachments = await generateAttachments(
                MAIL_ATTACHMENTS[requestBody.campaignCode],
                qrCodeUrl,
                pdfId,
                requestBody.campaignCode
              );

              await sendMail(email, attachments, campaign);
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

//function to check, if there already is a signature list for this specific day (owned by user or anonymous)
const getSignatureList = async (
  userId,
  timestamp,
  campaignCode,
  startKey = null
) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression:
      'userId = :userId AND createdAt = :timestamp AND campaign.code = :campaignCode AND attribute_not_exists(fakeScannedByUser)',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':timestamp': timestamp,
      ':campaignCode': campaignCode,
    },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //call same function again, if there is no user found, but not
  //the whole db has been scanned
  if (result.Count === 0 && 'LastEvaluatedKey' in result) {
    return getSignatureList(
      userId,
      timestamp,
      campaignCode,
      result.LastEvaluatedKey
    );
  } else {
    return result;
  }
};

//function to create new signature list, userId can be null (anonymous list)
const createSignatureList = (
  id,
  timestamp,
  url,
  campaign,
  manually,
  userId = null
) => {
  const params = {
    TableName: signaturesTableName,
    Item: {
      id: id,
      pdfUrl: url,
      downloads: 1,
      campaign: campaign,
      createdAt: timestamp,
      manually: manually,
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

const getAttachment = async (attachment, qrCodeUrl, pdfId, campaignCode) => {
  let file = attachment.file;

  if (!file) {
    file = await generatePdf(qrCodeUrl, pdfId, attachment.type, campaignCode);
  }

  return Promise.resolve({
    filename: attachment.filename,
    content: Buffer.from(file, 'base64'),
    contentType: 'application/pdf',
  });
};

const generateAttachments = (attachments, qrCodeUrl, pdfId, campaignCode) => {
  return Promise.all(
    attachments.map(attachment =>
      getAttachment(attachment, qrCodeUrl, pdfId, campaignCode)
    )
  );
};

const updateUser = (userId, campaign) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'signatureCampaigns = list_append(if_not_exists(signatureCampaigns, :emptyList), :campaign), updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':campaign': campaign,
      ':emptyList': [],
      ':updatedAt': timestamp,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

module.exports = {
  createSignatureList,
  uploadPDF,
  handler,
};
