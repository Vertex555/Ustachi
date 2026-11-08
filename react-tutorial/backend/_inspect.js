const mongoose = require("mongoose");
const Chat = require("./src/models/Chat");
const Master = require("./src/models/Master");
const User = require("./src/models/User");
const Order = require("./src/models/Order");

(async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/ustachi");
    const masters = await Master.find().lean();
    console.log("=== MASTERS (" + masters.length + ") ===");
    masters.forEach((m) => {
      console.log(JSON.stringify({ _id: m._id.toString(), user: m.user ? m.user.toString() : null, name: m.name, phone: m.phone }));
    });

    const chats = await Chat.find().lean();
    console.log("\n=== CHATS (" + chats.length + ") ===");
    // map master id -> master.user
    const masterUser = {};
    masters.forEach((m) => { masterUser[m._id.toString()] = m.user ? m.user.toString() : null; });
    chats.forEach((c) => {
      const cu = c.user ? c.user.toString() : null;
      const cm = c.master ? c.master.toString() : null;
      const mu = masterUser[cm] || "?";
      const lastMsg = (c.messages && c.messages[c.messages.length - 1]);
      const lastSenderIsMaster = lastMsg && lastMsg.sender && mu && lastMsg.sender.toString() === mu;
      console.log(JSON.stringify({
        chat: c._id.toString(),
        user: cu,
        master: cm,
        masterUser: mu,
        msgs: (c.messages || []).length,
        lastFrom: lastMsg && lastMsg.sender ? lastMsg.sender.toString() : null,
        lastFromIsMaster: !!lastSenderIsMaster,
        last: lastMsg ? (lastMsg.text || "[img]") : null,
        order: c.order ? c.order.toString() : null,
      }));
    });

    // Contamination checks
    console.log("\n=== CROSS-CHECKS ===");
    // Master's own user id appearing as chat.user with a DIFFERENT master
    const masterIds = {};
    masters.forEach((m) => { masterIds[m._id.toString()] = true; });
    const suspect = chats.filter((c) => {
      const cu = c.user ? c.user.toString() : null;
      const cm = c.master ? c.master.toString() : null;
      return cu && masterUser[cm] && cu === masterUser[cm];
    });
    console.log("chats where user == master.user (self-chat?): " + suspect.length);
    // same user id in chats with multiple different masters
    const byUser = {};
    chats.forEach((c) => {
      const cu = c.user ? c.user.toString() : null;
      const cuu = c.user && c.master ? c.master.toString() : "-";
      if (!byUser[cu]) byUser[cu] = new Set();
      byUser[cu].add(cuu);
    });
    console.log("users with chat to 2+ different masters:");
    Object.keys(byUser).forEach((u) => { if (byUser[u].size > 1) console.log("  user " + u + " -> " + byUser[u].size + " masters"); });

    const users = await User.find().lean();
    console.log("\n=== USERS (" + users.length + ") ===");
    users.forEach((u) => {
      console.log(JSON.stringify({ _id: u._id.toString(), name: u.name, phone: u.phone, role: u.role }));
    });

    const orders = await Order.find().lean();
    console.log("\n=== ORDERS (" + orders.length + ") ===");
    orders.forEach((o) => {
      console.log(JSON.stringify({ user: o.user ? o.user.toString() : null, master: o.master ? o.master.toString() : null, status: o.status, id: o._id.toString() }));
    });
  } catch (e) {
    console.error("ERR", e.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();