const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;
const zipCodeMatcher = require('./zipCodeMatcher');

exports.handler = async event => {
  try {
    const users = await getAllUsers();
    let count = 0;
    for (let user of users.Items) {
      const {
        cognitoId: userId, //rename cognitoId to userId while destructuring
        createdAt,
        email,
        zipCode,
        username,
        referral,
      } = user;
      let { newsletterConsent } = user;
      const pledge = user['pledge-schleswig-holstein-1'];

      const pledgeAttributes = [];
      if (typeof pledge !== 'undefined' && pledge !== null) {
        if (pledge.wouldPrintAndSendSignatureLists) {
          pledgeAttributes.push('wouldPrintAndSendSignatureLists');
        }
        if (pledge.wouldCollectSignaturesInPublicSpaces) {
          pledgeAttributes.push('wouldCollectSignaturesInPublicSpaces');
        }
        if (pledge.wouldPutAndCollectSignatureLists) {
          pledgeAttributes.push('wouldPutAndCollectSignatureLists');
        }
        if (pledge.wouldDonate) {
          pledgeAttributes.push('wouldDonate');
        }
        if (
          'wouldEngageCustom' in pledge &&
          pledge.wouldEngageCustom !== 'empty' &&
          pledge.wouldEngageCustom.length < 50
        ) {
          pledgeAttributes.push(pledge.wouldEngageCustom);
        }
      }

      // Make use of utility function to match the state to a given zip code
      let region = 'undefined';
      if (typeof zipCode !== 'undefined') {
        region = zipCodeMatcher.getStateByZipCode(zipCode);
      }
      console.log('matched region', region);
      //workaround, while some newsletter consents may already have the new format {value, timestamp}
      //old format is just boolean
      if (typeof newsletterConsent !== 'undefined') {
        newsletterConsent =
          typeof newsletterConsent === 'boolean'
            ? newsletterConsent
            : newsletterConsent.value;
      } else {
        newsletterConsent = false;
      }

      const params = {
        ApplicationId: projectId,
        EndpointId: `email-endpoint-${userId}`,
        EndpointRequest: {
          ChannelType: 'EMAIL',
          Address: email,
          Attributes: {
            Referral: [referral],
            Region: [region],
            Pledge: pledgeAttributes,
            PostalCode: [zipCode],
          },
          EffectiveDate: createdAt,
          Location: {
            PostalCode: zipCode,
            Region: region,
          },
          Metrics: {
            SignatureCount: parseInt(pledge.signatureCount),
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
        count++;
      } catch (error) {
        console.log(error);
        break;
      }
    }
    console.log('updated count', count);
  } catch (error) {
    console.log('error', error);
  }
};

const getAllUsers = () => {
  const params = {
    TableName: tableName,
  };
  return ddb.scan(params).promise();
};
