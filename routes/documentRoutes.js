
const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const quotaMiddleware = require(
    "../middleware/quotaMiddleware"
);

const storageQuotaMiddleware = require(
    "../middleware/storageQuotaMiddleware"
);

const {
    uploadDocument,
    getDocuments,
    getDocumentById,
    deleteDocument
} = require("../controllers/documentController");


// Helper: Refund quota reservations after a failed upload
async function refundUploadReservations(req) {
    if (req.storageReservation) {
        await req.storageReservation.refund();
    }

    if (req.quotaReservation) {
        await req.quotaReservation.refund();
    }
}

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a document
 *     description: Upload a document for processing and semantic search.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *       201:
 *         description: Document created successfully
 *       400:
 *         description: Invalid file or request
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Upload quota exceeded
 *
 *   get:
 *     summary: Get all documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       401:
 *         description: Authentication required
 *
 * /api/documents/{id}:
 *   get:
 *     summary: Get a document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Document not found
 *
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Document not found
 */

// 1. Upload a document
router.post(
    "/",
    authMiddleware,
    quotaMiddleware("document"),
    upload.single("file"),
    storageQuotaMiddleware,
    uploadDocument
);


// 2. Get all documents
router.get(
    "/",
    authMiddleware,
    getDocuments
);


// 3. Get a document by ID
router.get(
    "/:id",
    authMiddleware,
    getDocumentById
);


// 4. Delete a document
router.delete(
    "/:id",
    authMiddleware,
    deleteDocument
);


// 5. Handle upload errors and refund reserved quotas
router.use(async (error, req, res, next) => {
    if (req.method === "POST" && req.path === "/") {
        try {
            await refundUploadReservations(req);
        } catch (refundError) {
            console.error(
                "Upload quota refund failed:",
                refundError
            );
        }
    }

    next(error);
});


module.exports = router;
