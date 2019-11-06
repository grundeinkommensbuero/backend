console.log('Loading function');
const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = 'b3f64d0245774296b5937e97b9bfc8c3';
const zipCodeMatcher = require('./zipCodeMatcher');

exports.handler = async (event, context) => {
  //console.log('Received event:', JSON.stringify(event, null, 2));

  for (let record of event.Records) {
    if (record.eventName !== 'REMOVE') {
      //get id of the changed user
      console.log('Record: %j', record);
      //only update pinpoint, if the pledge changes
      const newData = record.dynamodb.NewImage;
      let pledgeData;
      if ('pledge' in newData) {
        pledgeData = newData.pledge.M;
      } else if ('pledge-brandenburg-1' in newData) {
        pledgeData = newData['pledge-brandenburg-1'].M;
      } else if ('pledge-schleswig-holstein-1' in newData) {
        pledgeData = newData['pledge-schleswig-holstein-1'].M;
      }

      if (typeof pledgeData !== 'undefined' && pledgeData !== null) {
        const newsletterConsent = newData.newsletterConsent.M.value.BOOL;
        const userId = newData.cognitoId.S;
        const createdAt = newData.createdAt.S;
        const email = newData.email.S;
        const zipCode = newData.zipCode.S;
        const username = newData.username.S;
        const referral = newData.referral.S;
        /* not needed for slimmer pledge
        
        const pledgeAttributes = [];
        if (pledgeData.wouldPrintAndSendSignatureLists.BOOL) {
          pledgeAttributes.push('wouldPrintAndSendSignatureLists');
        }
        if (pledgeData.wouldCollectSignaturesInPublicSpaces.BOOL) {
          pledgeAttributes.push('wouldCollectSignaturesInPublicSpaces');
        }
        if (pledgeData.wouldPutAndCollectSignatureLists.BOOL) {
          pledgeAttributes.push('wouldPutAndCollectSignatureLists');
        }
        if (pledgeData.wouldDonate.BOOL) {
          pledgeAttributes.push('wouldDonate');
        }
        if (pledgeData.wouldEngageCustom.S !== 'empty') {
          pledgeAttributes.push(pledgeData.wouldEngageCustom.S);
        }
        */

        // Make use of utility function to match the state to a given zip code
        const region = zipCodeMatcher.getStateByZipCode(zipCode);
        console.log('matched region', region);

        const params = {
          ApplicationId: projectId,
          EndpointId: `email-endpoint-${userId}`,
          EndpointRequest: {
            ChannelType: 'EMAIL',
            Address: email,
            Attributes: {
              Referral: [referral],
              Region: [region],
              PostalCode: [zipCode],
              //Pledge: pledgeAttributes,
            },
            EffectiveDate: createdAt,
            Location: {
              PostalCode: zipCode,
              Region: region,
            },
            Metrics: {
              SignatureCount: parseInt(pledgeData.signatureCount.N),
            },
            OptOut: newsletterConsent ? 'NONE' : 'ALL',
            User: {
              UserId: userId,
              UserAttributes: {
                Username: [username],
              },
            },
          },
        };
        console.log('trying to update the endpoint with params:', params);
        try {
          const result = await pinpoint.updateEndpoint(params).promise();
          console.log('updated pinpoint', result);
        } catch (error) {
          console.log(error);
        }
      }
    } else {
      //record was removed
      //which is why we want to remove the endpoint as well
      console.log('record was removed', record);
      const userId = record.dynamodb.Keys.cognitoId.S;

      var params = {
        ApplicationId: projectId,
        EndpointId: `email-endpoint-${userId}`,
      };
      try {
        const result = await pinpoint.deleteEndpoint(params);
        console.log('success deleting endpoint', result);
      } catch (error) {
        console.log('error deleting endpoint', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
