const { QdrantClient } = require("@qdrant/js-client-rest");

const COLLECTION_NAME =
    process.env.QDRANT_COLLECTION || "cortex_chunks";

const VECTOR_SIZE = 1536;

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

async function ensureCollection() {
    try {
        const collections =
            await client.getCollections();

        const exists =
            collections.collections.some(
                collection =>
                    collection.name === COLLECTION_NAME
            );

        if (!exists) {

            console.log(
                `Creating Qdrant collection: ${COLLECTION_NAME}`
            );

            await client.createCollection(
                COLLECTION_NAME,
                {
                    vectors: {
                        size: VECTOR_SIZE,
                        distance: "Cosine"
                    }
                }
            );

            console.log(
                `Qdrant collection created successfully: ${COLLECTION_NAME}`
            );

        } else {

            console.log(
                `Qdrant collection ready: ${COLLECTION_NAME}`
            );
        }


        // ---------------------------------
        // Create payload index for ownerId
        // ---------------------------------

        await client.createPayloadIndex(
            COLLECTION_NAME,
            {
                field_name: "ownerId",
                field_schema: "keyword",
                wait: true
            }
        );


        // ---------------------------------
        // Create payload index for documentId
        // ---------------------------------

        await client.createPayloadIndex(
            COLLECTION_NAME,
            {
                field_name: "documentId",
                field_schema: "keyword",
                wait: true
            }
        );


    } catch (error) {

        console.error(
            "Qdrant collection initialization failed:",
            error.message
        );

        throw error;
    }
}

async function upsertChunks(points) {

    if (!points || points.length === 0) {
        return;
    }

    await ensureCollection();

    await client.upsert(
        COLLECTION_NAME,
        {
            wait: true,
            points
        }
    );

    console.log(
        `${points.length} vector(s) stored in Qdrant.`
    );
}


async function deleteDocumentVectors(documentId) {

    await ensureCollection();

    await client.delete(
        COLLECTION_NAME,
        {
            wait: true,

            filter: {
                must: [
                    {
                        key: "documentId",
                        match: {
                            value: documentId.toString()
                        }
                    }
                ]
            }
        }
    );
}

async function searchSimilarChunks(
    vector,
    limit = 5,
    documentId = null,
    ownerId = null
) {
    await ensureCollection();

    const must = [];

    if (ownerId) {
        must.push({
            key: "ownerId",
            match: {
                value: ownerId.toString()
            }
        });
    }

    if (documentId) {
        must.push({
            key: "documentId",
            match: {
                value: documentId.toString()
            }
        });
    }

    const queryParams = {
        query: vector,
        limit: Number(limit),
        with_payload: true
    };

    if (must.length > 0) {
        queryParams.filter = {
            must: must
        };
    }
    
    try {
        const response = await client.query(
            COLLECTION_NAME,
            queryParams
        );

        return response.points || [];

    } catch (error) {
        console.error("Qdrant search error:", error.message);

        if (error.data) {
            console.error(
                "Qdrant error data:",
                JSON.stringify(error.data, null, 2)
            );
        }

        throw error;
    }

}

module.exports = {
    ensureCollection,
    upsertChunks,
    deleteDocumentVectors,
    searchSimilarChunks,
    COLLECTION_NAME
};