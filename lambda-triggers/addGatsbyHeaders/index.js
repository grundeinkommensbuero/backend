exports.handler = async event => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  if (
    request.uri.startsWith('/static/') ||
    (request.uri.endsWith('.js') && !request.uri.endsWith('sw.js')) ||
    request.uri.endsWith('.css')
  ) {
    console.log('adding "cache forever" header');
    headers['cache-control'] = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ];
  } else {
    console.log('adding "no cache" header');
    headers['cache-control'] = [
      {
        key: 'Cache-Control',
        value: 'public, max-age=0, must-revalidate',
      },
    ];
  }

  return response;
};
