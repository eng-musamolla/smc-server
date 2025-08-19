const fs = require("fs");
const https = require("https");
const WS = require("ws");

const SensorGroup = require("../models/SensorGroup");
const Dashboard = require("../models/Dashboard");

// const Refrigerator = require("../models/Refrigerator");
// const StoreRoom = require("../models/SensorGroup");
// const DRefrigerator = require("../models/DRefrigerator");
// const DStoreRoom = require("../models/DStoreRoom");

let wsServer;

const initializeWebSocketServer = (env) => {
  if (env === "production") {
    const sslServerOptions = {
      cert: fs.readFileSync(process.env.SMC_SSL_CERT_PATH),
      key: fs.readFileSync(process.env.SMC_SSL_KEY_PATH)
    };

    const server = https.createServer(sslServerOptions);
    server.listen(process.env.SMC_WSS_PORT, () => {
      console.log(`Secure WebSocket server running on wss://localhost:${process.env.SMC_WSS_PORT}`);
    });

    wsServer = new WS.Server({ server });
  } else {
    // wsServer = new WS.Server({ port: process.env.SMC_WS_PORT });
    wsServer = new WS.Server({ port: process.env.SMC_WS_PORT });

    console.log(`WebSocket server running on ws://localhost:${process.env.SMC_WS_PORT}`);
  }

  wsServer.on('error', (err) => {
    console.error("WebSocket server error:", err);
  });

  wsServer.on("connection", async (ws) => {
    console.log("WebSocket client connected");


    const DashboardData = (await Dashboard.find().exec())
      .sort((a, b) => Number(a.ID) - Number(b.ID));
    if (!DashboardData || DashboardData.length === 0) {
      console.error("No dashboard data found");
      return;
    }

    ws.send(JSON.stringify({
      DashboardData
    }));

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      console.error("WebSocket client error:", err);
    });

    ws.on("message", async (message) => {
      console.log("Received message from WebSocket client:", message.toString("utf8"));

      const parsedMessage = JSON.parse(message);
      console.log("parsedMessage:", parsedMessage);

      if (parsedMessage.type === "logs") {
        const logs = await SensorGroup.find()
          .sort({ createdAt: -1 })
          .limit(parsedMessage.limit || 10)
          .skip(parsedMessage.skip || 0)
          .exec();

        ws.send(JSON.stringify({ Report: logs }));
      } else if (parsedMessage.type === "graph") {
        const graphData = await SensorGroup.find()
          .sort({ createdAt: -1 })
          .limit(parsedMessage.limit || 10)
          .skip(parsedMessage.skip || 0)
          .exec();

        ws.send(JSON.stringify({ Report: graphData }));
      }
      ws.send(parsedMessage);
    });
  });
};

const broadcast = (data) => {
  wsServer.clients.forEach((client) => {
    if (client.readyState === WS.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (err) {
        console.error("Failed to broadcast data:", err.message);
      }
    }
  });
};

module.exports = { initializeWebSocketServer, broadcast };