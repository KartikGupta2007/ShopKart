const mongoose = require("mongoose");

const connectDB = async () => {
  const url = process.env.MONGO_URI;
  const uri = `${url}/${process.env.DB_NAME}`
  if (!uri) {
    throw new Error("MONGO_URI is not set in .env");
  }

  const connection = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${connection.connection.host}`);
};

module.exports = connectDB;
