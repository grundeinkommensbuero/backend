const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;

exports.handler = async event => {
  //extract the cognito id from the request (userName is userId)
  console.log('event', event);
  const userId = event.userName;
  try {
    const result = await getUser(userId);
    console.log('result', result);
    if ('Item' in result) {
      //if the newsletter consent is true, we opt in in pinpoint
      if (result.Item.newsletterConsent) {
        try {
          const updatedPinpoint = await updatePinpoint(result.Item);
          console.log('success updating pinpoint', updatedPinpoint);
        } catch (error) {
          console.log('error updating pinpoint', error);
        }
      }
    } else {
      console.log('No user found');
    }
  } catch (error) {
    console.log('error while getting user', error);
  }
  return event;
};

const getUser = userId => {
  return ddb
    .get({
      TableName: tableName,
      Key: {
        cognitoId: userId,
      },
    })
    .promise();
};

const updatePinpoint = user => {
  const params = {
    ApplicationId: projectId,
    EndpointId: `email-endpoint-${user.cognitoId}`,
    EndpointRequest: {
      ChannelType: 'EMAIL',
      Address: user.email,
      OptOut: 'NONE',
    },
  };
  return pinpoint.updateEndpoint(params).promise();
};
