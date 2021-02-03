const AWS = require('aws-sdk');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const ddb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const tableName = process.env.USERS_TABLE_NAME;
const userPoolId = process.env.USER_POOL_ID;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(401, 'No permission to delete other user');
    }

    try {
      // check if there is a user with the passed user id
      const { userId } = event.pathParameters;
      const result = await getUser(userId);

      // if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      // Delete user in dynamo and cognito
      await Promise.all([
        deleteUserInDynamo(userId),
        deleteUserInCognito(userId),
      ]);

      // updating user was successful, return appropriate json
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Error deleting user', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

const deleteUserInCognito = userId => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
  };

  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = userId => {
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: userId,
    },
  };

  return ddb.delete(params).promise();
};
