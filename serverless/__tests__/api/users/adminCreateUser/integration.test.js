const {
  INVOKE_URL,
  ADMIN_POOL_ID,
  ADMIN_CLIENT_ID,
} = require('../../../testConfig');

const fetch = require('node-fetch');
const randomWords = require('random-words');
const refreshToken =
  'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.iunUvyTrZqxvjgg0dT2h6zVW1sxzQjb7On29_SCz1jPOBw9VDTVsxiqvsu8kz8bniXDGmNoCW1nZSXq9pPxrm3XuU2dlHdakkD-TVd1V__D_6fQ7xdheT0FHA3CgFAT4Mx7t_g31e4tJBAEk2Fm65X4QAGvfIuh-EpQw8g6MeD2XVkXakIxXS2lVurHFmAEq4IY-Y3AeehOIY42gomR8EyWqYfSljqUrDhjvgjrz7crir297SBlndIWE0_-NO1dCjQCeUEmcX7vxX0JpH--Up9i6az2hyvyvAFRY7SS8riT9XlsMtrTTuzQ-fMoYpqbf-vvAvhodsFa4tOaVE_9BTg.ztDnyYzzzWGsYSy_.Fueud-hCHiHAvJ64gubLh9G3URUfBlkNAXA9Xxp9HtYigSlRnVZOc10NYdlEu7YRpTbYqPzNUcs1Ll9Y_w9kmpcoQWCWDr8FrCGm_8OHVeotGWKioyzI0vgLUw17xg_LrDYBWgfyW7ONW4S2-Xy2Bkwzd7fFxNdcN873Z73zGpvZAQ8xz-YCy8XuW2s98b0HJgOh2vaxnvrH0O0a9pp4rRsY5dat0kP9LKh2b8I9dflQOsIIzQTlTeNYvTmNlcuRR57oYzIYve0z-rnYSEmdUyIhclJ21AFZZht3o00R_sNKQlQ78C5yDR_qeHeEc7oJ84Xt0wP4cV_arcegU-CwKJnnGZmAfn02t0IMoAIJcCEyC22ljISDKTsUB3JO3rzkfxajs-ksJOLp3aK_eFns5UoIbKRoQgYLa6p2jvggP9GoKE5HSkRSWEgzVRMDU5KfHYq_L1qE47jybA3RnGptEoqQfrLWZdC7R2T5Gy-DD83a-iD93ydzAmYVwTDWPDs8lcjrgQeZHdZp1YrUvbdHvhvURKD6W0BVrKzTQxFtKwSeLZtl8Fp7rw3MJ2GSvZ48s08BVADFA-pCFX4Rldbl6G57xH1SmKri9MFutERj9YbU5y_7lR2IxTpNZTRQvuNnL7E3FS5UBebZdc6W97lcEgFNnpsDuoqVZQkXSKqCBEw09uIMGP75BgNWFKd3yfRPg1evake0cSPVrcPpYlYY4FnwFSOY-r4TdE2b1YMN0E90z9FggLqCBuBDgDFCg6RXivsAgst9Ar5CInBJWXZ8kjBN_mmUwLdTd6CX3dyW4sojgQt5r5uLPK4NH4rQdtaZrEocZ9sv7xKL9YbUSO_b9-Jw0F5OvZrCEGwRcR31al3PjADSklxEbU_stO9175dLnP5OYoYSA4KSzGSCqh60uJFWuryyzpLTjclhlSHIjGEyJVgTMBsDrVrnrz0ZLyNyy14sLgL9llRhTT9bTeyugcOE-xhEj5lB-GJvMnGitp8GH4EKP4v1KpdREv0sadnY2kajJ2a2AfmCGQIBmRVxG5M_i_scE0M0nVPedygwEEZ_OYUD0Yoa7qTA9qaKgjNy8I3yDeyNwd5_Ppa_fakSIrFYoegbUVZFfUmiV0p61eEZAAUUzjDO0sakr-jH89XJsE_Ng8ORwiJFcAx8A5sRNA8Qga49o86ThNGB3rxzg5Fh_93qlc8VaPmlApVTe6ke76P6WcKIIzL9Nqshr-0F9p1-Pc6kJTT9_Nzf9ffVLyuWwNZi49ef7Fuw2GjAlJOJTWeZ9LcGsFLWpg5o55lrOklDX5XJeD5LfTYUocxcD313KUEtsVj2d3tA7fyyJrlHG5bq.55DbEmeWUEidEyuQpH9K6g';
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

let token;

describe('adminCreateUser api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should create a new user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should have missing params (campaign)', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params (email)', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(401);
  });
});

const authenticate = async () => {
  const { AuthenticationResult } = await cognito
    .adminInitiateAuth({
      AuthFlow: 'REFRESH_TOKEN',
      UserPoolId: ADMIN_POOL_ID,
      ClientId: ADMIN_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    })
    .promise();

  return AuthenticationResult.IdToken;
};
