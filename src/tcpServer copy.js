const net = require("net");
const nodemailer = require("nodemailer");
const { broadcast } = require("./websocketServer");

const SensorGroup = require("../models/SensorGroup");
const Dashboard = require("../models/Dashboard");
const { NotificationSercice } = require("./util/services/NotificationServices");
const Notifications = require("../models/Notifications");





// Function to send email notification
const sendEmailNotification = async (subject, message, recipients) => {
  try {
    await transporter.sendMail({
      from: process.env.SMC_EMAIL_USER,
      to: recipients.join(","), // Join all email addresses into a single string separated by commas
      subject: subject,
      html: message, // Send as HTML
    });
    console.log("Email notification sent to:", recipients);
  } catch (error) {
    console.error("Failed to send email notification:", error.message);
  }
};

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email service provider
  // host: "mail.chs.ac.bd",
  // port: 465, // replace with your SMTP port
  // secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMC_EMAIL_USER, // Your email address
    pass: process.env.SMC_EMAIL_PASS, // Your email password or app-specific password
  },
});


const initializeTCPServer = () => {

  const tcpServer = net.createServer();
  const clients = [];

  let someId = 200;

  tcpServer.on("connection", async (socket) => {
    // console.log("***New TCP client connected***");

    socket.on("data", function handleInitialData(chunk) {
      try {
        const jsonData = JSON.parse(chunk.toString('utf8'));
        if (jsonData.id) {
          clients.push({ socket: socket, ID: jsonData.id });
          // Remove this handler after first use to avoid duplicate pushes
          socket.removeListener("data", handleInitialData);
        } else {
          // If no id, fallback to incrementing someId
          clients.push({ socket: socket, ID: someId++ });
          socket.removeListener("data", handleInitialData);
        }
      } catch (e) {
        // If parsing fails, fallback to incrementing someId
        clients.push({ socket: socket, ID: someId++ });
        socket.removeListener("data", handleInitialData);
      }
    });

    socket.on("data", async (chunk) => {
      const jsonData = JSON.parse(chunk.toString('utf8'));
      try {
        console.log("Received JSON data:", jsonData);

        // Process the JSON data as needed
        // Example: broadcast the data to WebSocket clients
        // broadcast(jsonData);

        // Send a response back to the client
        let response = {
          // "SET_PORT": 6666,
          // "SET_DOMAIN": "smc.littlesparkiot.com",
          // "SET_INTERVAL": 0,
          // "SET_RANGE": 30,
          // "SET_SIREN": true,
          "PARAMETERS": true,
          // "SIREN_TEST": true,
        }



        // const response = { status: 'success', message: 'Data received' };

        if (!socket.destroyed) {

          if (jsonData.EB === true) {
            response.SIREN = true;

            console.log("SIREN is true");
          } else if (jsonData.EB === false) {
            response.SIREN = false;
            console.log("SIREN is true");
          }

          // socket.write(JSON.stringify(response));

          // console.log(response);

        }
      } catch (error) {
        console.error("Failed to parse JSON data:", error);

        // Send an error response back to the client
        const response = { status: 'error', message: 'Failed to parse JSON data' };
        if (!socket.destroyed) {
          socket.write(JSON.stringify(response));
        }
      }
    });

    // Send message to a specific client by ID
    console.log("Sending message to a specific client...", clients);

    const targetClientId = 0; // Replace with the desired client ID
    const targetClient = clients.find(clientObj => clientObj.ID === targetClientId);

    if (targetClient && targetClient.socket && !targetClient.socket.destroyed) {
      try {
        targetClient.socket.write(JSON.stringify({ message: "Message to specific client" }));
      } catch (err) {
        console.error("Failed to send message to specific client:", err.message);
      }
    }

    // try {
    //   const data = parseCustomMessage(messages);
    //   // console.log("messages:", messages);
    //   if (!data) return;

    //   if (data.Object === "Refrigerator") {
    //     const newData = new Refrigerator({
    //       id: data.id,
    //       temperature: data.temperature,
    //       compressor: data.compressor,
    //       alert: data.alert,
    //     });
    //     await newData.save();

    //     const updatedData = await DRefrigerator.updateOne(
    //       { id: data.id },
    //       {
    //         temperature: data.temperature,
    //         compressor: data.compressor,
    //         alert: data.alert,
    //       }
    //     ).exec();

    //     if (data.alert) {

    //       let emailNotifications = [];
    //       // let pushNotifications = [];
    //       // =============================================================== *************************************************

    //       try {
    //         const aggregationResult = await Notifications.aggregate([
    //           {
    //             $facet: {
    //               emailNotifications: [
    //                 { $match: { emailNotification: true } },
    //                 { $group: { _id: null, emails: { $addToSet: "$email" } } },
    //                 { $project: { _id: 0, emails: 1 } },
    //               ],
    //               // pushNotifications: [
    //               //   { $match: { pushNotification: true } },
    //               //   { $group: { _id: null, tokens: { $addToSet: "$token" } } },
    //               //   { $project: { _id: 0, tokens: 1 } },
    //               // ],
    //             },
    //           },
    //         ]);

    //         emailNotifications = aggregationResult[0]?.emailNotifications[0]?.emails || [];
    //         // pushNotifications = aggregationResult[0]?.pushNotifications[0]?.tokens || [];

    //       } catch (error) {
    //         console.error("Error collecting notifications:", error.message);
    //       }


    //       // emailNotifications.length > 0 && (
    //       //   sendEmailNotification(
    //       //     "Refrigerator Alert",
    //       //     `
    //       //       <div style="font-family: Arial, sans-serif; color: #b00020;">
    //       //         <h3 style="color: #d32f2f;"><u>ALERT: REFRIGERATOR TEMPERATURE</u></h3>
    //       //         <p><strong>Warning:</strong> <span style="color: red;">High temperature detected</span> in <strong>Globex Refrigerator-${data.id.slice(-2)}</strong>.</p>
    //       //         <p><strong>Current Temperature:</strong> <span style="font-size: 20px;">${data.temperature}</span></p>
    //       //         <p><strong>Compressor Status:</strong> <span style="font-size: 20px;">${data.compressor}</span></p>
    //       //         <p style="color: #d32f2f;"><strong>Immediate attention is required to prevent spoilage.</strong></p>
    //       //         <p><a href="https://globex.littlesparkiot.com/" target="_blank" style="color: #1e88e5; text-decoration: none;">Click here View in Details</a></p>

    //       //       </div>
    //       //     `,
    //       //     emailNotifications

    //       //   ))

    //       // pushNotifications.length > 0 && (
    //       //   NotificationSercice(
    //       //     pushNotifications,
    //       //     "Refrigerator Alert",
    //       //     `High temperature detected in Globex Refrigerator-${data.id.slice(-2)}. Current temperature: ${data.temperature}. Immediate attention is required.`,
    //       //     "refrigerator-alerts" // Replace with your topic name
    //       //   ))

    //       // console.log("alert Refrigerator", data.temperature);
    //     }

    //     console.log(data.id, "updatedData:", updatedData.modifiedCount);

    //     if (updatedData.modifiedCount > 0) {
    //       broadcast({ RefrigeratorData: await Dashboard.find().exec() });
    //     }
    //   } else if (data.Object === "StoreRoom") {
    //     const newData = new StoreRoom({
    //       id: data.id,
    //       temperature: data.temperature,
    //       humidity: data.humidity,
    //       alert: data.alert,
    //     });
    //     await newData.save();

    //     const updatedData = await DStoreRoom.updateOne(
    //       { id: data.id },
    //       {
    //         temperature: data.temperature,
    //         humidity: data.humidity,
    //         alert: data.alert,
    //       }
    //     ).exec();

    //     console.log(data.id, "updatedData:", updatedData.modifiedCount);
    //     if (data.id.startsWith("GLOBEXSTORE0AVE") && data.alert) {

    //       let emailNotifications = [];
    //       // let pushNotifications = [];
    //       try {
    //         const aggregationResult = await Notifications.aggregate([
    //           {
    //             $facet: {
    //               emailNotifications: [
    //                 { $match: { emailNotification: true } },
    //                 { $group: { _id: null, emails: { $addToSet: "$email" } } },
    //                 { $project: { _id: 0, emails: 1 } },
    //               ],
    //               // pushNotifications: [
    //               //   { $match: { pushNotification: true } },
    //               //   { $group: { _id: null, tokens: { $addToSet: "$token" } } },
    //               //   { $project: { _id: 0, tokens: 1 } },
    //               // ],
    //             },
    //           },
    //         ]);

    //         emailNotifications = aggregationResult[0]?.emailNotifications[0]?.emails || [];
    //         // pushNotifications = aggregationResult[0]?.pushNotifications[0]?.tokens || [];

    //       } catch (error) {
    //         console.error("Error collecting notifications:", error.message);
    //       }

    //       emailNotifications.length > 0 && (
    //         sendEmailNotification(
    //           "StoreRoom Alert",
    //           `
    //           <div style="font-family: Arial, sans-serif; color: #b00020;">
    //             <h3 style="color: #d32f2f;"><u>ALERT: AVERAGE STOREROOM TEMPERATURE</u></h3>
    //             <p><strong>Warning:</strong> The average storeroom temperature has <span style="color: red;">exceeded</span> the safe limit.</p>
    //             <p><strong>Current Temperature:</strong> <span style="font-size: 20px;">${data.temperature}</span></p>
    //             <p style="color: #d32f2f;"><strong>Immediate action is required.</strong></p>
    //             <p><a href="https://globex.littlesparkiot.com/" target="_blank" style="color: #1e88e5; text-decoration: none;">Click here View in Details</a></p>

    //           </div>
    //         `,
    //           emailNotifications
    //         ))

    //       // console.log("pushNotifications", pushNotifications);

    //       // Send push notification
    //       //   pushNotifications.length > 0 && (

    //       //     pushNotifications.forEach((token) => {
    //       //       try {
    //       //         NotificationSercice(
    //       //           token[0],
    //       //           "StoreRoom Alert",
    //       //           `The average storeroom temperature has exceeded the safe limit. Current temperature: ${data.id}. Immediate action is required.`,
    //       //         )
    //       //       } catch (error) {
    //       //         console.error("Failed to send push notification:", error);
    //       //       }
    //       //     }
    //       //     ))
    //     }
    //     if (updatedData.modifiedCount > 0) {
    //       broadcast({ Dashboarddata: await Dashboard.find().exec() });
    //     }
    //   }
    // } catch (error) {
    //   console.error("Failed to process message:", error.message);
    // }

    // =============================================================== *************************************************

    socket.on("end", () => {
      console.log("### TCP client disconnected ###");
      const index = clients.indexOf(socket);
      if (index !== -1) {
        console.log("Client removed from the clients array");
        clients.splice(index, 1);  // Remove the client from the list
      }
    });

    socket.on("error", (err) => {
      if (err.code === 'EPIPE') {
        console.error("TCP client disconnected before response could be sent");
      } else if (err.code === 'ECONNRESET') {
        console.error("TCP client connection reset by peer");
      } else {
        console.error("TCP client error:", err);
      }
    });
  });

  tcpServer.listen(process.env.SMC_TCP_PORT, () => {
    console.log(`TCP server running on port ${process.env.SMC_TCP_PORT}`);
  });
};

module.exports = { initializeTCPServer };
