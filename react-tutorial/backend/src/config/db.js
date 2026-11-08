const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ustachi";

// Keng tarqalgan so'rovlarni tezlashtiradigan indekslar.
// Model kolleksiya nomlari: Order -> Orders, Master -> Masters, Chat -> Chats,
// Feedback -> Feedbacks.
async function ensureIndexes() {
  const db = mongoose.connection.db;
  const jobs = [
    db.collection("orders").createIndex({ master: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ user: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ status: 1, createdAt: -1 }),
    db.collection("feedbacks").createIndex({ user: 1, createdAt: -1 }),
    db.collection("feedbacks").createIndex({ status: 1, createdAt: -1 }),
    db.collection("chats").createIndex({ master: 1, lastActivity: -1 }),
    db.collection("chats").createIndex({ user: 1, lastActivity: -1 }),
    db.collection("masters").createIndex({ rating: -1 }),
    db.collection("masters").createIndex({ devices: 1, rating: -1 }),
  ];
  await Promise.all(jobs.map((p) => Promise.resolve(p)));
  console.log("MongoDB indekslar tayyorlandi");
}

async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB ga ulandi:", MONGO_URI);
  await ensureIndexes();
}

module.exports = { connectDB };