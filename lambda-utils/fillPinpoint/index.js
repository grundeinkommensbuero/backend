const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const projectId = 'b3f64d0245774296b5937e97b9bfc8c3';
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;

exports.handler = async event => {
  try {
    const users = await getAllUsers();

    for (let user of users.Items) {
      const {
        pledge,
        newsletterConsent,
        cognitoId: userId, //rename cognitoId to userId while destructuring
        createdAt,
        email,
        zipCode,
        username,
        referral,
      } = user;

      const pledgeAttributes = [];
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
        pledge.wouldEngageCustom !== undefined &&
        pledge.wouldEngageCustom !== 'empty'
      ) {
        pledgeAttributes.push(pledge.wouldEngageCustom);
      }

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
      } catch (error) {
        console.log(error);
      }
    }
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
