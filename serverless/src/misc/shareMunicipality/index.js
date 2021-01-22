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

const s3 = new AWS.S3();
const emblemBucketUrl =
  'https://xbge-municipalities-emblems.s3.eu-central-1.amazonaws.com/wappen';
const outputBucket = 'xbge-personalized-sharing-images';
const ogUrl = 'https://expedition-grundeinkommen.de/gemeinde-teilen';
const redirectUrl = 'https://expedition-grundeinkommen.de/gemeinden';
const contentfulRequestHeaders = {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
};

module.exports.handler = async event => {
  try {
    // Check for query params (is null if there is none)
    if (!event.queryStringParameters) {
      return errorResponse(400, 'No query params provided');
    }

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

    let profilePictureUrl = null;

    // Get profile picture if available, and if flag to add it is set
    if ('profilePictures' in user && addProfilePicture) {
      // Get a medium sized image and load it into J
      profilePictureUrl = user.profilePictures['900'];
    }

    // Get template image
    const templates = await getTemplatesFromContentful(
      templateVersion,
      profilePictureUrl
    );

    // Get stats for this municipality
    const municipalityResult = await getMunicipality(ags);

    if (!('Item' in municipalityResult)) {
      // No municipality with the passed ags found
      return errorResponse(404, 'No municipality found with the passed ags');
    }

    const municipality = municipalityResult.Item;

    const stats = await getMunicipalityStats(ags, municipality.population);

    // Render combined image
    const buffer = await createRenderedImage(templates, ags, profilePictureUrl);

    // Upload image to s3
    const { Location: renderedImageUrl } = await uploadImage(
      buffer,
      user.cognitoId,
      ags
    );

    const title = `Hole das Grundeinkommen nach ${municipality.name}`;
    // Return HTML
    const html = `
    <html>
      <head>
        <meta property="og:title" content="${title}" />
        <meta property="og:url" content="${redirectUrl}" />
        <meta property="og:image" content="${renderedImageUrl}" />
        <title>${title}</title>
        <script>
          window.location.replace(${redirectUrl});
        </script>
      </head>
      <body>
        <h1>Du wirst automatisch weitergeleitet...</h1>
        <p>
          Solltest du nicht automatisch weitergeleitet werden, klicke bitte
          &nbsp;<a href="${redirectUrl}/${ags}">hier</a>
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

  console.log('asset', asset);
  const assetId = profilePictureUrl
    ? asset.fields.backgroundImage.sys.id
    : asset.fields.backgroundImageAlternative.sys.id;
  const emblemId = asset.fields.genericEmblem.sys.id;

  const [templateUrl, emblemUrl] = await Promise.all([
    getAssetFromContentful(assetId),
    getAssetFromContentful(emblemId),
  ]);

  return { templateUrl, emblemUrl };
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

const createRenderedImage = async (templates, ags, profilePictureUrl) => {
  try {
    const emblem = await jimp.read(`${emblemBucketUrl}/${ags}.png`);
    return createCompositeImage(
      templates.templateUrl,
      emblem,
      profilePictureUrl
    );
  } catch (error) {
    const genericEmblem = jimp.read(`https:${templates.emblemUrl}`);
    return createCompositeImage(
      templates.templateUrl,
      genericEmblem,
      profilePictureUrl
    );
  }
};

const createCompositeImage = async (
  backgroundUrl,
  emblem,
  profilePictureUrl
) => {
  const background = await jimp.read(`https:${backgroundUrl}`);

  emblem.rotate(5).scaleToFit(180, 180, jimp.RESIZE_BEZIER);
  background.composite(
    emblem,
    880 - emblem.bitmap.width / 2,
    330 - emblem.bitmap.height / 2
  );

  let profilePicture;
  if (profilePictureUrl) {
    profilePicture = await jimp.read(profilePictureUrl);
    profilePicture.scaleToFit(180, 180, jimp.RESIZE_BEZIER);
    background.composite(
      profilePicture,
      200 - profilePicture.bitmap.width / 2,
      330 - profilePicture.bitmap.height / 2
    );
  }
  return background.getBufferAsync(jimp.MIME_PNG);
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
