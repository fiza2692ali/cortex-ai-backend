
const express = require("express");
const request = require("supertest");

const {
    authLimiter,
    chatLimiter,
    searchLimiter
} = require("../middleware/rateLimiter");

describe("Rate Limiting Security Tests", () => {

    function createTestApp(limiter) {
        const app = express();

        app.use(limiter);

        app.get("/test", (req, res) => {
            res.status(200).json({
                success: true
            });
        });

        return app;
    }

    test("Blocks authentication requests after 10 attempts", async () => {
        const app = createTestApp(authLimiter);

        for (let i = 0; i < 10; i++) {
            const response = await request(app).get("/test");
            expect(response.statusCode).toBe(200);
        }

        const blocked = await request(app).get("/test");

        expect(blocked.statusCode).toBe(429);
        expect(blocked.body.success).toBe(false);
    });

    test("Blocks chat requests after 30 attempts", async () => {
        const app = createTestApp(chatLimiter);

        for (let i = 0; i < 30; i++) {
            const response = await request(app).get("/test");
            expect(response.statusCode).toBe(200);
        }

        const blocked = await request(app).get("/test");

        expect(blocked.statusCode).toBe(429);
        expect(blocked.body.success).toBe(false);
    });

    test("Blocks search requests after 60 attempts", async () => {
        const app = createTestApp(searchLimiter);

        for (let i = 0; i < 60; i++) {
            const response = await request(app).get("/test");
            expect(response.statusCode).toBe(200);
        }

        const blocked = await request(app).get("/test");

        expect(blocked.statusCode).toBe(429);
        expect(blocked.body.success).toBe(false);
    });
});
