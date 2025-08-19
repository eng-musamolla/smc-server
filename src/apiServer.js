const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
// const firebaseRouter = require("./routes/FirebaseRoute");
const SensorGroup = require("../models/SensorGroup");
const Dashboard = require("../models/Dashboard");
const Notifications = require("../models/Notifications");
const AuthLogin = require("./util/middlewares/authLogin");
const ChangePassword = require("./util/middlewares/changePassword");


const app = express();
app.use(express.json());
app.use(cors());


app.post("/api/notifications/save", async (req, res) => {
  try {
    const { token, email, emailNotification, pushNotification } = req.body;

    // Validate the input
    if (!token && !email) {
      return res.status(400).json({ error: "At least one of deviceToken or email is required" });
    }

    // Check if a notification already exists
    const existingNotification = await Notifications.findOne({
      $or: [{ token }, { email }],
    });

    if (existingNotification) {
      // If it exists, reject the request
      return res.status(200).json({ message: "Notification already exists" });
    }

    // Save to the database
    const notification = new Notifications({
      token,
      email,
      emailNotification: (email || emailNotification) ? true : false, // Default to true if not provided
      pushNotification: (token || pushNotification) ? true : false, // Default to true if not provided
    });

    await notification.save();

    res.status(201).json({ message: "Notification data saved successfully" });
  } catch (error) {
    console.error("Error saving notification data:", error.message);
    res.status(500).json({ error: "Failed to save notification data" });
  }
});
app.post("/authLogin", AuthLogin);
app.patch("/changePassword", ChangePassword);

// app.get("/api/refrigerators", async (req, res) => {
//   const startDate =
//     req.query.startDate || new Date().toISOString().split("T")[0];
//   const endDate = req.query.endDate || "";
//   const Interval = parseInt(req.query.Interval) || 1; // Default interval 1 minute
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 25;
//   const skip = (page - 1) * limit;
//   const id = req.query.id || "";

//   try {
//     const matchStage = { $match: id === "All" ? {} : { id: id } };

//     if (startDate) {
//       matchStage.$match.createdAt = { $gte: new Date(startDate) };
//     }
//     if (endDate) {
//       if (!matchStage.$match.createdAt) {
//         matchStage.$match.createdAt = {};
//       }
//       matchStage.$match.createdAt.$lte = new Date(endDate);
//     }

//     const aggregationPipeline = [
//       matchStage,
//       {
//         $project: {
//           createdAtTruncated: {
//             $dateTrunc: {
//               date: "$createdAt",
//               unit: "minute",
//               binSize: Interval, // Group by interval (1, 5, 10, etc.)
//             },
//           },
//           id: 1,
//           type: 1,
//           createdAt: 1,
//           compressor: 1,
//           temperature: 1,
//           alert: 1,
//         },
//       },
//       {
//         $group: {
//           _id: {
//             id: "$id",
//             intervalTime: "$createdAtTruncated", // Group by both ID and Interval
//           },
//           data: { $first: "$$ROOT" }, // Pick first document of each group
//         },
//       },
//       {
//         $sort: { "data.createdAt": 1 }, // Sort by createdAt after interval grouping
//       },
//       {
//         $group: {
//           _id: "$_id.id", // Now group by id
//           report: { $push: "$data" }, // Push grouped data into report array (sorted)
//           total: { $sum: 1 }, // Count total documents in group
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           total: 1,
//           report: {
//             $slice: [
//               {
//                 $sortArray: {
//                   input: "$report",
//                   sortBy: { createdAt: 1 }, // Sort inside the report array by createdAt
//                 },
//               },
//               skip,
//               limit,
//             ],
//           },
//         },
//       },
//       { $sort: { _id: 1 } }, // Sort by id
//     ];

//     const refrigerators = await Refrigerator.aggregate(
//       aggregationPipeline
//     ).exec();
//     const Total = refrigerators[0]?.total || 0;

//     res.json({ refrigerators, Total });
//   } catch (err) {
//     console.error("Error fetching refrigerators:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

