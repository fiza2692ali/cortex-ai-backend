const validateEnv = require("../config/validateEnv");

describe("Environment Security Tests", () => {
    const requiredVariables = [
        "MONGODB_URI",
        "JWT_SECRET",
        "GEMINI_API_KEY",
        "QDRANT_URL",
        "QDRANT_API_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRO_PRICE_ID",
        "STRIPE_TEAM_PRICE_ID"
    ];

    const originalValues = {};

    beforeEach(() => {
        for (const name of requiredVariables) {
            originalValues[name] = process.env[name];
            process.env[name] = "test-value";
        }
    });

    afterEach(() => {
        for (const name of requiredVariables) {
            if (originalValues[name] === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = originalValues[name];
            }
        }
    });

    test("Accepts configuration when all required variables exist", () => {
        expect(() => validateEnv()).not.toThrow();
    });

    test("Rejects configuration when JWT_SECRET is missing", () => {
        delete process.env.JWT_SECRET;

        expect(() => validateEnv()).toThrow(
            "Missing required environment variables: JWT_SECRET"
        );
    });

    test("Rejects configuration when multiple secrets are missing", () => {
        delete process.env.MONGODB_URI;
        delete process.env.GEMINI_API_KEY;

        expect(() => validateEnv()).toThrow(
            /MONGODB_URI.*GEMINI_API_KEY/
        );
    });

    test("Rejects empty or whitespace-only secrets", () => {
        process.env.STRIPE_SECRET_KEY = "   ";

        expect(() => validateEnv()).toThrow(
            /STRIPE_SECRET_KEY/
        );
    });
});