const {
  computeMailType,
} = require('../../../src/triggers/sendReminderMails/computeMailType');

describe('Test compute mail type for reminder mails', () => {
  it('should compute mail type B2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    const user = {};
    const list = { createdAt: date.toISOString().substring(0, 10) };

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B2.1');
  });

  it('should compute mail type B2.2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const user = {
      listFlow: {
        emailsSent: [{ key: 'B2.1', timestamp: date.toISOString() }],
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B2.2');
  });

  it('should not compute mail type B2.2 because 7 days are not passed', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 5);
    const user = {
      listFlow: {
        emailsSent: [{ key: 'B2.1', timestamp: date.toISOString() }],
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual(null);
  });

  it('should compute no new mail type after B2.2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const user = {
      listFlow: {
        emailsSent: [{ key: 'B2.2', timestamp: date.toISOString() }],
      },
    };

    const listCreatedAt = new Date();
    listCreatedAt.setDate(listCreatedAt.getDate() - 10);

    const list = { createdAt: listCreatedAt.toISOString().substring(0, 10) };

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual(null);
  });

  it('should compute mail type B3.1 1 day after downloadedList was set', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 3);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 1);

    const user = {
      listFlow: {
        emailsSent: [{ key: 'B2.1', timestamp: lastEmailDate.toISOString() }],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B3.1');
  });

  it('should not compute mail type B3.1 0 days after B2.1', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 3);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 0);

    const user = {
      listFlow: {
        emailsSent: [{ key: 'B2.1', timestamp: lastEmailDate.toISOString() }],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual(null);
  });

  it('should compute mail type B3.2 3 days after B3.1', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    const user = {
      listFlow: {
        emailsSent: [
          { key: 'B2.1', timestamp: date.toISOString() },
          { key: 'B3.1', timestamp: date.toISOString() },
        ],
        downloadedList: { value: true, timestamp: date.toISOString() },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B3.2');
  });

  it('should not compute mail type B3.2 only 2 days after B3.1', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 2);
    const user = {
      listFlow: {
        emailsSent: [{ key: 'B3.1', timestamp: date.toISOString() }],
        downloadedList: { value: true, timestamp: date.toISOString() },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual(null);
  });

  it('should compute mail type B3.3 3 days after B3.2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);

    const user = {
      listFlow: {
        emailsSent: [
          { key: 'B2.1', timestamp: date.toISOString() },
          { key: 'B3.1', timestamp: date.toISOString() },
          { key: 'B3.2', timestamp: date.toISOString() },
        ],
        downloadedList: { value: true, timestamp: date.toISOString() },
        printedList: { remind: true },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B3.3');
  });

  it('should compute mail type B3.3 because no remind flag', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);

    const user = {
      listFlow: {
        emailsSent: [
          { key: 'B2.1', timestamp: date.toISOString() },
          { key: 'B3.1', timestamp: date.toISOString() },
          { key: 'B3.2', timestamp: date.toISOString() },
        ],
        downloadedList: { value: true, timestamp: date.toISOString() },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual(null);
  });

  it('should compute mail type B4.1 1 day after printedList was set', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 3);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 1);

    const user = {
      listFlow: {
        emailsSent: [{ key: 'B3.1', timestamp: lastEmailDate.toISOString() }],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        printedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B4.1');
  });

  it('should compute mail type B4.2 3 days after B4.1', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 3);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 4);

    const user = {
      listFlow: {
        emailsSent: [
          { key: 'B3.1', timestamp: lastEmailDate.toISOString() },
          { key: 'B4.1', timestamp: lastEmailDate.toISOString() },
        ],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        printedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B4.2');
  });

  it('should not compute mail type B4.2 after only 2 days after B4.1', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 2);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 4);

    const user = {
      listFlow: {
        emailsSent: [
          { key: 'B3.1', timestamp: lastEmailDate.toISOString() },
          { key: 'B4.1', timestamp: lastEmailDate.toISOString() },
        ],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        printedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual(null);
  });

  it('should compute mail type B4.3 after B4.2', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 3);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 4);

    const user = {
      listFlow: {
        emailsSent: [
          { key: 'B3.1', timestamp: lastEmailDate.toISOString() },
          { key: 'B4.1', timestamp: lastEmailDate.toISOString() },
          { key: 'B4.2', timestamp: lastEmailDate.toISOString() },
        ],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        printedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        signedList: {
          remind: true,
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B4.3');
  });

  it('should compute mail type B6.1 1 day after signedList was set', async () => {
    const lastEmailDate = new Date();
    lastEmailDate.setDate(lastEmailDate.getDate() - 3);

    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 1);

    const user = {
      listFlow: {
        emailsSent: [{ key: 'B4.1', timestamp: lastEmailDate.toISOString() }],
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        printedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
        signedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    // List createdAt does not matter in this case
    const list = {};

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B6.1');
  });

  /**
   * Not testing the rest of B6, since it is the same principle as before
   */

  /**
   *  Following are the tests for cases, where attributes are set before the previous mails were sent.
   *  Therefore mails are skipped
   */

  it('should compute mail type B3.1 3 days after list was created, if downloadedList is set', async () => {
    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 1);

    const user = {
      listFlow: {
        downloadedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    const date = new Date();
    date.setDate(date.getDate() - 3);

    const list = { createdAt: date.toISOString().substring(0, 10) };

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B3.1');
  });

  it('should compute mail type B4.1 3 days after list was created, if printedList is set', async () => {
    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 1);

    const user = {
      listFlow: {
        printedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    const date = new Date();
    date.setDate(date.getDate() - 3);

    const list = { createdAt: date.toISOString().substring(0, 10) };

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B4.1');
  });

  it('should compute mail type B6.1 3 days after list was created, if signedList is set', async () => {
    const attributeSetDate = new Date();
    attributeSetDate.setDate(attributeSetDate.getDate() - 1);

    const user = {
      listFlow: {
        signedList: {
          value: true,
          timestamp: attributeSetDate.toISOString(),
        },
      },
    };

    const date = new Date();
    date.setDate(date.getDate() - 3);

    const list = { createdAt: date.toISOString().substring(0, 10) };

    const mailType = computeMailType(user, list);

    expect(mailType).toEqual('B6.1');
  });
});
