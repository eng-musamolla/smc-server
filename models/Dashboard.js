const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema(
  {
    ID: { type: String, required: true },
    // Object: { type: String, required: true },
    SIREN_MODE: { type: Boolean, required: true },
    T1: { type: Number, default: 0 },
    T2: { type: Number, default: 0 },
    T3: { type: Number, default: 0 },
    T4: { type: Number, default: 0 },
    T5: { type: Number, default: 0 },
    T6: { type: Number, default: 0 },
    T7: { type: Number, default: 0 },
    // ALERT: { type: Boolean, default: false },

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Dashboard", dataSchema);
