const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.usersTableName;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  //get user id from path parameter
  const userId = event.pathParameters.userId;
  try {
    const user = await getUser(userId);
    console.log('user', user);
    //if user does not have Item as property, there was no user found
    if (!('Item' in user) || typeof user.Item === 'undefined') {
      return errorResponse(400, 'No user found with the passed user id');
    }

    // return user
    return {
      statusCode: 200,
      body: JSON.stringify({
        user: { email: user.Item.email, cognitoId: user.Item.cognitoId },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    return errorResponse(500, 'Error while getting user from table', error);
  }
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

const errorResponse = (statusCode, message, error = null) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error,
    });
  } else {
    body = JSON.stringify({
      message: message,
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: responseHeaders,
    isBase64Encoded: false,
  };
};
