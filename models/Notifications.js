const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema(
  {
    token: { type: [String], required: true },
    email: { type: [String], required: true },
    emailNotification: { type: Boolean, default: false },
    pushNotification: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Notifications", dataSchema);
