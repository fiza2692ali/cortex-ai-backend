const express = require("express");
const { healthCheck } = require("../controllers/healthController");

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health
 *     description: Checks whether the backend API is responding.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 */

router.get("/", healthCheck);

module.exports = router;