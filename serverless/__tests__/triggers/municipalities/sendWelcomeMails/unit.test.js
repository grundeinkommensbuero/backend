const {
  computeMailType,
} = require('../../../../src/triggers/municipalities/sendWelcomeMails/computeMailType');

// C Flow

describe('Test compute mail type for C flow welcome mails', () => {
  it('should compute mail type C1.1', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);

    const user = { createdAt: date.toISOString() };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual('C1.1');
  });

  it('should compute mail type C1.2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 7);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [{ key: 'C1.1', timestamp: emailDate.toISOString() }],
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual('C1.2');
  });

  it('should not compute mail type C1.2 because only 6 days', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 6);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [{ key: 'C1.1', timestamp: emailDate.toISOString() }],
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual(null);
  });

  it('should not compute mail type C1.2 because user reacted', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 6);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [{ key: 'C1.1', timestamp: emailDate.toISOString() }],
      },
      reacted: { value: true, timestamp: emailDate.toISOString() },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual(null);
  });

  it('should compute mail type C2 after C1.1', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 16);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 9);

    const reactedDate = new Date();
    reactedDate.setDate(reactedDate.getDate() - 7);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [{ key: 'C1.1', timestamp: emailDate.toISOString() }],
        reacted: { value: true, timestamp: reactedDate.toISOString() },
        remind: { value: true, timestamp: reactedDate.toISOString() },
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual('C2');
  });

  it('should compute mail type C2 after C1.2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 16);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 9);

    const reactedDate = new Date();
    reactedDate.setDate(reactedDate.getDate() - 7);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [
          { key: 'C1.1', timestamp: emailDate.toISOString() },
          { key: 'C1.2', timestamp: emailDate.toISOString() },
        ],
        reacted: { value: true, timestamp: reactedDate.toISOString() },
        remind: { value: true, timestamp: reactedDate.toISOString() },
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual('C2');
  });

  it('should not compute mail type C2 after C1.2, no reaction', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 16);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 9);

    const reactedDate = new Date();
    reactedDate.setDate(reactedDate.getDate() - 7);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [
          { key: 'C1.1', timestamp: emailDate.toISOString() },
          { key: 'C1.2', timestamp: emailDate.toISOString() },
        ],
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual(null);
  });

  it('should not compute mail type C2 after C1.2 because user reacted', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 16);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 9);

    const reactedDate = new Date();
    reactedDate.setDate(reactedDate.getDate() - 7);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [
          { key: 'C1.1', timestamp: emailDate.toISOString() },
          { key: 'C1.2', timestamp: emailDate.toISOString() },
        ],
        reacted: { value: true, timestamp: reactedDate.toISOString() },
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual(null);
  });

  it('should not compute any mail type after C2', async () => {
    const date = new Date();
    date.setDate(date.getDate() - 14);

    const emailDate = new Date();
    emailDate.setDate(emailDate.getDate() - 7);

    const user = {
      createdAt: date.toISOString(),
      welcomeFlow: {
        emailsSent: [
          { key: 'C1.1', timestamp: emailDate.toISOString() },
          { key: 'C1.2', timestamp: emailDate.toISOString() },
          { key: 'C2', timestamp: emailDate.toISOString() },
        ],
      },
    };

    const mailType = computeMailType(user, date.toISOString());

    expect(mailType).toEqual(null);
  });
});
