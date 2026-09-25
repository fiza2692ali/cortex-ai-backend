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
        } = req.body;


        // ---------------------------------
        // 1. Validate search query
        // ---------------------------------

        if (
            !query ||
            typeof query !== "string" ||
            !query.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Search query is required."
            });
        }


        // ---------------------------------
        // 2. Get authenticated user's ID
        // ---------------------------------

        const ownerId =
            req.user?.userId ||
            req.user?.id ||
            req.user?._id;


        if (!ownerId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user ID was not found."
            });
        }

        // ---------------------------------
        // 3. Validate topK
        // ---------------------------------

        const limit = Number(topK);

        if (
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 20
        ) {
            return res.status(400).json({
                success: false,
                message: "topK must be an integer between 1 and 20."
            });
        }


        // ---------------------------------
        // 4. If documentId is supplied,
        // verify that it belongs to user
        // ---------------------------------

        if (documentId) {

            const document =
                await Document.findOne({
                    _id: documentId,
                    owner: ownerId
                });


            if (!document) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found or does not belong to this user."
                });
            }


            if (document.status !== "ready") {
                return res.status(400).json({
                    success: false,
                    message:
                        "The selected document is not ready for semantic search."
                });
            }
        }


        // ---------------------------------
        // 5. Generate query embedding
        // ---------------------------------

        const queryVector =
            await generateQueryEmbedding(
                query.trim()
            );

        // ---------------------------------
        // 6. Search Qdrant
        // ---------------------------------

        const results =
            await searchSimilarChunks(
                queryVector,
                limit,
                documentId || null,
                ownerId
            );


        // ---------------------------------
        // 7. Format search results
        // ---------------------------------

        const formattedResults =
            results.map(result => ({
                score: result.score,

                documentId:
                    result.payload?.documentId,

                filename:
                    result.payload?.filename,

                chunkId:
                    result.payload?.chunkId,

                chunkIndex:
                    result.payload?.chunkIndex,

                text:
                    result.payload?.text
            }));


        // ---------------------------------
        // 8. Return response
        // ---------------------------------

        return res.status(200).json({
            success: true,
            query: query.trim(),
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