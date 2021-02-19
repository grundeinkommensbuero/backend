const {
  analyseSignatureLists,
} = require('../../api/signatures/getSignatureListCount/analyseSignatureLists');
const {
  getNotReceivedSignatureLists,
  getScansOfUser,
  getSignatureCountOfAllLists,
} = require('../../shared/signatures');
const generateAttachments = require('../../shared/signatures/createPdf/generateAttachments');
const mailAttachments = require('../../shared/signatures/createPdf/attachments');
const { getUser } = require('../../shared/users');
const sendMail = require('./sendMail');
const qrCodeUrls = require('../../shared/signatures/createPdf/qrCodeUrls');

const remindAfter = [2, 6, 10];
// We send a different mail as final reminders to send in the signatures
const finalRemindAfter = [14, 21];

module.exports.handler = async event => {
  try {
    // Get general stats
    // and Get all lists which were not received yet
    const [signatureLists, signatureCounts, listCounts] = await Promise.all([
      getNotReceivedSignatureLists(),
      getSignatureCountOfAllLists(),
      analyseSignatureLists(),
    ]);

    // construct dates which are x days ago from now
    const timestamps = [];
    for (const days of remindAfter) {
      const date = new Date();
      date.setDate(date.getDate() - days);

      // we only want the current day (YYYY-MM-DD), because the lists are saved that way
      const timestamp = date.toISOString().substring(0, 10);
      timestamps.push(timestamp);
    }

    const finalTimestamps = [];
    for (const days of finalRemindAfter) {
      const date = new Date();
      date.setDate(date.getDate() - days);

      // we only want the current day (YYYY-MM-DD), because the lists are saved that way
      const timestamp = date.toISOString().substring(0, 10);
      finalTimestamps.push(timestamp);
    }

    // Loop through lists to check if a list was created x days ago
    for (const list of signatureLists) {
      // We only need to check lists of users and lists which were not part of letter action.
      // Also we want to deactivate the berlin, sh and brandenburg lists for now...
      if (
        list.userId !== 'anonymous' &&
        !list.manually &&
        list.campaign.code !== 'berlin-1' &&
        list.campaign.code !== 'schleswig-holstein-1' &&
        list.campaign.code !== 'brandenburg-1' &&
        list.campaign.code !== 'dibb-1'
      ) {
        // Check if list was created x days ago, then we send a reminder mail
        let index = timestamps.indexOf(list.createdAt);

        let mailType = null;
        if (index === -1) {
          index = finalTimestamps.indexOf(list.createdAt);
          mailType =
            index === finalTimestamps.length - 1 ? 'ultimate' : 'penultimate';
        }

        if (index !== -1) {
          // The last reminder will be different and will be the only one
          // being sent, if the the list is only not received (but can be scanned by user)
          if ((!mailType && !('scannedByUser' in list)) || mailType) {
            // Get user from users table to get email
            const result = await getUser(list.userId);

            // the user might have been deleted or does not have
            // reminder mail setting to true
            if (
              'Item' in result &&
              'reminderMails' in result.Item &&
              result.Item.reminderMails.value
            ) {
              const user = result.Item;

              // we should probably check if user has scanned or sent other lists
              const scans = await getScansOfUser(user, list.campaign.code);

              // If the user scanned or sent a list after the latest list was downloaded (also for example a
              // different list) we don't want to send the reminder
              let shouldSendMail = true;
              const scanArray = scans.receivedList;
              // If it is one of the ultimate mails we also want to send one, if the user scanned but
              // did not send, therefore in that case we don't add the scanned by user scans to compare them with
              if (!mailType) {
                scanArray.push(...scans.scannedByUserList);
              }

              for (const scan of scanArray) {
                // The issue is that list.createdAt will always be at 0 o'clock,
                // because the database entry is YYYY-MM-DD. That's why we can't
                // compare the values super precisely. The following comparison covers e.g. the case:
                // list a is downloaded on day x and signatures are recorded for that list on
                // day y, then list b is downloaded afterwards on day y. We still want to send
                // the reminder mail. So if there is a scan at the same day as a list was downloaded
                // we send the mail (the scan was for a different list anyway because we only fetched lists
                // with no scans).
                if (
                  new Date(scan.timestamp.substring(0, 10)) >
                  new Date(list.createdAt)
                ) {
                  shouldSendMail = false;
                }
              }

              if (shouldSendMail) {
                // Generate the pdfs to attach to the mail
                const qrCodeUrl = qrCodeUrls[list.campaign.state]
                  ? qrCodeUrls[list.campaign.state]
                  : qrCodeUrls.default;

                const attachments = await generateAttachments(
                  mailAttachments[list.campaign.code],
                  qrCodeUrl,
                  list.id,
                  list.campaign.code
                );

                await sendMail(
                  user,
                  list.id,
                  list.campaign,
                  mailType ? finalRemindAfter[index] : remindAfter[index],
                  mailType,
                  signatureCounts,
                  listCounts,
                  scans.scannedByUser,
                  attachments
                );
                console.log('success sending mail to', user.email);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }

  return event;
};