app.get("/api/SensorGroup", async (req, res) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const Interval = parseInt(req.query.Interval) || 1;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const skip = (page - 1) * limit;
  const id = req.query.id || "";

  try {
    // Build match object
    const match = {};
    if (id && id !== "AVERAGE") match.ID = id;
    if (startDate) match.createdAt = { $gte: startDate };
    if (endDate) {
      match.createdAt = match.createdAt || {};
      match.createdAt.$lte = endDate;
    }

    const aggregationPipeline = [
      { $match: match },
      {
        $project: {
          ID: 1,
          SIREN_MODE: 1,
          createdAt: 1,
          T1: 1, T2: 1, T3: 1, T4: 1, T5: 1, T6: 1, T7: 1,
          createdAtTruncated: {
            $dateTrunc: {
              date: "$createdAt",
              unit: "minute",
              binSize: Interval,
            },
          },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await SensorGroup.aggregate(aggregationPipeline).exec();
    const sensorGroup = result[0]?.data || [];
    const Total = result[0]?.metadata[0]?.total || 0;

    res.json({ sensorGroup, Total });
  } catch (err) {
    console.error("Error fetching sensorGroups:", err);
    res.status(500).json({ error: err.message });
  }
});




app.get("/api/dashboard", async (req, res) => {
  try {
    // const DashboardData = (await Dashboard.find().exec())
    //   .sort((a, b) => Number(a.ID) - Number(b.ID));
    const minID = 1;
    const maxID = 28;

    const DashboardData = await Dashboard.aggregate([
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
      { $sort: { ID_num: 1 } }
    ]);
    // console.log(DashboardData.map(d => d.ID)); // For debugging



    res.json(DashboardData);
  } catch (err) {
    console.error("Error fetching DashboardData:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/summary", async (req, res) => {
  const startDate =
    req.query.startDate || new Date().toISOString().split("T")[0];
  const endDate = req.query.endDate || "";
  const Interval = parseInt(req.query.Interval) || 60; // Default interval 60 minute
  // const page = parseInt(req.query.page) || 1;
  // const limit = parseInt(req.query.limit) || 25;
  // const skip = (page - 1) * limit;

  try {
    const matchStage = { $match: {} };

    if (startDate) {
      matchStage.$match.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (!matchStage.$match.createdAt) {
        matchStage.$match.createdAt = {};
      }
      matchStage.$match.createdAt.$lte = new Date(endDate);
    }

    const sensorAggregationPipeline = [
      matchStage,
      {
        $addFields: {
          temperatureNumeric: {
            $convert: {
              input: {
                $trim: {
                  input: {
                    $replaceAll: {
                      input: "$temperature",
                      find: "°C",
                      replacement: "",
                    },
                  },
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
          humidityNumeric: {
            $convert: {
              input: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ["$humidity", "00"] },
                      { $eq: ["$humidity", ""] },
                    ],
                  }, // Handle empty or zero
                  then: "0",
                  else: {
                    $trim: {
                      input: {
                        $replaceAll: {
                          input: "$humidity",
                          find: "%",
                          replacement: "", // Remove '%' symbol
                        },
                      },
                    },
                  },
                },
              },
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      {
        $project: {
          createdAtTruncated: {
            $dateTrunc: {
              date: "$createdAt",
              unit: "minute",
              binSize: Interval, // Group by interval (1, 5, 10, etc.)
            },
          },
          id: 1,
          createdAt: 1,
          temperature: "$temperatureNumeric",
          humidity: "$humidityNumeric",
          alert: 1,
        },
      },
      {
        $group: {
          _id: {
            id: "$id",
            intervalTime: "$createdAtTruncated", // Group by both ID and Interval
          },
          data: { $first: "$$ROOT" }, // Pick first document of each group
        },
      },
      {
        $sort: { "data.createdAt": 1 }, // Sort by createdAt after interval grouping
      },
      {
        $group: {
          _id: "$_id.id", // Now group by id
          averageTemperature: { $avg: "$data.temperature" }, // Calculate average temperature
          totalAlerts: {
            $sum: {
              $cond: [
                { $gt: ["$data.temperature", 25] }, // Only count alerts when temperature > 25
                1,
                0,
              ],
            },
          }, // Count total alerts
          averageHumidity: { $avg: "$data.humidity" }, // Calculate average humidity
          total: { $sum: 1 }, // Count total documents in group
        },
      },
      {
        $project: {
          _id: 1,
          averageTemperature: { $round: ["$averageTemperature", 2] }, // ✅ Now round properly
          averageHumidity: { $round: ["$averageHumidity", 2] }, // ✅ Now round properly
          // averageHumidity: 1,
          totalAlerts: 1,
          total: 1,
        },
      },
      { $sort: { _id: 1 } }, // Sort by id
    ];

    // const refAggregationPipeline = [
    //   matchStage,
    //   {
    //     $addFields: {
    //       temperatureNumeric: {
    //         $convert: {
    //           input: {
    //             $trim: {
    //               input: {
    //                 $replaceAll: {
    //                   input: "$temperature",
    //                   find: "°C",
    //                   replacement: "",
    //                 },
    //               },
    //             },
    //           },
    //           to: "double",
    //           onError: 0,
    //           onNull: 0,
    //         },
    //       },
    //       compressorNumeric: {
    //         $convert: {
    //           input: "$compressor",
    //           to: "double",
    //           onError: 0,
    //           onNull: 0,
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $project: {
    //       createdAtTruncated: {
    //         $dateTrunc: {
    //           date: "$createdAt",
    //           unit: "minute",
    //           binSize: Interval, // Group by interval (1, 5, 10, etc.)
    //         },
    //       },
    //       id: 1,
    //       createdAt: 1,
    //       temperature: "$temperatureNumeric",
    //       compressorNumeric: 1,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: {
    //         id: "$id",
    //         intervalTime: "$createdAtTruncated", // Group by both ID and Interval
    //       },
    //       data: { $first: "$$ROOT" }, // Pick first document of each group
    //     },
    //   },
    //   {
    //     $sort: { "data.createdAt": 1 }, // Sort by createdAt after interval grouping
    //   },
    //   {
    //     $group: {
    //       _id: "$_id.id", // Now group by id
    //       averageTemperature: { $avg: "$data.temperature" }, // Calculate average temperature
    //       totalAlerts: {
    //         $sum: {
    //           $cond: [
    //             { $gt: ["$data.temperature", 8] }, // Only count alerts when temperature > 25
    //             1,
    //             0,
    //           ],
    //         },
    //       }, // Count total alerts
    //       compressorOnCount: { $sum: "$data.compressorNumeric" },
    //       compressorOnDuration: {
    //         $sum: {
    //           $cond: [
    //             { $gt: ["$data.compressorNumeric", 0] }, // Only count when compressor is on
    //             { $subtract: ["$data.createdAt", "$data.createdAtTruncated"] },
    //             0,
    //           ],
    //         },
    //       }, // Sum duration when compressor is on
    //       total: { $sum: 1 }, // Count total documents in group
    //     },
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       compressorOnCount: 1,
    //       compressorOnDuration: {
    //         $round: [
    //           {
    //             $divide: [
    //               "$compressorOnDuration",
    //               1000 * 60, // Convert milliseconds to minutes
    //             ],
    //           },
    //           2, // Round to 2 decimal places
    //         ],
    //       },
    //       averageTemperature: { $round: ["$averageTemperature", 2] },
    //       totalAlerts: 1,
    //       total: 1,
    //     },
    //   },
    //   { $sort: { _id: 1 } }, // Sort by id
    // ];

    // const summaryRefrigerator = await Refrigerator.aggregate(
    //   refAggregationPipeline
    // ).exec();
    const summarySensorGroup = await SensorGroup.aggregate(
      sensorAggregationPipeline
    ).exec();

    res.json({
      summary: [...summarySensorGroup],
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
    res.status(500).json({ error: err.message });
  }
});

const startAPIServer = () => {
  const port = process.env.SMC_API_PORT || 3000;

  if (process.env.SMC_NODE_ENV === "production") {
    const httpsOptions = {
      key: fs.readFileSync(process.env.SMC_SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SMC_SSL_CERT_PATH),
    };

    https
      .createServer(httpsOptions, app)
      .listen(port, () => {
        console.log(`API server running on port ${port} (HTTPS - Production)`);
      })
      .on("error", (err) => {
        console.error("Failed to start API server:", err);
      });
  } else {
    app
      .listen(port, () => {
        console.log(`API server running on port ${port} (HTTP - Development)`);
      })
      .on("error", (err) => {
        console.error("Failed to start API server:", err);
      });
  }
};

module.exports = { startAPIServer };
