const {
    estimateTokenCount,
    splitTextIntoChunks
} = require("../services/chunkingService");

describe("Chunking Service Unit Tests", () => {

    test("Returns zero tokens for empty text", () => {
        expect(estimateTokenCount("")).toBe(0);
        expect(estimateTokenCount("   ")).toBe(0);
    });

    test("Estimates tokens using four characters per token", () => {
        expect(estimateTokenCount("abcdefgh")).toBe(2);
        expect(estimateTokenCount("abcde")).toBe(2);
    });

    test("Returns no chunks for empty text", () => {
        expect(splitTextIntoChunks("")).toEqual([]);
        expect(splitTextIntoChunks("   ")).toEqual([]);
    });

    test("Keeps short text in a single chunk", () => {
        const chunks = splitTextIntoChunks(
            "Artificial intelligence is useful."
        );

        expect(chunks).toHaveLength(1);
        expect(chunks[0].chunkIndex).toBe(0);
        expect(chunks[0].text).toBe(
            "Artificial intelligence is useful."
        );
    });

    test("Splits long text into multiple chunks", () => {
        const text = Array(100)
            .fill("Artificial intelligence")
            .join(" ");

        const chunks = splitTextIntoChunks(
            text,
            50,
            5
        );

        expect(chunks.length).toBeGreaterThan(1);
    });

    test("Assigns sequential chunk indexes", () => {
        const text = Array(100)
            .fill("Machine learning")
            .join(" ");

        const chunks = splitTextIntoChunks(
            text,
            40,
            5
        );

        chunks.forEach((chunk, index) => {
            expect(chunk.chunkIndex).toBe(index);
        });
    });

    test("Stores a token estimate for each chunk", () => {
        const text = Array(100)
            .fill("Natural language processing")
            .join(" ");

        const chunks = splitTextIntoChunks(
            text,
            50,
            5
        );

        chunks.forEach(chunk => {
            expect(chunk.tokenCount).toBe(
                Math.ceil(chunk.text.length / 4)
            );
        });
    });

    test("Normalizes extra whitespace", () => {
        const text =
            "Hello   world\n\nMachine    learning";

        const chunks = splitTextIntoChunks(text);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].text).toBe(
            "Hello world Machine learning"
        );
    });

    test("Does not create empty chunks", () => {
        const text = Array(100)
            .fill("AI")
            .join(" ");

        const chunks = splitTextIntoChunks(
            text,
            20,
            5
        );

        chunks.forEach(chunk => {
            expect(chunk.text.trim().length)
                .toBeGreaterThan(0);
        });
    });

    test("Preserves overlap between adjacent chunks", () => {
        const text = Array.from(
            { length: 40 },
            (_, i) => `word${i}`
        ).join(" ");

        const chunks = splitTextIntoChunks(
            text,
            20,
            5
        );

        expect(chunks.length).toBeGreaterThan(1);

        // Overlapping chunks should share text.
        const firstWords = chunks[0].text.split(" ");
        const secondWords = chunks[1].text.split(" ");

        const sharedWords = firstWords.filter(
            word => secondWords.includes(word)
        );

        expect(sharedWords.length).toBeGreaterThan(0);
    });

});
