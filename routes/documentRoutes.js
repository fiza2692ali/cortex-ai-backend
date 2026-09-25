const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const {
    uploadDocument,
    getDocuments,
    getDocumentById,
    deleteDocument
} = require("../controllers/documentController");


router.post(
    "/",
    authMiddleware,
    upload.single("file"),
    uploadDocument
);


router.get(
    "/",
    authMiddleware,
    getDocuments
);


router.get(
    "/:id",
    authMiddleware,
    getDocumentById
);


router.delete(
    "/:id",
    authMiddleware,
    deleteDocument
);


module.exports = router;