const express = require("express");

const router = express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const {
    createSession,
    getSessions,
    sendMessage,
    getMessages,
    deleteSession
} = require("../controllers/chatController");

router.use(authMiddleware);

router.post("/sessions", createSession);

router.get("/sessions", getSessions);

router.post(
    "/sessions/:id/messages",
    sendMessage
);

router.get(
    "/sessions/:id/messages",
    getMessages
);

router.delete(
    "/sessions/:id",
    deleteSession
);

module.exports = router;