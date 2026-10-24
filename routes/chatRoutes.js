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

const quotaMiddleware = require(
    "../middleware/quotaMiddleware"
);

const {
    chatLimiter
} = require("../middleware/rateLimiter");

/**
 * @swagger
 * /api/chat/sessions:
 *   post:
 *     summary: Create a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Chat session created
 *       401:
 *         description: Authentication required
 *   get:
 *     summary: List chat sessions
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat sessions retrieved
 *       401:
 *         description: Authentication required
 *
 * /api/chat/sessions/{id}/messages:
 *   post:
 *     summary: Send a message to the AI assistant
 *     description: Generates a RAG response using accessible document context.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 4000
 *                 example: Summarize the key points of my documents.
 *     responses:
 *       200:
 *         description: AI response generated
 *       400:
 *         description: Invalid message
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit or message quota exceeded
 *   get:
 *     summary: Get messages from a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     responses:
 *       200:
 *         description: Chat messages retrieved
 *       401:
 *         description: Authentication required
 *
 * /api/chat/sessions/{id}:
 *   delete:
 *     summary: Delete a chat session
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat session ID
 *     responses:
 *       200:
 *         description: Chat session deleted
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Chat session not found
 */

router.use(authMiddleware);

router.post("/sessions", createSession);

router.get("/sessions", getSessions);

router.post(
    "/sessions/:id/messages",
    chatLimiter,
    quotaMiddleware("message"),
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