const { INVOKE_URL, USER_POOL_ID, CLIENT_ID } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';
const refreshToken =
  'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.I5TH6IjC2pxfO3H5QB4jYbQxHH_FMbQPhSnU1IRsSfrMprlyDX9bf52JJuSmBTYwGThSCRgF3LMkI4y0yN7TRMFBf_yIXWLQMLa7KOLj21xG4NH3lxuCcmn27tK44Qtjw89d06Q9uwrJiaG3IObrndfkuyL0MSiJshfCD_rq0PnqH-xPAs21TjSht6Pip2-Lcz87FvY6vzm9GIgWIMdzofdc5vWz7ZAK_RSxKEzs2ATODPS43_oMsq8awjm0Uia6u1YH-zOGTr03ogTHIaYoA1WRu-phq2HFjLvAiXBOumgKbKRANymzk-gkWe3sBdlOl-DhY4_yMHpgtoYkaE1DLg.PiL09Gh-p5EYLB-l.EEwbdRJ3DnpkWuYI17lqyKFJFLpQTqpa1rNKQnqV7-DZg-wsgyDHjvhF3zdJhhm3ml4NCisqzIcxTqclt9Qx5--bgOCRS5vaRNZcjFycMd754AEocDEXL_OotdCup1tk9lDL6XpfEbvB6yPdylTACVfayPWiR7Lyzhe0E8hW1bMfcghetWBZc-PU-g_YeBeIyi82p35YOdKPaJS8Cf132XLni45SFDu1b0lYmPWbVaFH95r9NtvD9VjmRInPwDa2mUXY1GQ_OktVKAbDpD-WfqME9NU7SK13fD36RifGVNAZkNVUUn0sORg8AlZeAYrE_XM3nbr5Qc-oXJ0xXw8DkFhf7C9drMvgOOburcsUz79pxFB-A8hMwwk4UvgZECrVQVAzoZ8cW2L7ufgO6uFR0aL8d28FXsBzcgeD2qGwpUOx2OrlPtSwEm3yIgo3tNzv-szzznJivD7IyGj85caZRomJYR6-eeTXQ-7McAnvPilewmSiTrcFmy3hlGe1s53WFu2-3wt5JP4Ml8gA6le_BRagT6uYG28-kYmcR97U7scyJjoMRtBZuJtB1zNRAjJeP5QRbVnGPN03uSn1h-JSS_AAKYAl6xMHOFuaRChxnKielsLQTGblCy5IHyg0uYb7tLia_aZvjV37sDNrahFbB1XQnK9fhiD_rilk8OhJ7A_2koZaWnSTgrAo_-sdwcB7lbiOK_w6Qnj1fk5t9ysRjENs4mRoTnWNbK1fLMSU8DDtyaLAZIqyP9I4c7GjVjK0Q7ZwOIQjVgLwXNMh6yhHgF4Ua8-l2rYH5ftXfzhysZIeysTavsngoAKxG1VDusGYwDHzi50AU3_WsGF2JP50A3XRLN__yh84uZfZ__5w22gm_FYryCHtvnrO5ZxFlbe23rIenQobFLJuOwZ_ANiwP9G-C2_YtCVbWujMxYUoq0vdeLQ6PHV-C2Jtzq4Icm2VnzwCrNAej5xv2oGWJFpHZvExvJHbmi-luL5Y3lk0Fk9naPYyehcEHK48J2wFrMb-z4W_uCkfS00L_mQcsMVMEfGqw9jdMXrg9Tp1WlvJzZlzSbEw8ZR_4_42dvDSOIsM1eBGlnSUABgK4smYOjtLhSjF-B--xfODtxKYtucPQ64LR__76t5f6xxt28xDUVBaT08CmF7PzPvNEG6Bb6_51XjRgD3aj0swEvHuv_4QJEhWdYpOVmSL9CPOwFCq6_CDuTODr-xT6iUNVBGcL5brVH8E-sSGJP5y-m8WIzFBbtCfKKRxr60chtakz9WOFEYyrJGphNdb6BkR3738TYRDE6RQrLDWqS-6sykYwB5Xk4NfwyfsI1GovKvH99FgP4KeKgmt.2Nkbl-U3dcESzdHYN7Jo-A';
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

let token;

describe('updatePledge api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should be able to update user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        userId: userId,
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 13,
        newsletterConsent: true,
        zipCode: '72074',
        name: randomWords(),
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to change other user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },

      body: JSON.stringify({
        userId: userId,
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/pledges/${otherUserId}`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges/${userId}`, request);

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
