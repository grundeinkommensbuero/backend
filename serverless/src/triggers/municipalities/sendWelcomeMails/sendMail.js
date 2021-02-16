const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE_1A = 'TODO'; // Does not want to be active + municipality has not reached goal
const TEMPLATE_1B = 'TODO'; // Wants to be active + municipality has not reached goal
const TEMPLATE_1C = 'TODO'; // Wants to be active + municipality has reached goal

const sendMail = ({ username, email }, reachedGoal, wantsToBeActive) => {
  let template;

  if (!wantsToBeActive && !reachedGoal) {
    template = TEMPLATE_1A;
  } else if (wantsToBeActive && !reachedGoal) {
    template = TEMPLATE_1B;
  } else if (wantsToBeActive && reachedGoal) {
    template = TEMPLATE_1C;
  } else {
    // TODO: 1A and another case (not active, reached goal) might be merged into one
  }

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: template,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
        },
      },
    ],
  });
};

module.exports = sendMail;
