const copy = require('copy-dynamodb-table').copy;

copy(
  {
    config: { region: 'eu-central-1' },
    source: {
      tableName: 'Users', // required
    },
    destination: {
      tableName: 'prod-users', // required
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
