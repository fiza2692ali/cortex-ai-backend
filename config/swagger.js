const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Cortex AI Backend API",
            version: "1.0.0",
            description:
                "API documentation for Cortex AI Backend, including authentication, document processing, semantic search, AI chat, billing, team workspaces, and administration."
        },
        servers: [
            {
                url: "/",
                description: "Local development server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        },
        tags: [
            { name: "Health", description: "Server health checks" },
            { name: "Authentication", description: "User registration and login" },
            { name: "Documents", description: "Document management" },
            { name: "Search", description: "Semantic document search" },
            { name: "Chat", description: "AI chat and RAG sessions" },
            { name: "Billing", description: "Plans and subscriptions" },
            { name: "Workspaces", description: "Team collaboration" },
            { name: "Admin", description: "Administrative operations" },
            { name: "Webhooks", description: "Stripe webhook events" }
        ]
    },
    apis: ["./routes/*.js"]
};

module.exports = swaggerJsdoc(options);
