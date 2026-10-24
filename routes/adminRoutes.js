const express = require("express");
const router = express.Router();

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const adminMiddleware = require(
    "../middleware/adminMiddleware"
);

const {
    getUsers,
    getWorkspaces,
    suspendUser,
    getAnalytics
} = require("../controllers/adminController");

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *
 * /api/admin/workspaces:
 *   get:
 *     summary: Get all workspaces
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspaces retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *
 * /api/admin/users/{id}/suspend:
 *   patch:
 *     summary: Suspend a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User suspension updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *
 * /api/admin/analytics:
 *   get:
 *     summary: Get platform analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform analytics retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 */

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", getUsers);
router.get("/workspaces", getWorkspaces);
router.patch("/users/:id/suspend", suspendUser);
router.get("/analytics", getAnalytics);

module.exports = router;