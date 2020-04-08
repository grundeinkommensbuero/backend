console.log('Loading function');
const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = '83c543b1094c4a91bf31731cd3f2f005';

module.exports.handler = async (event, context) => {
  //console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Only run the script if the environment is prod
    if (process.env.STAGE === 'prod') {
      for (let record of event.Records) {
        const userId = record.dynamodb.Keys.cognitoId.S;

        var params = {
          ApplicationId: projectId,
          EndpointId: `email-endpoint-${userId}`,
        };

        if (record.eventName === 'REMOVE') {
          //record was removed
          //which is why we want to remove the endpoint as well
          console.log('record was removed', record);
          try {
            const result = await pinpoint.deleteEndpoint(params).promise();
            console.log('success deleting endpoint', result);
          } catch (error) {
            console.log('error deleting endpoint', error);
          }
        } else if (record.eventName === 'MODIFY') {
          // Record was updated, newsletter consent might have been changed
          const newsletterConsent =
            record.dynamodb.NewImage.newsletterConsent.M.value.BOOL;

          if (!newsletterConsent) {
            try {
              params.EndpointRequest = {
                ChannelType: 'EMAIL',
                OptOut: 'ALL',
              };

              const result = await pinpoint.updateEndpoint(params).promise();
              console.log('success updating endpoint', result);
            } catch (error) {
              console.log('error updating endpoint', error);
            }
          }
        }
      }
      return `Successfully processed ${event.Records.length} records.`;
    }
  } catch (error) {
    console.log('error while updating pinpoint', error);
  }

  return;
};
