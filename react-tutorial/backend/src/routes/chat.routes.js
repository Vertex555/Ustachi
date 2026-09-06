const router = require("express").Router();

const { authRequired } = require("../middleware/auth");
const { chatLimiter, chatMessageLimiter } = require("../middleware/rateLimit");
const chat = require("../controllers/chat.controller");

router.get("/my", authRequired, chatLimiter, chat.myChats);
router.post("/read", authRequired, chatLimiter, chat.readAll);
router.get("/open/:peerType/:peerId", authRequired, chatLimiter, chat.openWithPeer);
router.get("/:id", authRequired, chatLimiter, chat.messages);
router.post("/:id/messages", authRequired, chatMessageLimiter, chat.sendMessage);

module.exports = router;
