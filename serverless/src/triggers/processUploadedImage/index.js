const AWS = require('aws-sdk');
const jimp = require('jimp/dist');
const uuid = require('uuid/v4');
const { getFileSuffix } = require('../../shared/utils');
const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();
const bucketUrl = process.env.S3_IMAGES_URL;
const tableName = process.env.USERS_TABLE_NAME;
const bucket = process.env.IMAGE_BUCKET;

const sizes = [200, 500, 900];

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
    const contentType = s3Object.Metadata.contenttype;

    console.log('s3 object', s3Object);

    const image = await jimp.read(s3Object.Body);

    // Use array of promises so that we can use promise all
    // to handle operations in parallel
    const images = await Promise.all(
      sizes.map(size =>
        resizeAndUploadImage(image, size, contentType, userId, originalFilename)
      )
    );

    const imageUrls = {
      original: `${bucketUrl}/${originalFilename}`,
      small: images[0].Location,
      medium: images[1].Location,
      big: images[2].Location,
    };

    // Now save image urls in db
    await updateUser(userId, imageUrls);
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
const resizeAndUploadImage = async (
  image,
  width,
  contentType,
  userId,
  originalFilename
) => {
  const resizedImage = await resizeImage(image, width);
  const buffer = await resizedImage.getBufferAsync(contentType);

  return uploadImage(buffer, contentType, userId, originalFilename);
};

// Read image from buffer and resize image using jimp
const resizeImage = async (image, width) => {
  const clone = await image.clone();

  return clone.resize(width, jimp.AUTO);
};

const uploadImage = async (buffer, contentType, userId, originalFilename) => {
  console.log('uploading image');
  const imageId = uuid();

  const params = {
    Bucket: bucket,
    ACL: 'public-read',
    Key: `resized/${imageId}.${getFileSuffix(contentType)}`,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      contentType,
      userId,
      original: originalFilename,
    },
  };

  console.log('params', params);

  return s3.upload(params).promise();
};
