const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const Document = require("../models/Document");
const Chunk = require("../models/Chunk");

const {
    extractText
} = require("../services/extractionService");

const {
    splitTextIntoChunks
} = require("../services/chunkingService");

const {
    generateEmbeddings
} = require("../services/embeddingService");

const {
    upsertChunks,
    deleteDocumentVectors
} = require("../services/qdrantService");

const {
    releaseUsage
} = require("../services/subscriptionService");

// HELPER FUNCTIONS
function getFileType(file) {
    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (extension === ".pdf") {
        return "pdf";
    }

    if (extension === ".docx") {
        return "docx";
    }

    if (extension === ".txt") {
        return "txt";
    }

    return null;
}

function getOwnerId(req) {
    return (
        req.user?.id ||
        req.user?.userId ||
        req.user?._id
    );
}

function createPointId(documentId, chunkIndex) {
    const hash = crypto
        .createHash("sha256")
        .update(
            `${documentId.toString()}-${chunkIndex}`
        )
        .digest("hex");

    return hash.substring(0, 32);
}

// Refund a reserved quota.
async function refundReservation(reservation) {
    if (reservation &&
        typeof reservation.refund === "function") {
        await reservation.refund();
    }
}

// Used when the controller returns an error
async function refundUploadQuotas(req) {
    await refundReservation(req.storageReservation);
    await refundReservation(req.quotaReservation);
}

// Remove the temporary uploaded file.
async function removeTemporaryFile(req) {
    if (req.file && req.file.path) {
        await fs.unlink(req.file.path).catch(() => {});
    }
}

// UPLOAD DOCUMENT
async function uploadDocument(req, res, next) {
    let document = null;
    let uploadCompleted = false;

    try {
        // Validate uploaded file
        if (!req.file) {
            await refundUploadQuotas(req);

            return res.status(400).json({
                success: false,
                message: "No file uploaded."
            });
        }

        const fileType = getFileType(req.file);

        if (!fileType) {
            await removeTemporaryFile(req);
            await refundUploadQuotas(req);

            return res.status(400).json({
                success: false,
                message:
                    "Only PDF, DOCX, and TXT files are allowed."
            });
        }

        const ownerId = getOwnerId(req);

        if (!ownerId) {
            await removeTemporaryFile(req);
            await refundUploadQuotas(req);

            return res.status(401).json({
                success: false,
                message:
                    "Authenticated user ID was not found."
            });
        }

        // Create document record and save file size
        document = await Document.create({
            owner: ownerId,
            filename: req.file.originalname,
            fileType: fileType,
            fileSize: req.file.size,
            status: "processing",
            uploadedAt: new Date()
        });

        // Extract text from uploaded document
        const extraction = await extractText(
            req.file.path,
            fileType
        );

        const cleanedText = extraction.text
            ? extraction.text.trim()
            : "";

        if (!cleanedText) {
            throw new Error(
                "No readable text could be extracted " +
                "from the uploaded file."
            );
        }

        // Divide extracted text into chunks
        const chunks = splitTextIntoChunks(
            cleanedText,
            500,
            50
        );

        if (chunks.length === 0) {
            throw new Error(
                "The document could not be " +
                "divided into chunks."
            );
        }

        document.pageCount = extraction.pageCount || 0;

        await document.save();

        // Save chunks in MongoDB
        const chunkDocuments = chunks.map(chunk => ({
            document: document._id,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            tokenCount: chunk.tokenCount,
            embeddingStatus: "pending",
            embeddingAttempts: 0
        }));

        const savedChunks =
            await Chunk.insertMany(chunkDocuments);

        // Generate embeddings
        let embeddings;

        try {
            embeddings = await generateEmbeddings(
                savedChunks.map(chunk => chunk.text)
            );

        } catch (embeddingError) {

            await Chunk.updateMany(
                {
                    document: document._id
                },
                {
                    $set: {
                        embeddingStatus: "failed"
                    },
                    $inc: {
                        embeddingAttempts: 1
                    }
                }
            );

            throw embeddingError;
        }

        // Prepare Qdrant vector points
        const points = savedChunks.map(
            (chunk, index) => ({
                id: createPointId(
                    document._id,
                    chunk.chunkIndex
                ),

                vector: embeddings[index],

                payload: {
                    chunkId: chunk._id.toString(),
                    documentId: document._id.toString(),
                    ownerId: ownerId.toString(),
                    filename: document.filename,
                    chunkIndex: chunk.chunkIndex,
                    text: chunk.text
                }
            })
        );

        // Store embeddings in Qdrant
        await upsertChunks(points);

        // Update chunk embedding status
        await Chunk.updateMany(
            {
                document: document._id
            },
            {
                $set: {
                    embeddingStatus: "embedded"
                },
                $inc: {
                    embeddingAttempts: 1
                }
            }
        );

        // Mark document as ready
        document.status = "ready";

        await document.save();

        uploadCompleted = true;

        // Remove temporary uploaded file
        await removeTemporaryFile(req);

        return res.status(201).json({
            success: true,
            message:
                "Document uploaded and processed successfully.",

            document: {
                id: document._id,
                filename: document.filename,
                fileType: document.fileType,
                fileSize: document.fileSize,
                status: document.status,
                pageCount: document.pageCount,
                chunkCount: savedChunks.length,
                uploadedAt: document.uploadedAt
            }
        });

    } catch (error) {

        // Preserve failed document information
        if (document && !uploadCompleted) {
            document.status = "failed";

            await document.save().catch(() => {});
        }

        await removeTemporaryFile(req);

        next(error);
    }
}

