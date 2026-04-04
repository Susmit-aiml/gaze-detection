const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error("MONGO_URI is missing in backend/.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB connected successfully: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.log("Quick checks:");
    console.log("1) Confirm username/password in MONGO_URI are correct");
    console.log("2) Whitelist your IP in MongoDB Atlas Network Access");
    console.log("3) Ensure Database User has readWrite permission");
    console.log("4) Keep database name in URI, e.g. /gaze_detection");
    process.exit(1);
  }
};

module.exports = connectDB;
