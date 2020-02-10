const { INVOKE_URL, USER_POOL_ID, CLIENT_ID } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';
const refreshToken =
  'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.rfIWtg8T3LNiy3M8EASJtv1wKanuIqvaYn2Bf1oDWBFmOEN-rhP9YOoE0VRjtS-DIeWY8ZO8BKHPeCir2DwO3PFO6E-kF1ry7DNwJj70_cqdeWAG8RJ18Nuu4OhnhtXFmZcyXGo4rGBGQQPDKHrYmJ6ghjdSljR2fYb8B6yI41xX3u59qT9w0uPpmfQLCLad27FEayLoflSPn0-Gg3sILo9Y38nqtCnHbbFj5hDz2j1lWi-aQpzoAD55I2B5K0lr4KyzalE69nVnsM-2jxiYRJ9Kacc2hsA65IXcuUwml7zqVqvixxfs-m4vfOh5H5pifO5dBhooTAWDt3QpWUf6Eg.plITzzIx46-Iaysj.tJ7VmSH4JaufqgkLxnghXVkBkw1yqwV2CCGeQwNyM5tQOg7cq2GTFeAVUWgsexXO_GsZkKxZDi-EqnyBjGRxZkG_06H0gkkOrKCuJivVxF0bhbBgwX3rdit_dcfeo1ksOia1OT7YFPuaVuB7NJ_CqYzDmBD3iJWVCAGp19EO9AT7ef_F6VQHP6oTBUnbRG-IYvh-fZqjVG7PKpQad-NxsiMBUAfF0XBfWnl-7HgXKr9_6aOk54Qe9RxmSfzppHYHHG6QHJJuZ0zN8xCF3QbUc7Z2EbLwYgMFk6uJGcT1_s0Rjt1aOMiZFkU5aHLHwCdT-6GmzDueBv1Aq7tXwWlZGS4TGNAEk_rRhK9t6rqPQ3uDsUwL9DYG790CGytDcj9pRPA0H55U8_wXHkk0RIZRe0nY4wTFhXqQXNlSlMSuJ7HJs3LzwNwGj75y5Ig3moiND87_vmeDno2VEloCBympg2pxPh4bDSroThI9bjOF-4CJVH8iI3P_PiRKO_AwuCHWzgZFDpejbHeXO8fjS5eAdBOv17ahOICM567t5bx__ML1Fsei3oH6Gq5K3QzDpE01vj_lpn5Y2kNeRSJ_LxuxDSX2k8sdvO9AUjIRw9P5St9h4CALXJWEI9uaGMwyWY7mvdXJvo_Ao6HtTLuZwHEmfXYaKtY6saF_c4OsmRiga3XZa5-ld5t8O_lLSWsYs7VmvkuthvSk2xdQeIrCqlGkxxBsW2T3Z7Fv7oK6Nk8SeCbDFf8xjJTZITbr1VjkOkF-hyauiwoPv2c3ORvbuaoVR0aGms_cFWd2BApeGgh64wHYR2EDLWQWJ6AiP7A76ubyEeaJHOOMI1mMeJ7Q7qZxDqqgZmmYueTTMsyeoPbBftHAj8bQ6q-Px_jOaUlzdV4CXRuMsm5-aQtzLURPxJu-um8S1eMWKuh-dYfqHCNWFSmSN4PSP9hqYEGtZQGTkaoiXLHNp3NJdYSneWo25GJFOIhg6QkdR0DKRyC6tg3_siyew7FAgehPvDqWv6P8bntHYNG-_55oeKuuZ1gpONXp6Zxy1qf8AB1muRR5tenltQFjdsqqTr7u8ZUFKugg1-4qHnYCK7R4IlsWhktV9qvVq0Aibu0WBtqwgseRPQBc1lIb2JtpasDWTniEbcccmw7Lcl0gufh2or-4b7UChaX22OazNZ8s97XmJcQN_ZsOe9l9gaQWCAZ2lKer6hq0m-nQeBKh4YXQXgBHAjHUUAMMTnhaoEL_9ZjW6SyPMORPJxCFVwL_5BJTvkqbp1YdgvPPZ52KFVSk8ohwfY2m-oWwaomXdgHaBzPN9izCFvbB-GDK1y3Ol1RoUU7C2jcH5SNGRvoF.GmICEdUDB4m40-tIFPZkSQ';
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

describe('updatePledge api test', () => {
  it('should be able to update user', async () => {
    const token = await authenticate();

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update user without newsletter consent', async () => {
    const token = await authenticate();

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({}),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to change other user', async () => {
    const token = await authenticate();

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },

      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${otherUserId}`, request);

    expect(response.status).toEqual(401);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});

const authenticate = async () => {
  const { AuthenticationResult } = await cognito
    .adminInitiateAuth({
      AuthFlow: 'REFRESH_TOKEN',
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    })
    .promise();

  return AuthenticationResult.IdToken;
};