// GET ALL DOCUMENTS
async function getDocuments(req, res, next) {
    try {
        const ownerId = getOwnerId(req);

        if (!ownerId) {
            return res.status(401).json({
                success: false,
                message:
                    "Authenticated user ID was not found."
            });
        }

        const documents = await Document.find({
            owner: ownerId
        })
            .sort({ uploadedAt: -1 })
            .select(
                "filename fileType fileSize status " +
                "pageCount uploadedAt createdAt updatedAt"
            );

        return res.status(200).json({
            success: true,
            count: documents.length,
            documents
        });

    } catch (error) {
        next(error);
    }
}

// GET DOCUMENT BY ID
async function getDocumentById(req, res, next) {
    try {
        const ownerId = getOwnerId(req);

        if (!ownerId) {
            return res.status(401).json({
                success: false,
                message:
                    "Authenticated user ID was not found."
            });
        }

        const document = await Document.findOne({
            _id: req.params.id,
            owner: ownerId
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found."
            });
        }

        const chunkCount = await Chunk.countDocuments({
            document: document._id
        });

        return res.status(200).json({
            success: true,

            document: {
                ...document.toObject(),
                chunkCount
            }
        });

    } catch (error) {
        next(error);
    }
}

// DELETE DOCUMENT
async function deleteDocument(req, res, next) {
    try {
        const ownerId = getOwnerId(req);

        if (!ownerId) {
            return res.status(401).json({
                success: false,
                message:
                    "Authenticated user ID was not found."
            });
        }

        const document = await Document.findOne({
            _id: req.params.id,
            owner: ownerId
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found."
            });
        }

        // Delete vectors from Qdrant
        await deleteDocumentVectors(
            document._id
        );

        // Delete associated chunks
        await Chunk.deleteMany({
            document: document._id
        });

        // Delete document record
        const deletion = await Document.deleteOne({
            _id: document._id,
            owner: ownerId
        });

        // Release storage quota after successful deletion
        if (
            deletion.deletedCount === 1 &&
            document.status === "ready" &&
            document.fileSize > 0
        ) {
            await releaseUsage(
                ownerId,
                "storage",
                document.fileSize
            );
        }

        return res.status(200).json({
            success: true,
            message:
                "Document and its chunks deleted successfully."
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    uploadDocument,
    getDocuments,
    getDocumentById,
    deleteDocument
};