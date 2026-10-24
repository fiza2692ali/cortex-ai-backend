function validateEnv() {
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

    const missingVariables = requiredVariables.filter(
        (name) =>
            !process.env[name] ||
            !process.env[name].trim()
    );

    if (missingVariables.length > 0) {
        throw new Error(
            "Missing required environment variables: " +
            missingVariables.join(", ")
        );
    }
}

module.exports = validateEnv;