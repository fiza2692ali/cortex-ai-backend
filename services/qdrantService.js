const { QdrantClient } = require("@qdrant/js-client-rest");

const COLLECTION_NAME =
    process.env.QDRANT_COLLECTION || "cortex_chunks";

const VECTOR_SIZE = 1536;

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false
});

let initializationPromise = null;

async function initializeCollection() {
    const collections = await client.getCollections();

    const exists = collections.collections.some(
        collection => collection.name === COLLECTION_NAME
    );

    if (!exists) {
        await client.createCollection(
            COLLECTION_NAME,
            {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: "Cosine"
                }
            }
        );
    }

    // Only create indexes that do not already exist.
    const collectionInfo = await client.getCollection(
        COLLECTION_NAME
    );

    const existingIndexes =
        collectionInfo.payload_schema || {};

    for (const field of [
        "ownerId",
        "documentId",
        "workspaceId"
    ]) {
        if (!existingIndexes[field]) {
            await client.createPayloadIndex(
                COLLECTION_NAME,
                {
                    field_name: field,
                    field_schema: "keyword",
                    wait: true
                }
            );
        }
    }

    console.log("Qdrant collection ready:", COLLECTION_NAME);
}

async function ensureCollection() {
    if (!initializationPromise) {
        initializationPromise = initializeCollection()
            .catch(error => {
                initializationPromise = null;
                throw error;
            });
    }

    return initializationPromise;
}

async function upsertChunks(points) {
    if (!Array.isArray(points) || points.length === 0) {
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
                            value: String(documentId)
                        }
                    }
                ]
            }
        }
    );
}

/*
 * Personal search:
 *   ownerId is required.
 *   workspaceId is null.
 *
 * Workspace search:
 *   workspaceId is required.
 *   ownerId is ignored for vector filtering.
 *
 * The calling controller must verify workspace
 * membership before requesting workspace search.
 */
async function searchSimilarChunks(
    vector,
    limit = 5,
    documentIds = null,
    ownerId = null,
    workspaceId = null
) {
    await ensureCollection();

    const must = [];

    if (workspaceId) {
        must.push({
            key: "workspaceId",
            match: {
                value: String(workspaceId)
            }
        });
    } else {
        if (!ownerId) {
            throw new Error(
                "Owner ID is required for personal vector search."
            );
        }

        must.push({
            key: "ownerId",
            match: {
                value: String(ownerId)
            }
        });

        // Exclude workspace vectors, including documents
        // uploaded by this same user.
        must.push({
            is_empty: {
                key: "workspaceId"
            }
        });
    }

    if (documentIds !== null && documentIds !== undefined) {
        const ids = (
            Array.isArray(documentIds)
                ? documentIds
                : [documentIds]
        ).map(String);

        if (ids.length === 0) {
            return [];
        }

        must.push({
            key: "documentId",
            match: {
                any: ids
            }
        });
    }

    const safeLimit = Math.min(
        Math.max(Number(limit) || 5, 1),
        20
    );

    const response = await client.query(
        COLLECTION_NAME,
        {
            query: vector,
            limit: safeLimit,
            with_payload: true,
            filter: { must }
        }
    );

    return response.points || [];
}

module.exports = {
    ensureCollection,
    upsertChunks,
    deleteDocumentVectors,
    searchSimilarChunks,
    COLLECTION_NAME
};