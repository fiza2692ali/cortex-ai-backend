
const path = require("path");

// Prevent tests from using the real application environment.
process.env.NODE_ENV = "test";

// Remove potentially inherited production credentials.
for (const key of [
    "MONGODB_URI",
    "GEMINI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "QDRANT_URL",
    "QDRANT_API_KEY",
    "JWT_SECRET"
]) {
    delete process.env[key];
}

// Load only test-specific environment variables.
require("dotenv").config({
    path: path.join(__dirname, ".env.test"),
    override: true,
    quiet: true
});

// Prevent accidental MongoDB connections during tests.
const mongoose = require("mongoose");

jest.spyOn(mongoose, "connect").mockImplementation(() => {
    throw new Error(
        "Real MongoDB connections are disabled during Jest tests."
    );
});
