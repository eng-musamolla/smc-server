require("dotenv").config();

const { connectToMongoDB } = require("./src/db");
const { initializeWebSocketServer } = require("./src/websocketServer");
const { initializeTCPServer } = require("./src/tcpServer");
const { startAPIServer } = require("./src/apiServer");



// Connect to MongoDB
connectToMongoDB();

// Initialize WebSocket Server
initializeWebSocketServer(process.env.SMC_NODE_ENV);

// Initialize TCP Server
initializeTCPServer();

// Start API Server
startAPIServer();