const CONFIG = require('../../config');
const { getUsersWithSurvey } = require('../../shared/users/getUsers');

const tableName = CONFIG.PROD_USERS_TABLE_NAME;

const getSurveyResults = async () => {
  const users = await getUsersWithSurvey(tableName);

  const surveyResults = {};
  for (const user of users) {
    for (const survey of user.surveys) {
      if (!(survey.code in surveyResults)) {
        surveyResults[survey.code] = {};
      }

      if (!(survey.answer in surveyResults[survey.code])) {
        surveyResults[survey.code][survey.answer] = 0;
      }

      surveyResults[survey.code][survey.answer]++;
    }
  }

  console.log(surveyResults);
};

getSurveyResults();
