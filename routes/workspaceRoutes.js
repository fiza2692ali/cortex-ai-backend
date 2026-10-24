const express = require("express");
const fs = require("fs/promises");

const router = express.Router();

const {
    semanticSearch
} = require("../controllers/searchController");

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const {
    createSession,
    getMessages,
    sendMessage,
    deleteSession
} = require("../controllers/chatController");

const {
    requireTeamPlan,
    requireWorkspaceMember,
    requireWorkspaceOwner
} = require("../middleware/workspaceMiddleware");

const {
    createWorkspace,
    getWorkspaces,
    getWorkspace,
    inviteMember,
    removeMember,
    getWorkspaceDocuments,
    getWorkspaceChatSessions
} = require("../controllers/workspaceController");

const {
    uploadDocument,
    deleteDocument
} = require("../controllers/documentController");

const upload = require("../middleware/uploadMiddleware");
const quotaMiddleware = require("../middleware/quotaMiddleware");
const storageQuotaMiddleware = require(
    "../middleware/storageQuotaMiddleware"
);

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a workspace
 *     description: Creates a new workspace. Requires an eligible Team plan.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: AI Research Team
 *     responses:
 *       201:
 *         description: Workspace created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Team plan required
 *   get:
 *     summary: List my workspaces
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspaces retrieved
 *
 * /api/workspaces/{id}:
 *   get:
 *     summary: Get workspace details
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace details retrieved
 *       403:
 *         description: Workspace membership required
 *       404:
 *         description: Workspace not found
 *
 * /api/workspaces/{id}/invite:
 *   post:
 *     summary: Invite a workspace member
 *     description: Only workspace owners can invite members.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: teammate@example.com
 *     responses:
 *       200:
 *         description: Member invitation processed
 *       403:
 *         description: Workspace owner permission required
 *
 * /api/workspaces/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a workspace member
 *     description: Only workspace owners can remove members.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       403:
 *         description: Workspace owner permission required
 *
 * /api/workspaces/{id}/documents:
 *   get:
 *     summary: List workspace documents
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace documents retrieved
 *   post:
 *     summary: Upload a workspace document
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Workspace document uploaded
 *       400:
 *         description: Invalid upload
 *
 * /api/workspaces/{id}/documents/{documentId}:
 *   delete:
 *     summary: Delete a workspace document
 *     description: Only workspace owners can delete workspace documents.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace document deleted
 *       403:
 *         description: Workspace owner permission required
 *
 * /api/workspaces/{id}/search:
 *   post:
 *     summary: Search workspace documents
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: Summarize our project requirements
 *               topK:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 5
 *     responses:
 *       200:
 *         description: Workspace search results returned
 *
 * /api/workspaces/{id}/chat-sessions:
 *   get:
 *     summary: List workspace chat sessions
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace chat sessions retrieved
 *   post:
 *     summary: Create a workspace chat session
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Workspace chat session created
 *
 * /api/workspaces/{id}/chat-sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a workspace chat message
 *     description: Uses the shared Team message quota.
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: What are the main findings?
 *     responses:
 *       200:
 *         description: AI response returned
 *       429:
 *         description: Message quota exceeded
 *   get:
 *     summary: Get workspace chat messages
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat messages retrieved
 *
 * /api/workspaces/{id}/chat-sessions/{sessionId}:
 *   delete:
 *     summary: Delete a workspace chat session
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace chat session deleted
 */

router.use(authMiddleware);

// Create and list workspaces
router.post("/", requireTeamPlan, createWorkspace);
router.get("/", getWorkspaces);

// Workspace details
router.get(
    "/:id",
    requireWorkspaceMember,
    getWorkspace
);

// Invite member
router.post(
    "/:id/invite",
    requireWorkspaceMember,
    requireWorkspaceOwner,
    inviteMember
);

// Remove member
router.delete(
    "/:id/members/:userId",
    requireWorkspaceMember,
    requireWorkspaceOwner,
    removeMember
);

// List workspace documents
router.get(
    "/:id/documents",
    requireWorkspaceMember,
    getWorkspaceDocuments
);

// List workspace chat sessions
router.get(
    "/:id/chat-sessions",
    requireWorkspaceMember,
    getWorkspaceChatSessions
);

// Upload document to workspace
router.post(
    "/:id/documents",
    requireWorkspaceMember,
    quotaMiddleware("document"),
    upload.single("file"),
    storageQuotaMiddleware,
    uploadDocument
);

// Delete workspace document - owner only
router.delete(
    "/:id/documents/:documentId",
    requireWorkspaceMember,
    requireWorkspaceOwner,
    (req, res, next) => {
        req.params.id = req.params.documentId;
        deleteDocument(req, res, next);
    }
);

// Search documents inside a workspace
router.post(
    "/:id/search",
    requireWorkspaceMember,
    semanticSearch
);

// Create a shared chat session
router.post(
    "/:id/chat-sessions",
    requireWorkspaceMember,
    createSession
);

// Send a message using shared Team quota
router.post(
    "/:id/chat-sessions/:sessionId/messages",
    requireWorkspaceMember,
    quotaMiddleware("message"),
    sendMessage
);

// View messages in a shared chat session
router.get(
    "/:id/chat-sessions/:sessionId/messages",
    requireWorkspaceMember,
    getMessages
);

// Delete a shared chat session
router.delete(
    "/:id/chat-sessions/:sessionId",
    requireWorkspaceMember,
    deleteSession
);

// Clean up failed uploads, including Multer errors
router.use(async (err, req, res, next) => {
    if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
    }

    try {
        await req.storageReservation?.refund();
        await req.quotaReservation?.refund();
    } catch (refundError) {
        console.error(
            "Workspace upload refund error:",
            refundError
        );
    }

    next(err);
});

module.exports = router;