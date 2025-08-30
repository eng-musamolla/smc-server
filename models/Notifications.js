const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema(
  {
    token: { type: [String], required: false },
    email: { type: [String], required: false },
    emailNotification: { type: Boolean, default: false },
    pushNotification: { type: Boolean, default: false },
    smsNotification: { type: Boolean, default: false },
    phone: { type: String, default: "" }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Notifications", dataSchema);
