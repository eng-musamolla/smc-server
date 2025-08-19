// const NotificationSercice = require("../util/services/NotificationServices");

// const sendFirebaseNotification = async (req, res) => {
//     try {

//         const { deviceToken, title, body } = req.body;

//         // Validate input
//         if (!deviceToken || !title || !body) {
//             return res.status(400).json({ error: "Missing required fields" });
//         }

//         // Send push notification
//         await NotificationSercice(deviceToken, title, body);

//         res.status(200).json({ message: "Push notification sent successfully" });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to send push notification" })
//     }
// }

// module.exports = {
//     sendFirebaseNotification
// }