const AWS = require('aws-sdk');
const { getUsersWithSurvey } = require('../../shared/users/getUsers');
const { PROD_USERS_TABLE_NAME } = require('../../config');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const changeSurveyAnswers = async tableName => {
  try {
    const users = await getUsersWithSurvey(tableName);

    for (const user of users) {
      const surveys = user.surveys;

      let shouldUpdate = false;

      for (const survey of surveys) {
        if (
          survey.answer === 'aboutToSend' ||
          survey.answer === 'aboutToSend-D'
        ) {
          survey.answer = 'alreadySigned';
          shouldUpdate = true;
        } else if (survey.answer === 'notPrinted-A1') {
          survey.answer = 'notPrinted';
          shouldUpdate = true;
        } else if (survey.answer === 'collecting-C') {
          survey.answer = 'collecting';
          shouldUpdate = true;
        } else if (survey.answer === 'alreadySent-E') {
          survey.answer = 'alreadySent';
          shouldUpdate = true;
        }
      }

      // Save updated surveys array
      if (shouldUpdate) {
        await saveSurveys(tableName, user.cognitoId, surveys);
        console.log('Updated', user.cognitoId);
      }
    }
  } catch (error) {
    console.log('Error', error);
  }
};

const saveSurveys = (tableName, userId, surveys) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET surveys = :surveys',
    ExpressionAttributeValues: { ':surveys': surveys },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

changeSurveyAnswers(PROD_USERS_TABLE_NAME);
