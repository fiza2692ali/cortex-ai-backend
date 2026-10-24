const request = require("supertest");
const app = require("../app");

describe("Helmet Security Headers", () => {
    test("Adds security headers", async () => {
        const response = await request(app)
            .get("/api/health");

        expect(response.statusCode).toBe(200);

        expect(response.headers["x-content-type-options"])
            .toBe("nosniff");

        expect(response.headers["x-frame-options"])
            .toBe("SAMEORIGIN");

        expect(response.headers["strict-transport-security"])
            .toBeDefined();

        expect(response.headers["content-security-policy"])
            .toBeDefined();
    });

    test("Does not expose Express information", async () => {
        const response = await request(app)
            .get("/api/health");

        expect(response.headers["x-powered-by"])
            .toBeUndefined();
    });
});
