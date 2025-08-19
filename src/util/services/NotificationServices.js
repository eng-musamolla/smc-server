const admin = require("../firebase");

// Function to send Firebase push notification
const NotificationSercice = async (deviceToken, title, body) => {
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: deviceToken, // Specify the topic or use a token for individual devices
    };

    await admin.messaging().send(message);
  } catch (error) {
    console.error("Failed to send push notification:", error.message);
  }
};


module.exports = {
  NotificationSercice
};
