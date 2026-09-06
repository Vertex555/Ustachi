const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ustachi";

async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB ga ulandi:", MONGO_URI);
}

module.exports = { connectDB };