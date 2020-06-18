module.exports.errorResponse = (statusCode, message, error = null) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message,
      error,
    });
  } else {
    body = JSON.stringify({
      message,
    });
  }
  return {
    statusCode,
    body,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    isBase64Encoded: false,
  };
};
