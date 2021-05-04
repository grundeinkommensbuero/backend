/**
 * This function is used create a personalized sharing template
 * for sharing municipalities
 * @param {*} event
 */

const AWS = require('aws-sdk');
const jimp = require('jimp/dist');
const { errorResponse } = require('../../shared/apiResponse');
const { getUser } = require('../../shared/users');
const {
  getMunicipality,
} = require('../../shared/municipalities');

const isbot = require('isbot');

const pathToFont = __dirname + '/ideal-bold.fnt';
const s3 = new AWS.S3();
const outputBucket = 'xbge-personalized-sharing-images';
const redirectUrl = 'https://expedition-grundeinkommen.de/';


module.exports.handler = async event => {
  try {
    console.log('event', event);
    // Check for query params (is null if there is none)
    if (!event.queryStringParameters) {
      return errorResponse(400, 'No query params provided');
    }

    // Get user agent to check if source is crawler
    const isBot = isbot(event.headers['User-Agent']);

    const {
      ags,
      addProfilePicture,
    } = event.queryStringParameters;

    // get user id from path parameter
    const userId = event.pathParameters.userId;

    const result = await getUser(userId);
    // if user does not have Item as property, there was no user found
    if (!('Item' in result) || typeof result.Item === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    const user = result.Item;

    // Get stats for this municipality
    const municipalityResult = await getMunicipality(ags);

    if (!('Item' in municipalityResult)) {
      // No municipality with the passed ags found
      return errorResponse(404, 'No municipality found with the passed ags');
    }

    const municipality = municipalityResult.Item;

    let renderedImageUrl = null;
    // Only generate new image if is bot
    if (isBot) {
      let profilePictureUrl = null;

      // Get profile picture if available, and if flag to add it is set
      if ('profilePictures' in user && addProfilePicture) {
        // Get a medium sized image and load it into J
        profilePictureUrl = user.profilePictures['900'];
      }

      const captionsCrowdfunding = { mainCaption: '$USERNAME lässt #Grundeinkommen Realität werden.', altMainCaption: 'Ich lasse #Grundeinkommen Realität werden.', subCaption: '' };

      // Render combined image
      const buffer = await createRenderedImage(
        profilePictureUrl,
        captionsCrowdfunding,
        user.username,
        municipality.name
      );

      // Upload image to s3
      const uploadResult = await uploadImage(buffer, user.cognitoId, ags);

      renderedImageUrl = uploadResult.Location;
    }

    const title = 'Bring das Grundeinkommen mit mir an den Staat!';
    const description =
      'Werde Teil der Expedition und hole das Grundeinkommen in deinen Ort!';
    const html = `
    <html lang="de">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="twitter:card" content="summary_large_image" />
        ${renderedImageUrl
        ? `<meta name="twitter:image" content="${renderedImageUrl}" />`
        : ''
      }
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        
        ${renderedImageUrl
        ? `<meta property="og:image" content="${renderedImageUrl}" />`
        : ''
      }
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        
        <title>${title}</title>

        <script>
          if(${!isBot}) {
            window.location.href = "${redirectUrl}/?referredByUser=${user.cognitoId
      }";
          }
        </script>
        <style>
          .loader {
            border: 8px solid #F0F0F0;
            border-top: 8px solid #00C8F0;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 0.75s linear infinite;
            margin: auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          body {
            font-family:'Ideal',Tahoma,Arial,Helvetica,sans-serif;
            background-color:#FF4646;
            color:#fff;
            padding:2rem;
            text-align:center;
          }
          a {
            color:#00C8F0
          }
          h1 {
            font-size:2rem;
          }
          p {
            font-size:1.5rem;
          }
        </style>
      </head>
      <body>
        <h1>Du wirst automatisch weitergeleitet...</h1>
        <div class="loader"></div>
        <p>
          Solltest du nicht automatisch weitergeleitet werden,<br/>klicke bitte
          <a href="${redirectUrl}/?referredByUser=${user.cognitoId
      }"><b>HIER</b></a>
        </p>
      </body>
    </html>
  `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: html,
    };
  } catch (error) {
    console.log('error creating sharing template', error);
    return errorResponse(500, 'error creating sharing template', error);
  }
};

const createRenderedImage = async (
  profilePictureUrl,
  captions,
  username,
  municipalityName
) => {
  try {
    return createCompositeImage(
      profilePictureUrl,
      captions,
      username,
      municipalityName
    );
  } catch (error) {
    return createCompositeImage(
      profilePictureUrl,
      captions,
      username,
      municipalityName
    );
  }
};

const createCompositeImage = async (
  profilePictureUrl,
  captions,
  username,
  municipalityName
) => {
  const backgroundUrlCrowdfunding = profilePictureUrl ?
    'https://images.ctfassets.net/af08tobnb0cl/694pHdfxxgXfIl4IckPzHL/38e066345bde0b587a911bbaff16a614/Teilen_Crowdfundingv3_leer.png' :
    'https://images.ctfassets.net/af08tobnb0cl/5WDl82fjV2aPFl6olbx8EO/ceabe8fa8e6e461d88b244d2f26c2cbb/Teilen_Crowdfunding_v3.png';

  const background = await jimp.read(backgroundUrlCrowdfunding);

  let profilePicture;
  if (profilePictureUrl) {
    profilePicture = await jimp.read(profilePictureUrl);

    const mask = await jimp.read(
      'https://images.ctfassets.net/af08tobnb0cl/2I4QnbzZgw5IZCQqkd8hDg/b024883bdadd37240bacbf1f5dd6b119/ProfileMask.png?h=512'
    );

    const height = profilePicture.bitmap.height;
    const width = profilePicture.bitmap.width;

    if (height < width) {
      const offset = Math.floor((width - height) / 2);
      profilePicture.crop(offset, 0, height, height);
    } else if (width < height) {
      const offset = Math.floor((height - width) / 2);
      profilePicture.crop(0, offset, width, width);
    }

    profilePicture.scaleToFit(360, 360, jimp.RESIZE_BEZIER);
    mask.scaleToFit(360, 360, jimp.RESIZE_BEZIER);
    profilePicture.mask(mask, 0, 0);
    background.composite(
      profilePicture,
      300 - profilePicture.bitmap.width / 2,
      320 - profilePicture.bitmap.height / 2
    );
  }

  const imageWithText = await printText(
    background,
    captions,
    username,
    municipalityName
  );
  return imageWithText.getBufferAsync(jimp.MIME_PNG);
};

const uploadImage = async (buffer, userId, ags) => {
  const params = {
    Bucket: outputBucket,
    ACL: 'public-read',
    Key: `${userId}_${ags}.png`,
    Body: buffer,
    ContentType: jimp.MIME_PNG,
    Metadata: {
      userId,
      ags,
    },
  };

  return s3.upload(params).promise();
};

const printText = async (image, captions, username, municipalityName) => {
  const mainCaption = username
    ? captions.mainCaption
      .replace('$USERNAME', username)
      .replace('$MUNICIPALITY_NAME', municipalityName)
    : captions.altMainCaption.replace('$MUNICIPALITY_NAME', municipalityName);

  const font = await jimp.loadFont(pathToFont);

  await image
    .print(font, image.bitmap.width / 2 - 50, 150, mainCaption, 500)
    .print(font, image.bitmap.width / 2 - 50, 400, captions.subCaption, 350);
  return image;
};
