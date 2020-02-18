const AWS = require('aws-sdk');
const sharp = require('sharp');
const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();
const bucketUrl = process.env.S3_IMAGES_URL;
const tableName = process.env.USERS_TABLE_NAME;
const bucket = process.env.IMAGE_BUCKET;

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

    const imageUrls = {
      original: `${bucketUrl}/originals/${originalFilename}`,
    };

    // resizeImage(data.Body);

    // Now save image urls in db
    // await updateUser(userId, imageUrls);
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

const getImage = filename => {
  var params = {
    Bucket: bucket,
    Key: `originals/${filename}"`,
  };

  return s3.getObject(params).promise();
};

const resizeImage = buffer => {
  sharp(buffer).resize();
};
