const mongoose = require("mongoose");
const masterSchema = require("./masterSchema");

// Umumiy (global) ustalar katalogi — barcha foydalanuvchilar ko'ra oladi.
// O'z profillari va buyurtmalar per-user bazalarda saqlanadi.
module.exports = mongoose.model("Master", masterSchema);