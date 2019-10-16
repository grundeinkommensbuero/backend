const randomBytes = require("crypto").randomBytes;

const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async event => {
  const tableName = process.env.TABLE_NAME;

  try {
    const requestBody = JSON.parse(event.body);

    //check if there is a user with the passed user id
    try {
      const date = new Date();
      const timestamp = date.toISOString();
      console.log("request body", requestBody);
      if (!validateParams(requestBody)) {
        return errorResponse(400, "One or more parameters are missing", null);
      }

      const userId = requestBody.userId;
      const user = await getUser(tableName, requestBody.userId);
      console.log("user", user);
      //if user does not have Item as property, there was no user found
      if (user.Item === undefined) {
        return errorResponse(
          400,
          "No user found with the passed user id",
          null
        );
      }

      try {
        await savePledge(tableName, userId, timestamp, requestBody);
        //saving pledge was successfull, return appropriate json
        return {
          statusCode: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
          },
          isBase64Encoded: false
        };
      } catch (error) {
        console.log(error);
        return errorResponse(500, "Error saving pledge", error);
      }
    } catch (error) {
      console.log(error);
      return errorResponse(
        500,
        "Error while getting user from users table",
        error
      );
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, "JSON Parsing was not successful", error);
  }
};

const savePledge = (tableName, userId, timestamp, requestBody) => {
  const data = {
    ":signatureCount": requestBody.signatureCount,
    ":wouldVisitLocalGroup": requestBody.wouldVisitLocalGroup,
    ":wouldDonate": requestBody.wouldDonate,
    ":zipCode":
      requestBody.zipCode !== undefined ? requestBody.zipCode : "empty",
    ":eligibleToVote":
      requestBody.eligibleToVote !== undefined
        ? requestBody.eligibleToVote
        : "empty",
    ":createdAt": timestamp,
    ":username": requestBody.name !== undefined ? requestBody.name : "empty",
    ":wouldEngageCustom":
      requestBody.wouldEngageCustom !== undefined
        ? requestBody.wouldEngageCustom
        : "empty",
    ":referral":
      requestBody.referral !== undefined ? requestBody.referral : "empty"
  };

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: userId },
      UpdateExpression: `set pledge.signatureCount = :signatureCount, 
      pledge.wouldVisitLocalGroup = :wouldVisitLocalGroup, 
      pledge.wouldDonate = :wouldDonate,
      pledge.wouldEngageCustom = :wouldEngageCustom,
      zipCode = :zipCode,
      eligibleToVote = :eligibleToVote,
      username = :username,
      pledge.createdAt = :createdAt,
      referral = :referral`,
      ExpressionAttributeValues: data,
      ReturnValues: "UPDATED_NEW"
    })
    .promise();
};

const toUrlString = buffer => {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

const validateParams = requestBody => {
  return (
    requestBody.userId !== undefined &&
    requestBody.signatureCount !== undefined &&
    requestBody.wouldDonate !== undefined &&
    requestBody.wouldVisitLocalGroup !== undefined
  );
};

const getUser = (tableName, userId) => {
  return ddb
    .get({
      TableName: tableName,
      Key: {
        cognitoId: userId
      }
    })
    .promise();
};

const errorResponse = (statusCode, message, error) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error
    });
  } else {
    body = JSON.stringify({
      message: message
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    isBase64Encoded: false
  };
};
