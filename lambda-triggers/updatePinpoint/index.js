console.log('Loading function');
const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = 'b3f64d0245774296b5937e97b9bfc8c3';

exports.handler = async (event, context) => {
  //console.log('Received event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName !== 'REMOVE') {
      //get id of the changed user
      console.log('Record: %j', record);
      //only update pinpoint, if the pledge changes
      const newData = record.dynamodb.NewImage;
      const pledgeData = newData.pledge.M;
      if (Object.keys(pledgeData).length !== 0) {
        const newsletterConsent = newData.newsletterConsent.BOOL;
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
        let region;
        if (
          zipCode.startsWith('25') ||
          zipCode.startsWith('24') ||
          zipCode.startsWith('23') ||
          zipCode.startsWith('22') ||
          zipCode.startsWith('21')
        ) {
          region = 'Schleswig-Holstein';
        } else {
          region = 'Nicht SH';
        }

        const params = {
          ApplicationId: projectId,
          EndpointId: `email-endpoint-${userId}`,
          EndpointRequest: {
            ChannelType: 'EMAIL',
            Address: email,
            Attributes: {
              Referral: [referral],
              //Pledge: pledgeAttributes,
            },
            EffectiveDate: createdAt,
            Location: {
              PostalCode: zipCode,
              Region: region,
            },
            Metrics: {
              SignatureCount: pledgeData.signatureCount.N,
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
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
