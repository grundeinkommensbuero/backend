const AWS = require('aws-sdk');
const jimp = require('jimp/dist');
const uuid = require('uuid/v4');
const { getFileSuffix } = require('../../shared/utils');
const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();
const bucketUrl = process.env.S3_IMAGES_URL;
const tableName = process.env.USERS_TABLE_NAME;
const bucket = process.env.IMAGE_BUCKET;
const stage = process.env.STAGE;

const sizes = [200, 500, 900, 1200];

module.exports.handler = async event => {
  try {
    const s3Record = event.Records[0].s3;

    const originalFilename = s3Record.object.key;

    const s3Object = await getImage(originalFilename);

    if (!s3Object.Metadata) {
      // Shouldn't get here
      console.log('Cannot process photo as no metadata is set for it');
      return event;
    }

    // S3 metadata field names are converted to lowercase
    const userId = s3Object.Metadata.userid;

    console.log('s3 object', s3Object);

    const image = await jimp.read(s3Object.Body);

    // Use array of promises so that we can use promise all
    // to handle operations in parallel
    const images = await Promise.all(
      sizes.map(size =>
        resizeAndUploadImage(image, size, userId, originalFilename)
      )
    );

    const imageUrls = {
      original: `${bucketUrl}/${originalFilename}`,
      [sizes[0]]: images[0].Location,
      [sizes[1]]: images[1].Location,
      [sizes[2]]: images[2].Location,
      [sizes[3]]: images[2].Location,
    };

    // Now save image urls in db
    await updateUser(userId, imageUrls);

    return event;
  } catch (error) {
    console.log('Error', error);
    return event;
  }
};

// Updates user to save url of image
const updateUser = (userId, urls) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET profilePictures = :urls',
    ExpressionAttributeValues: {
      ':urls': urls,
    },
  };

  return ddb.update(params).promise();
};

// Get image from S3
const getImage = filename => {
  const params = {
    Bucket: bucket,
    Key: filename,
  };

  return s3.getObject(params).promise();
};

// Resize and upload image to S3
const resizeAndUploadImage = async (image, width, userId, originalFilename) => {
  const buffer = await resizeImage(image, width);

  return uploadImage(buffer, userId, originalFilename);
};

// Read image from buffer and resize image using jimp
const resizeImage = async (image, width) => {
  const clone = await image.clone();

  return clone
    .resize(width, jimp.AUTO)
    .quality(60)
    .getBufferAsync(jimp.MIME_JPEG);
};

const uploadImage = async (buffer, userId, originalFilename) => {
  console.log('uploading image');
  const imageId = uuid();

  const params = {
    Bucket: bucket,
    ACL: 'public-read',
    Key: `${stage}/resized/${imageId}.jpg`,
    Body: buffer,
    ContentType: jimp.MIME_JPEG,
    Metadata: {
      contentType: jimp.MIME_JPEG,
      userId,
      original: originalFilename,
    },
  };

  console.log('params', params);

  return s3.upload(params).promise();
};
