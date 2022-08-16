const { errorResponse } = require('../../../shared/apiResponse');
const { checkBasicAuth } = require('../../../shared/utils');
const { getVouchers } = require('../../../shared/vouchers');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    if (!checkBasicAuth(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const { queryStringParameters } = event;

    let filterSafeAddress;
    let filterTimestamp;

    if (queryStringParameters) {
      const { safeAddress, timestamp } = queryStringParameters;

      filterSafeAddress = safeAddress;
      filterTimestamp = timestamp;
    }

    const vouchers = await getVouchers(filterSafeAddress, filterTimestamp);

    const formattedVouchers = vouchers.map(
      ({ provider, code, amount, soldTo, soldAt, transactionId }) => ({
        providerId: provider.id,
        amount,
        code,
        sold: soldTo
          ? {
              safeAddress: soldTo,
              timestamp: soldAt,
              transactionId,
            }
          : null,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: formattedVouchers,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error getting vouchers', error);
    return errorResponse(500, 'Error getting vouchers', error);
  }
};
