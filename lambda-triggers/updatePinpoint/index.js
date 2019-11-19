console.log('Loading function');
const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const zipCodeMatcher = require('./zipCodeMatcher');

exports.handler = async (event, context) => {
  //console.log('Received event:', JSON.stringify(event, null, 2));

  for (let record of event.Records) {
    if (record.eventName !== 'REMOVE') {
      //get id of the changed user
      console.log('Record: %j', record);
      //only update pinpoint, if the pledge changes
      const newData = record.dynamodb.NewImage;

      const userId = newData.cognitoId.S;
      const createdAt = newData.createdAt.S;
      const email = newData.email.S;
      let zipCode;
      let region;
      //zipCode might have been saved as number or string (TODO: need to check why)
      if ('zipCode' in newData) {
        if ('N' in newData.zipCode) {
          zipCode = parseInt(newData.zipCode.N);
        } else {
          zipCode = newData.zipCode.S;
        }
        // Make use of utility function to match the state to a given zip code
        region = zipCodeMatcher.getStateByZipCode(zipCode);
        console.log('matched region', region);
      } else {
        zipCode = 'undefined';
        region = 'undefined';
      }
      const username = 'username' in newData ? newData.username.S : 'empty';
      const referral = 'referral' in newData ? newData.referral.S : 'empty';

      //if the record was created within the last x minutes, we set the newsletter consent
      //to false anyway, because we need to wait for the verification
      let newsletterConsent;
      //we have to bring the two dates into the same format (UNIX time)
      const date = new Date().valueOf();
      const createdAtDate = Date.parse(createdAt);
      const fiveMinutes = 5 * 60 * 1000;
      if (date - createdAtDate < fiveMinutes) {
        newsletterConsent = false;
      } else {
        //make it depending on the newsletter consent value
        newsletterConsent =
          'newsletterConsent' in newData
            ? newData.newsletterConsent.M.value.BOOL
            : false;
      }

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
          Metrics: {},
          OptOut: newsletterConsent ? 'NONE' : 'ALL',
          User: {
            UserId: userId,
            UserAttributes: {
              Username: [username],
            },
          },
        },
      };

      //go through the list of pledges and construct attributes for each campaign
      let pledges;
      if ('pledges' in newData) {
        pledges = newData.pledges.L;
        for (let pledge of pledges) {
          let campaignCode = pledge.M.campaign.M.code.S;
          //for now we just need the signature count
          //TODO maybe refactor in the future
          if ('signatureCount' in pledge.M) {
            params.EndpointRequest.Metrics[`SignatureCount-${campaignCode}`] =
              pledge.M.signatureCount.N;
          }
        }
      }
      console.log('trying to update the endpoint with params:', params);
      try {
        const result = await pinpoint.updateEndpoint(params).promise();
        console.log('updated pinpoint', result);
      } catch (error) {
        console.log(error);
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
        const result = await pinpoint.deleteEndpoint(params).promise();
        console.log('success deleting endpoint', result);
      } catch (error) {
        console.log('error deleting endpoint', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
