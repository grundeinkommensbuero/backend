const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3 } = require('@aws-sdk/client-s3');

const jimp = require('jimp/dist');
const uuid = require('uuid/v4');
const { getUser } = require('../../shared/users');

const s3 = new S3();
const ddb = DynamoDBDocument.from(new DynamoDB());
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

    // Delete the old images from s3
    await deleteOldImages(userId);

    // Now save image urls in db
    await updateUser(userId, imageUrls);

    return event;
  } catch (error) {
    console.log('Error', error);
    return event;
  }
};

// Get urls to old pictures to delete those if they exist
const deleteOldImages = async userId => {
  // Get urls
  const result = await getUser(userId);

  if ('Item' in result && 'profilePictures' in result.Item) {
    const oldImageUrls = result.Item.profilePictures;

    await Promise.all(
      Object.keys(oldImageUrls).map(size => deleteImage(oldImageUrls[size]))
    );
  }
};

const deleteImage = url => {
  // the filename is the three last parts of the url (e.g. dev/resized/12391.jpg)
  const splitString = url.split('/');

  const params = {
    Bucket: bucket,
    Key: `${splitString[splitString.length - 3]}/${
      splitString[splitString.length - 2]
    }/${splitString[splitString.length - 1]}`,
  };

  console.log('About to delete image', params);

  return s3.deleteObject(params);
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

  return ddb.update(params);
};

// Get image from S3
const getImage = filename => {
  const params = {
    Bucket: bucket,
    Key: filename,
  };

  return s3.getObject(params);
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

  return new Upload({
    client: s3,
    params,
  }).done();
};
