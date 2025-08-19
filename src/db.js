const mongoose = require("mongoose");

const connectToMongoDB = () => {
  mongoose
    .connect(process.env.SMC_MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
};

module.exports = { connectToMongoDB };