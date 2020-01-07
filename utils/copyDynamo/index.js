const copy = require('copy-dynamodb-table').copy;

copy(
  {
    config: { region: 'eu-central-1' },
    source: {
      tableName: 'Signatures', // required
    },
    destination: {
      tableName: 'prod-signatures', // required
    },
    log: true, // default false
  },
  function(err, result) {
    if (err) {
      console.log(err);
    }
    console.log(result);
  }
);
