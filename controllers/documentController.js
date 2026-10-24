const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

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

function getOwnerId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id
    );
}

function getFileType(file) {
    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (extension === ".pdf") return "pdf";
    if (extension === ".docx") return "docx";
    if (extension === ".txt") return "txt";

    return null;
}

function createPointId(documentId, chunkIndex) {
    return crypto
        .createHash("sha256")
        .update(`${documentId}-${chunkIndex}`)
        .digest("hex")
        .substring(0, 32);
}

async function removeTemporaryFile(req) {
    if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
    }
}

async function refundUploadQuotas(req) {
    await req.storageReservation?.refund();
    await req.quotaReservation?.refund();
}

function personalDocumentFilter(req) {
    return {
        owner: getOwnerId(req),
        workspace: null
    };
}

// UPLOAD DOCUMENT
async function uploadDocument(req, res, next) {
    let document = null;
    let completed = false;

    try {
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
                message: "Only PDF, DOCX and TXT files are allowed."
            });
        }

        const ownerId = getOwnerId(req);

        if (!ownerId) {
            await removeTemporaryFile(req);
            await refundUploadQuotas(req);

            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // Only the workspace route can set req.workspace.
        const workspaceId = req.workspace
            ? req.workspace._id
            : null;

        document = await Document.create({
            owner: ownerId,
            workspace: workspaceId,
            filename: req.file.originalname,
            fileType,
            fileSize: req.file.size,
            status: "processing",
            uploadedAt: new Date()
        });

        const extraction = await extractText(
            req.file.path,
            fileType
        );

        const cleanedText =
            extraction.text?.trim() || "";

        if (!cleanedText) {
            throw new Error(
                "No readable text could be extracted."
            );
        }

        const chunks = splitTextIntoChunks(
            cleanedText,
            500,
            50
        );

        if (!chunks.length) {
            throw new Error(
                "Document could not be divided into chunks."
            );
        }

        document.pageCount = extraction.pageCount || 0;
        await document.save();

        const savedChunks = await Chunk.insertMany(
            chunks.map(chunk => ({
                document: document._id,
                chunkIndex: chunk.chunkIndex,
                text: chunk.text,
                tokenCount: chunk.tokenCount,
                embeddingStatus: "pending",
                embeddingAttempts: 0
            }))
        );

        let embeddings;

        try {
            embeddings = await generateEmbeddings(
                savedChunks.map(chunk => chunk.text)
            );
        } catch (error) {
            await Chunk.updateMany(
                { document: document._id },
                {
                    $set: {
                        embeddingStatus: "failed"
                    },
                    $inc: {
                        embeddingAttempts: 1
                    }
                }
            );

            throw error;
        }

        if (
            !Array.isArray(embeddings) ||
            embeddings.length !== savedChunks.length
        ) {
            throw new Error(
                "Embedding count does not match chunk count."
            );
        }

        const points = savedChunks.map(
            (chunk, index) => ({
                id: createPointId(
                    document._id,
                    chunk.chunkIndex
                ),

                vector: embeddings[index],

                payload: {
                    chunkId: String(chunk._id),
                    documentId: String(document._id),
                    ownerId: String(ownerId),

                    // Null for personal documents.
                    // String ID for workspace documents.
                    workspaceId: workspaceId
                        ? String(workspaceId)
                        : null,

                    filename: document.filename,
                    chunkIndex: chunk.chunkIndex,
                    text: chunk.text
                }
            })
        );

        await upsertChunks(points);

        await Chunk.updateMany(
            { document: document._id },
            {
                $set: {
                    embeddingStatus: "embedded"
                },
                $inc: {
                    embeddingAttempts: 1
                }
            }
        );

        document.status = "ready";
        await document.save();

        completed = true;

        await removeTemporaryFile(req);

        return res.status(201).json({
            success: true,
            message:
                "Document uploaded and processed successfully.",
            document: {
                id: document._id,
                owner: document.owner,
                workspace: document.workspace,
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
        if (!completed) {
            if (document) {
                // Best-effort cleanup of partial vector writes.
                try {
                    await deleteDocumentVectors(document._id);
                } catch (cleanupError) {
                    console.error(
                        "Vector cleanup failed:",
                        cleanupError
                    );
                }

                await Chunk.deleteMany({
                    document: document._id
                }).catch(cleanupError => {
                    console.error(
                        "Chunk cleanup failed:",
                        cleanupError
                    );
                });

                document.status = "failed";

                await document.save().catch(() => {});
            }

            try {
                await refundUploadQuotas(req);
            } catch (refundError) {
                console.error(
                    "Quota refund failed:",
                    refundError
                );
            }
        }

        await removeTemporaryFile(req);
        next(error);
    }
}

// LIST PERSONAL DOCUMENTS
async function getDocuments(req, res, next) {
    try {
        const documents = await Document.find(
            personalDocumentFilter(req)
        )
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

// GET PERSONAL DOCUMENT
async function getDocumentById(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID."
            });
        }

        const document = await Document.findOne({
            _id: req.params.id,
            ...personalDocumentFilter(req)
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

// DELETE PERSONAL OR WORKSPACE DOCUMENT
async function deleteDocument(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID."
            });
        }

        const documentFilter = req.workspace
            ? {
                _id: req.params.id,
                workspace: req.workspace._id
            }
            : {
                _id: req.params.id,
                ...personalDocumentFilter(req)
            };

        const document = await Document.findOne(
            documentFilter
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found."
            });
        }

        await deleteDocumentVectors(document._id);

        await Chunk.deleteMany({
            document: document._id
        });

        const deletion = await Document.deleteOne({
            _id: document._id,
            ...(
                req.workspace
                    ? { workspace: req.workspace._id }
                    : personalDocumentFilter(req)
            )
        });

        if (deletion.deletedCount !== 1) {
            return res.status(409).json({
                success: false,
                message: "Document deletion was not completed."
            });
        }

        // Storage is billed to the workspace owner
        // for shared documents.
        const billingOwnerId = req.workspace
            ? req.workspace.billingOwner
            : getOwnerId(req);

        if (
            document.status === "ready" &&
            document.fileSize > 0
        ) {
            await releaseUsage(
                billingOwnerId,
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