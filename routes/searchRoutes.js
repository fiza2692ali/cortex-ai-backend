const express = require("express");

const router = express.Router();

const {
    semanticSearch
} = require("../controllers/searchController");

const authMiddleware =
    require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Search documents using semantic similarity
 *     description: Finds relevant document chunks based on the meaning of a query.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 example: What are prompting best practices?
 *               topK:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 5
 *     responses:
 *       200:
 *         description: Search results returned successfully
 *       400:
 *         description: Invalid search request
 *       401:
 *         description: Authentication required
 */

router.post(
    "/",
    authMiddleware,
    semanticSearch
);


module.exports = router;