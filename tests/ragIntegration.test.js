const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../models/Document");
jest.mock("../models/User");
jest.mock("../models/Chunk");
jest.mock("../models/ChatSession");
jest.mock("../models/Message");

jest.mock("../services/extractionService", () => ({
    extractText: jest.fn()
}));

jest.mock("../services/embeddingService", () => ({
    generateEmbeddings: jest.fn()
}));

jest.mock("../services/qdrantService", () => ({
    upsertChunks: jest.fn(),
    deleteDocumentVectors: jest.fn(),
    searchSimilarChunks: jest.fn()
}));

jest.mock("../services/ragService", () => ({
    generateRagAnswer: jest.fn()
}));

jest.mock("../services/subscriptionService", () => ({
    reserveUsage: jest.fn(),
    releaseUsage: jest.fn()
}));

const User = require("../models/User");
const Document = require("../models/Document");
const Chunk = require("../models/Chunk");
const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");

const {
    extractText
} = require("../services/extractionService");

const {
    generateEmbeddings
} = require("../services/embeddingService");

const {
    upsertChunks
} = require("../services/qdrantService");

const {
    generateRagAnswer
} = require("../services/ragService");

const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

const app = require("../app");

const USER_ID = "507f1f77bcf86cd799439011";
const DOCUMENT_ID = "507f1f77bcf86cd799439012";
const CHUNK_ID = "507f1f77bcf86cd799439013";
const SESSION_ID = "507f1f77bcf86cd799439014";

describe("RAG Integration Test", () => {
    let token;
    let uploadedDocumentId;

    beforeAll(() => {
        token = jwt.sign(
            {
                userId: USER_ID,
                email: "integration@example.com"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: USER_ID,
                name: "Integration Test User",
                email: "integration@example.com",
                role: "user",
                isSuspended: false
            })
        });
        reserveUsage.mockResolvedValue(true);
        releaseUsage.mockResolvedValue(undefined);

        extractText.mockResolvedValue({
            text: "Prompt engineering improves AI results by using clear instructions, context, and examples.",
            pageCount: 1
        });

        generateEmbeddings.mockResolvedValue([
            Array(1536).fill(0.01)
        ]);

        upsertChunks.mockResolvedValue(undefined);

        Document.create.mockImplementation(async data => ({
            _id: DOCUMENT_ID,
            ...data,
            save: jest.fn().mockResolvedValue(undefined)
        }));

        Chunk.insertMany.mockImplementation(async chunks =>
            chunks.map((chunk, index) => ({
                _id: CHUNK_ID,
                ...chunk,
                chunkIndex: index
            }))
        );

        Chunk.updateMany.mockResolvedValue({
            modifiedCount: 1
        });

        Document.countDocuments.mockResolvedValue(1);

        ChatSession.create.mockImplementation(async data => ({
            _id: SESSION_ID,
            ...data
        }));

        ChatSession.findOne.mockResolvedValue({
            _id: SESSION_ID,
            owner: USER_ID,
            workspace: null,
            documentIds: [DOCUMENT_ID]
        });

        Message.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([])
        });

        Message.create.mockImplementation(async data => ({
            _id: "507f1f77bcf86cd799439015",
            ...data
        }));

        generateRagAnswer.mockResolvedValue({
            answer: "Clear instructions and context improve AI responses.",
            sources: [
                {
                    documentId: DOCUMENT_ID,
                    filename: "prompting.txt",
                    chunkIndex: 0,
                    score: 0.95,
                    text: "Prompt engineering improves AI results."
                }
            ]
        });
    });

    test("Uploads, embeds, and chats with document citations", async () => {

        // 1. Upload TXT document
        const uploadResponse = await request(app)
            .post("/api/documents")
            .set("Authorization", `Bearer ${token}`)
            .attach(
                "file",
                Buffer.from(
                    "Prompt engineering improves AI results by using clear instructions, context, and examples."
                ),
                "prompting.txt"
            );

        expect(uploadResponse.statusCode).toBe(201);
        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.document.status).toBe("ready");

        uploadedDocumentId =
            uploadResponse.body.document.id;

        // 2. Verify extraction and embedding
        expect(extractText).toHaveBeenCalledTimes(1);
        expect(generateEmbeddings).toHaveBeenCalledTimes(1);
        expect(upsertChunks).toHaveBeenCalledTimes(1);

        const vectorPoints = upsertChunks.mock.calls[0][0];

        expect(vectorPoints.length).toBeGreaterThan(0);
        expect(vectorPoints[0].payload.documentId)
            .toBe(DOCUMENT_ID);

        // 3. Create chat session
        const sessionResponse = await request(app)
            .post("/api/chat/sessions")
            .set("Authorization", `Bearer ${token}`)
            .send({
                title: "Prompt Engineering Chat",
                documentIds: [uploadedDocumentId]
            });

        expect(sessionResponse.statusCode).toBe(201);

        const sessionId = sessionResponse.body.session._id;

        // 4. Ask a question
        const chatResponse = await request(app)
            .post(`/api/chat/sessions/${sessionId}/messages`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                content: "How can I improve AI prompts?"
            });

        expect(chatResponse.statusCode).toBe(201);
        expect(chatResponse.body.success).toBe(true);

        // 5. Verify cited answer
        expect(chatResponse.body.assistantMessage.content)
            .toContain("Clear instructions");

        expect(chatResponse.body.assistantMessage.sources)
            .toHaveLength(1);

        expect(
            chatResponse.body.assistantMessage.sources[0].documentId
        ).toBe(DOCUMENT_ID);

        expect(generateRagAnswer).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerId: USER_ID,
                documentIds: [DOCUMENT_ID],
                question: "How can I improve AI prompts?"
            })
        );
    });
});
