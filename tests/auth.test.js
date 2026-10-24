const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// Replace User database operations with mocks.
jest.mock("../models/User");

const app = require("../app");

describe("Authentication API", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Rejects registration with invalid email", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "invalid-email",
                password: "Password123"
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(User.create).not.toHaveBeenCalled();
    });

    test("Rejects registration with short password", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "123"
            });

        expect(response.statusCode).toBe(400);
        expect(User.create).not.toHaveBeenCalled();
    });

    test("Prevents users from registering as admins", async () => {
        User.findOne.mockResolvedValue(null);

        User.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            name: "Test User",
            email: "test@example.com",
            role: "user"
        });

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "Password123",
                role: "admin",
                isSuspended: true
            });

        expect(response.statusCode).toBe(201);

        expect(User.create).toHaveBeenCalledWith(
            expect.objectContaining({
                role: "user",
                isSuspended: false
            })
        );

        expect(response.body.user.role).toBeUndefined();
    });

    test("Rejects registration with duplicate email", async () => {
        User.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            email: "test@example.com"
        });

        const response = await request(app)
            .post("/api/auth/register")
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "Password123"
            });

        expect(response.statusCode).toBe(409);
        expect(User.create).not.toHaveBeenCalled();
    });

    test("Rejects login with unknown email", async () => {
        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null)
        });

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "unknown@example.com",
                password: "Password123"
            });

        expect(response.statusCode).toBe(401);
        expect(response.body.success).toBe(false);
    });

    test("Blocks login for suspended users", async () => {
        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: "507f1f77bcf86cd799439011",
                email: "test@example.com",
                password: "hashed-password",
                isSuspended: true
            })
        });

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "Password123"
            });

        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/suspended/i);
    });

    test("Rejects login with incorrect password", async () => {
        const hashedPassword = await bcrypt.hash(
            "CorrectPassword123",
            10
        );

        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: "507f1f77bcf86cd799439011",
                email: "test@example.com",
                password: hashedPassword,
                isSuspended: false
            })
        });

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "WrongPassword123"
            });

        expect(response.statusCode).toBe(401);
    });

    test("Allows login with correct credentials", async () => {
        const userId = "507f1f77bcf86cd799439011";

        const hashedPassword = await bcrypt.hash(
            "Password123",
            10
        );

        User.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: userId,
                name: "Test User",
                email: "test@example.com",
                password: hashedPassword,
                role: "user",
                isSuspended: false
            })
        });

        const response = await request(app)
            .post("/api/auth/login")
            .send({
                email: "test@example.com",
                password: "Password123"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();

        const decoded = jwt.verify(
            response.body.token,
            process.env.JWT_SECRET
        );

        expect(decoded.userId).toBe(userId);
    });

});
