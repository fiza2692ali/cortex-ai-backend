const request = require("supertest");

jest.mock("../models/User", () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const User = require("../models/User");
const app = require("../app");

describe("Input Security Tests", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Rejects NoSQL injection in registration email", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: { $ne: null },
                password: "password123"
            });

        expect(response.statusCode).toBe(400);
        expect(User.findOne).not.toHaveBeenCalled();
        expect(User.create).not.toHaveBeenCalled();
    });

    test("Rejects NoSQL injection in login email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: { $ne: null },
                password: "password123"
            });

        expect(response.statusCode).toBe(400);
        expect(User.findOne).not.toHaveBeenCalled();
    });

    test("Rejects oversized login email", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "a".repeat(255) + "@example.com",
                password: "password123"
            });

        expect(response.statusCode).toBe(400);
        expect(User.findOne).not.toHaveBeenCalled();
    });

    test("Rejects oversized login password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "a".repeat(129)
            });

        expect(response.statusCode).toBe(400);
        expect(User.findOne).not.toHaveBeenCalled();
    });

    test("Rejects invalid registration name type", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: { $gt: "" },
                email: "test@example.com",
                password: "password123"
            });

        expect(response.statusCode).toBe(400);
        expect(User.create).not.toHaveBeenCalled();
    });
});
