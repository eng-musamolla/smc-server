// const express = require('express');
// const router = express.Router();
// const { sendFirebaseNotification } = require('../controllers/FirebaseControllers');


// router.post('/send-notification', async (req, res) => {
//     try {
//         console.log("req.body", req.body);
//         sendFirebaseNotification(req, res);
//         res.status(200).json({ message: "Push notification sent successfully" });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to send push notification" })
//     }
// }
// );


// module.exports = router;