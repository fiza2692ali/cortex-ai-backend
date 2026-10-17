
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
