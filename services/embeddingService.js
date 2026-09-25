const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSION = 1536;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function generateEmbeddings(texts) {

    if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error(
            "No text was provided for embedding generation."
        );
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {

            const response = await ai.models.embedContent({
                model: EMBEDDING_MODEL,

                contents: texts,

                config: {
                    outputDimensionality: EMBEDDING_DIMENSION
                }
            });


            if (
                !response.embeddings ||
                response.embeddings.length !== texts.length
            ) {
                throw new Error(
                    "Gemini returned an unexpected number of embeddings."
                );
            }


            return response.embeddings.map(
                embedding => embedding.values
            );

        } catch (error) {

            console.error(
                `Embedding attempt ${attempt}/${MAX_RETRIES} failed:`,
                error.message
            );


            if (attempt === MAX_RETRIES) {
                throw new Error(
                    `Embedding generation failed after ${MAX_RETRIES} attempts: ${error.message}`
                );
            }


            await sleep(
                RETRY_DELAY_MS * attempt
            );
        }
    }
}


async function generateQueryEmbedding(text) {

    if (!text || !text.trim()) {
        throw new Error(
            "Search query cannot be empty."
        );
    }


    const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,

        contents: text,

        config: {
            outputDimensionality: EMBEDDING_DIMENSION
        }
    });


    if (
        !response.embeddings ||
        !response.embeddings[0]
    ) {
        throw new Error(
            "Gemini did not return a query embedding."
        );
    }


    return response.embeddings[0].values;
}


module.exports = {
    generateEmbeddings,
    generateQueryEmbedding
};