const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema(
  {
    ID: { type: String },
    SIREN_MODE: { type: Boolean },
    RANGE: { Min: { type: Number, default: 0 }, Max: { type: Number, default: 40 } },
    SET_SIREN: { type: Boolean, default: true },
    SIREN_TEST: { type: Boolean, default: false },
    SET_INTERVAL: { type: Number, default: 1000 },
    AVERAGE: { type: Number },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Siren", dataSchema);


// "SET_PORT": 6666,
// "SET_DOMAIN": "smc.littlesparkiot.com",
// "SET_INTERVAL": 0,
// "SET_RANGE": 40,
// "SET_SIREN": true,
// "PARAMETERS": true,
// "SIREN_TEST": true,
