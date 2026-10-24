const mongoose = require("mongoose");
const Document = require("../models/Document");

const {
    generateQueryEmbedding
} = require("../services/embeddingService");

const {
    searchSimilarChunks
} = require("../services/qdrantService");

async function semanticSearch(req, res, next) {
    try {
        const {
            query,
            documentId,
            topK = 5
        } = req.body || {};

        // Validate search query
        if (
            typeof query !== "string" ||
            !query.trim() ||
            query.length > 4000
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Search query must contain 1 to 4000 characters."
            });
        }

        // Validate topK
        const limit = Number(topK);

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 20
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "topK must be an integer between 1 and 20."
            });
        }

        const ownerId =
            req.user?.userId ||
            req.user?.id ||
            req.user?._id;

        if (!ownerId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // Workspace is set only by the protected
        // workspace membership middleware.
        const workspaceId = req.workspace
            ? req.workspace._id
            : null;

        if (
            documentId !== undefined &&
            documentId !== null &&
            !mongoose.isValidObjectId(documentId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid document ID."
            });
        }

        // Verify access to a selected document.
        if (documentId) {
            const filter = workspaceId
                ? {
                    _id: documentId,
                    workspace: workspaceId
                }
                : {
                    _id: documentId,
                    owner: ownerId,
                    workspace: null
                };

            const document = await Document.findOne(filter);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: "Document not found."
                });
            }

            if (document.status !== "ready") {
                return res.status(400).json({
                    success: false,
                    message:
                        "Selected document is not ready for search."
                });
            }
        }

        // Generate query embedding
        const queryVector = await generateQueryEmbedding(
            query.trim()
        );

        // Qdrant applies owner or workspace filtering.
        const results = await searchSimilarChunks(
            queryVector,
            limit,
            documentId || null,
            ownerId,
            workspaceId
        );

        // Verify retrieved documents against MongoDB.
        // This also excludes failed or deleted documents.
        const candidateIds = [
            ...new Set(
                results
                    .map(result => result.payload?.documentId)
                    .filter(id => mongoose.isValidObjectId(id))
                    .map(String)
            )
        ];

        const accessFilter = workspaceId
            ? { workspace: workspaceId }
            : { owner: ownerId, workspace: null };

        const allowedDocuments = await Document.find({
            _id: { $in: candidateIds },
            ...accessFilter,
            status: "ready"
        }).select("_id");

        const allowedIds = new Set(
            allowedDocuments.map(doc => String(doc._id))
        );

        const formattedResults = results
            .filter(result =>
                allowedIds.has(
                    String(result.payload?.documentId)
                )
            )
            .map(result => ({
                score: result.score,
                documentId: result.payload?.documentId,
                filename: result.payload?.filename,
                chunkId: result.payload?.chunkId,
                chunkIndex: result.payload?.chunkIndex,
                text: result.payload?.text
            }));

        return res.status(200).json({
            success: true,
            query: query.trim(),
            workspaceId: workspaceId
                ? String(workspaceId)
                : null,
            documentId: documentId || null,
            topK: limit,
            count: formattedResults.length,
            results: formattedResults
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    semanticSearch
};