const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../models/User");
jest.mock("../models/ChatSession");

jest.mock("../services/subscriptionService", () => ({
    reserveUsage: jest.fn(),
    releaseUsage: jest.fn()
}));

jest.mock("../services/ragService", () => ({
    generateRagAnswer: jest.fn()
}));

const User = require("../models/User");
const ChatSession = require("../models/ChatSession");

const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

const {
    generateRagAnswer
} = require("../services/ragService");

const app = require("../app");

const USER_ID = "507f1f77bcf86cd799439011";
const SESSION_ID = "507f1f77bcf86cd799439013";

describe("Chat Input Security", () => {
    let token;

    beforeAll(() => {
        token = jwt.sign(
            { userId: USER_ID },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();

        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: USER_ID,
                name: "Test User",
                email: "test@example.com",
                role: "user",
                isSuspended: false
            })
        });

        reserveUsage.mockResolvedValue(true);
        releaseUsage.mockResolvedValue(undefined);
    });

    test("Rejects an empty chat message", async () => {
        const response = await request(app)
            .post(`/api/chat/sessions/${SESSION_ID}/messages`)
            .set("Authorization", `Bearer ${token}`)
            .send({ content: "" });

        expect(response.statusCode).toBe(400);

        expect(reserveUsage).toHaveBeenCalledWith(
            USER_ID,
            "message"
        );

        expect(releaseUsage).toHaveBeenCalledWith(
            USER_ID,
            "message"
        );

        expect(generateRagAnswer).not.toHaveBeenCalled();
    });

    test("Rejects a message longer than 4000 characters", async () => {
        const response = await request(app)
            .post(`/api/chat/sessions/${SESSION_ID}/messages`)
            .set("Authorization", `Bearer ${token}`)
            .send({ content: "A".repeat(4001) });

        expect(response.statusCode).toBe(400);

        expect(releaseUsage).toHaveBeenCalledWith(
            USER_ID,
            "message"
        );

        expect(generateRagAnswer).not.toHaveBeenCalled();
    });

    test("Allows a message of exactly 4000 characters through validation", async () => {
        ChatSession.findOne.mockResolvedValue(null);

        const response = await request(app)
            .post(`/api/chat/sessions/${SESSION_ID}/messages`)
            .set("Authorization", `Bearer ${token}`)
            .send({ content: "A".repeat(4000) });

        // A valid message passes input validation.
        // The mocked session does not exist, so the
        // controller should return 404 instead of 400.
        expect(response.statusCode).toBe(404);

        expect(ChatSession.findOne).toHaveBeenCalled();

        expect(generateRagAnswer).not.toHaveBeenCalled();
    });
});
