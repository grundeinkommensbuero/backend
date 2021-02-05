/**
 * This function is used create a personalized sharing template
 * for sharing municipalities
 * @param {*} event
 */

const AWS = require('aws-sdk');
const jimp = require('jimp/dist');
const { errorResponse } = require('../../shared/apiResponse');
const fetch = require('node-fetch').default;
const { accessToken, spaceId } = require('../../../contentfulConfig');
const { getUser } = require('../../shared/users');
const {
  getMunicipalityStats,
  getMunicipality,
} = require('../../shared/municipalities');

const isbot = require('isbot');

const pathToFont = __dirname + '/3AD95C_0_0.bft.fnt';
const s3 = new AWS.S3();
const emblemBucketUrl =
  'https://xbge-municipalities-emblems.s3.eu-central-1.amazonaws.com/wappen';
const outputBucket = 'xbge-personalized-sharing-images';
const redirectUrl = 'https://expedition-grundeinkommen.de/gemeinden';
const contentfulRequestHeaders = {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
};

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
      version: templateVersion,
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

    const stats = await getMunicipalityStats(ags, municipality.population);

    let renderedImageUrl = null;
    // Only generate new image if is bot
    if (isBot) {
      let profilePictureUrl = null;

      // Get profile picture if available, and if flag to add it is set
      if ('profilePictures' in user && addProfilePicture) {
        // Get a medium sized image and load it into J
        profilePictureUrl = user.profilePictures['900'];
      }

      // Get template image
      const { templates, captions } = await getTemplatesFromContentful(
        templateVersion,
        profilePictureUrl
      );

      // Render combined image
      const buffer = await createRenderedImage(
        templates,
        ags,
        profilePictureUrl,
        captions,
        user.username,
        municipality.name
      );

      // Upload image to s3
      const uploadResult = await uploadImage(buffer, user.cognitoId, ags);

      renderedImageUrl = uploadResult.Location;
    }

    const title = `Hole das Grundeinkommen nach ${municipality.name}`;
    const description = `Werde Teil der Expedition an und hole das Grundeinkommen nach ${municipality.name}!`;
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
            window.location.href = "${redirectUrl}/${ags}";
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
          <a href="${redirectUrl}/${ags}"><b>HIER</b></a>
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

// Get all entries of type shareTemplate from contentful
// and retrieve the corresponding image depending on templateVersion
const getTemplatesFromContentful = async (
  templateVersion,
  profilePictureUrl
) => {
  const result = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/entries?content_type=shareTemplate`,
    contentfulRequestHeaders
  );

  // parse result to json
  const json = await result.json();

  const asset = json.items.find(
    item => item.fields.version === templateVersion
  );

  const assetId = profilePictureUrl
    ? asset.fields.backgroundImage.sys.id
    : asset.fields.backgroundImageAlternative.sys.id;
  const emblemId = asset.fields.genericEmblem.sys.id;

  const mainCaption = asset.fields.mainCaption;
  const altMainCaption = asset.fields.altMainCaption;
  const subCaption = asset.fields.subCaption;

  const [templateUrl, emblemUrl] = await Promise.all([
    getAssetFromContentful(assetId),
    getAssetFromContentful(emblemId),
  ]);

  return {
    templates: { templateUrl, emblemUrl },
    captions: { mainCaption, altMainCaption, subCaption },
  };
};

// Get some asset from Contentful by ID
const getAssetFromContentful = async assetId => {
  const assetResult = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/assets/${assetId}`,
    contentfulRequestHeaders
  );

  // parse result to json
  const json = await assetResult.json();
  console.log('asset result json', json);
  return json.fields.file.url;
};

const createRenderedImage = async (
  templates,
  ags,
  profilePictureUrl,
  captions,
  username,
  municipalityName
) => {
  try {
    const emblem = await jimp.read(`${emblemBucketUrl}/${ags}.png`);
    return createCompositeImage(
      templates.templateUrl,
      emblem,
      profilePictureUrl,
      captions,
      username,
      municipalityName
    );
  } catch (error) {
    const genericEmblem = await jimp.read(`https:${templates.emblemUrl}`);
    return createCompositeImage(
      templates.templateUrl,
      genericEmblem,
      profilePictureUrl,
      captions,
      username,
      municipalityName
    );
  }
};

const createCompositeImage = async (
  backgroundUrl,
  emblem,
  profilePictureUrl,
  captions,
  username,
  municipalityName
) => {
  const background = await jimp.read(`https:${backgroundUrl}`);

  emblem.scaleToFit(180, 180, jimp.RESIZE_BEZIER);
  background.composite(
    emblem,
    1050 - emblem.bitmap.width / 2,
    500 - emblem.bitmap.height / 2
  );

  let profilePicture;
  if (profilePictureUrl) {
    profilePicture = await jimp.read(profilePictureUrl);

    // TODO: Upload this mask to Contentful
    const mask = await jimp.read(
      'https://cloud.githubusercontent.com/assets/414918/11165709/051d10b0-8b0f-11e5-864a-20ef0bada8d6.png'
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
    .print(font, image.bitmap.width / 2 - 50, 150, mainCaption, 700)
    .print(font, image.bitmap.width / 2 - 50, 400, captions.subCaption, 350);

  return image;
};
