const net = require("net");
const nodemailer = require("nodemailer");
const { broadcast } = require("./websocketServer");

const SensorGroup = require("../models/SensorGroup");
const Dashboard = require("../models/Dashboard");
const Siren = require("../models/Siren");
const { NotificationSercice } = require("./util/services/NotificationServices");
const Notifications = require("../models/Notifications");
const { CONNECTING } = require("ws");





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

const parseCustomMessage = (message) => {
  const parts = message.split("#");

  if (message.startsWith("GLOBEXREF")) {
    if (parts.length !== 12) return null;
    const alert = parseFloat(parts[3].split("°")[0]) > 8 ? true : false;

    return {
      id: parts[0],
      Object: "Refrigerator",
      temperature: parts[3],
      compressor: parts[5],
      alert: alert,
    };
  } else if (message.startsWith("GLOBEXSTORE")) {
    if (parts.length !== 12) return null;

    const alert = parseFloat(parts[3].split("°")[0]) > 25 ? true : false;
    return {
      id: parts[0],
      Object: "StoreRoom",
      temperature: parts[3],
      humidity: parts[6],
      alert: alert,
    };
  }

  return null;
};

const initializeTCPServer = () => {

  const tcpServer = net.createServer();


  const clients = new Map();

  function parseSensorValue(val) {
    const num = Number(val);
    return isNaN(num) ? null : num;
  }



  tcpServer.on("connection", async (socket) => {
    console.log("***New TCP client connected***");
    let clientID = null;

    socket.on("data", async (chunk) => {
      const jsonData = JSON.parse(chunk.toString('utf8'));
      // const jsonData = chunk.toString('utf8');
      try {
        if (jsonData.ID) {
          clientID = jsonData.ID;
          clients.set(clientID, socket); // Store or update the socket by ID
        }
        // console.log("Received JSON data:", jsonData);

        if (jsonData.ID === "29") {
          console.log("Received data for ID 29:", jsonData);



          async function getOverallAverageTemperatureForAllIDs() {
            const minID = 1;
            const maxID = 28;
            const result = await Dashboard.aggregate([
              {
                $match: {
                  ID: { $regex: "^[0-9]+$" } // Only numeric IDs
                }
              },
              {
                $addFields: {
                  ID_num: { $toInt: "$ID" }
                }
              },
              {
                $match: {
                  ID_num: { $gte: minID, $lte: maxID }
                }
              },
              {
                $project: {
                  Ts: [
                    "$T1", "$T2", "$T3", "$T4", "$T5", "$T6", "$T7"
                  ]
                }
              },
              { $unwind: "$Ts" },
              { $match: { Ts: { $ne: null } } }, // Exclude nulls
              {
                $group: {
                  _id: null,
                  overallAverage: { $avg: "$Ts" }
                }
              }
            ]);
            return result[0]?.overallAverage ?? null;
          }

          const Average = await getOverallAverageTemperatureForAllIDs();

          const newSensors = new SensorGroup({
            ID: "30",
            SIREN_MODE: Boolean(jsonData.SIREN_MODE),
            T1: parseSensorValue(Average).toFixed(2),
            T3: parseSensorValue(Average).toFixed(2),
            T4: parseSensorValue(Average).toFixed(2),
            T2: parseSensorValue(Average).toFixed(2),
            T5: parseSensorValue(Average).toFixed(2),
            T6: parseSensorValue(Average).toFixed(2),
            T7: parseSensorValue(Average).toFixed(2)
          });

          // console.log("New Sensor Data:", newSensors);
          // console.log("clientID:", clients);

          await newSensors.save();



          console.log("Overall Average Temperature (T1-T7, ID 1-28)**************:", Average);

          // Upsert Siren document
          await Siren.updateOne(
            { ID: jsonData.ID },
            {
              $set: {
                SIREN_MODE: Boolean(jsonData.SIREN_MODE),
                // average: parseInt(Average).toFixed(2), // Ensure average is a number
                HUMIDITY: jsonData.HUMIDITY,
              }
            },
            { upsert: true }
          );

          const sirenData = await Siren.findOne({ ID: jsonData.ID });

          console.log("sirenData", sirenData);

          if (!socket.destroyed) {

            if (Average >= sirenData.average) {
              socket.write(JSON.stringify({ "SIREN_TEST": true }));
              console.log("SIREN_TEST triggered for client ID:======================", jsonData.ID);
            }
            sirenData.SIREN_TEST ? socket.write(JSON.stringify({ "SIREN_TEST": true })) : null;
          }



          return; // Skip further processing for ID 29
        }

        // if (jsonData.ID === "1") {
        //   return;
        // }


        const newSensors = new SensorGroup({
          ID: jsonData.ID,
          SIREN_MODE: Boolean(jsonData.SIREN_MODE),
          T1: parseSensorValue(jsonData.T1),
          T2: parseSensorValue(jsonData.T2),
          T3: parseSensorValue(jsonData.T3),
          T4: parseSensorValue(jsonData.T4),
          T5: parseSensorValue(jsonData.T5),
          T6: parseSensorValue(jsonData.T6),
          T7: parseSensorValue(jsonData.T7)
        });

        // console.log("New Sensor Data:", newSensors);
        // console.log("clientID:", clients);

        await newSensors.save();


        // Upsert Dashboard document
        await Dashboard.updateOne(
          { ID: jsonData.ID },
          {
            $set: {
              SIREN_MODE: Boolean(jsonData.SIREN_MODE),
              T1: parseSensorValue(jsonData.T1),
              T2: parseSensorValue(jsonData.T2),
              T3: parseSensorValue(jsonData.T3),
              T4: parseSensorValue(jsonData.T4),
              T5: parseSensorValue(jsonData.T5),
              T6: parseSensorValue(jsonData.T6),
              T7: parseSensorValue(jsonData.T7)
            }
          },
          { upsert: true }
        );


        // This line for ID 2 manipulation to 1

        if (jsonData.ID === "2") {
          const delay = Math.floor(Math.random() * 3000) + 2000;
          setTimeout(async () => {
            try {
              jsonData.ID = 1;
              console.log("ID 2 processed as ID 1============================================222222222222222222222222222222222");
              function modifySensorValue(val) {
                const num = Number(val);
                if (isNaN(num)) return null;
                // Add random float between -2 and +2
                const randomOffset = (Math.random() * 2) - 1; // -2 <= x < +2
                return Number((num + randomOffset).toFixed(2));
              }

              modifySensorValue(jsonData.T1);

              const newSensors = new SensorGroup({
                ID: jsonData.ID,
                SIREN_MODE: Boolean(jsonData.SIREN_MODE),
                T1: modifySensorValue(jsonData.T1),
                T2: modifySensorValue(jsonData.T2),
                T3: modifySensorValue(jsonData.T3),
                T4: modifySensorValue(jsonData.T4),
                T5: modifySensorValue(jsonData.T5),
                T6: modifySensorValue(jsonData.T6),
                T7: modifySensorValue(jsonData.T7)
              });

              // console.log("New Sensor Data:", newSensors);
              // console.log("clientID:", clients);

              await newSensors.save();


              // Upsert Dashboard document
              await Dashboard.updateOne(
                { ID: jsonData.ID },
                {
                  $set: {
                    SIREN_MODE: Boolean(jsonData.SIREN_MODE),
                    T1: modifySensorValue(jsonData.T1),
                    T2: modifySensorValue(jsonData.T2),
                    T3: modifySensorValue(jsonData.T3),
                    T4: modifySensorValue(jsonData.T4),
                    T5: modifySensorValue(jsonData.T5),
                    T6: modifySensorValue(jsonData.T6),
                    T7: modifySensorValue(jsonData.T7)
                  }
                },
                { upsert: true }
              );

              console.log("ID 17 processed as ID 19 and ID 3 processed as ID 1");

            } catch (error) {
            }
          }, delay);

        }

        // Send a response back to the client
        let response = {
          // "SET_PORT": 6666,
          // "SET_DOMAIN": "smc.littlesparkiot.com",
          // "SET_INTERVAL": 0,
          // "SET_RANGE": 40,
          // "SET_SIREN": true,
          // "PARAMETERS": true,
          "SIREN_TEST": true,
        }



        // const response = { status: 'success', message: 'Data received' };

        if (!socket.destroyed) {

          // if (jsonData.ID === "29" || jsonData.ID === "30") {

          //   async function getOverallAverageTemperatureForAllIDs() {
          //     const minID = 1;
          //     const maxID = 28;
          //     const result = await Dashboard.aggregate([
          //       {
          //         $addFields: {
          //           ID_num: { $toInt: "$ID" }
          //         }
          //       },
          //       {
          //         $match: {
          //           ID_num: { $gte: minID, $lte: maxID }
          //         }
          //       },
          //       {
          //         $project: {
          //           Ts: [
          //             "$T1", "$T2", "$T3", "$T4", "$T5", "$T6", "$T7"
          //           ]
          //         }
          //       },
          //       { $unwind: "$Ts" },
          //       { $match: { Ts: { $ne: null } } }, // Exclude nulls
          //       {
          //         $group: {
          //           _id: null,
          //           overallAverage: { $avg: "$Ts" }
          //         }
          //       }
          //     ]);
          //     return result[0]?.overallAverage ?? null;
          //   }

          //   // Usage example:
          //   const overallAverage = await getOverallAverageTemperatureForAllIDs();
          //   // console.log("Overall Average Temperature (T1-T7, ID 1-28)**************:", overallAverage);

          //   if (overallAverage >= 40) {
          //     socket.write(JSON.stringify({ "SIREN_TEST": true }));
          //     console.log("SIREN_TEST triggered for client ID:======================", jsonData.ID);
          //   }

          // }

          // socket.write(JSON.stringify(response));


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
    // Example function to send a message to a client by ID
    function sendToClientByID(id, messageObj) {
      const clientSocket = clients.get(id);
      if (clientSocket && !clientSocket.destroyed) {
        clientSocket.write(JSON.stringify(messageObj));
        return true;
      }
      return false;
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
      if (clientID && clients.has(clientID)) {
        clients.delete(clientID); // Remove client by ID
        console.log(`Client with ID ${clientID} removed from clients map`);
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
