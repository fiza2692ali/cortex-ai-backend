function estimateTokenCount(text) {
    if (!text || !text.trim()) {
        return 0;
    }

    /*
     * Simple token estimation:
     * approximately 1 token ≈ 4 characters for English text.
     *
     * This is used only for chunk sizing and the stored tokenCount.
     * The exact tokenizer used internally by the embedding model
     * may produce a slightly different count.
     */
    return Math.ceil(text.length / 4);
}

function splitTextIntoChunks(
    text,
    targetTokens = 500,
    overlapTokens = 50
) {
    if (!text || !text.trim()) {
        return [];
    }

    const normalizedText = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\s+/g, " ")
        .trim();

    const targetCharacters = targetTokens * 4;
    const overlapCharacters = overlapTokens * 4;

    const chunks = [];

    let start = 0;
    let chunkIndex = 0;

    while (start < normalizedText.length) {
        let end = Math.min(
            start + targetCharacters,
            normalizedText.length
        );

        if (end < normalizedText.length) {
            const lastSpace = normalizedText.lastIndexOf(" ", end);

            if (lastSpace > start) {
                end = lastSpace;
            }
        }

        const chunkText = normalizedText
            .slice(start, end)
            .trim();

        if (chunkText) {
            chunks.push({
                chunkIndex,
                text: chunkText,
                tokenCount: estimateTokenCount(chunkText)
            });

            chunkIndex++;
        }

        if (end >= normalizedText.length) {
            break;
        }

        start = Math.max(
            end - overlapCharacters,
            start + 1
        );
    }

    return chunks;
}

module.exports = {
    estimateTokenCount,
    splitTextIntoChunks
};