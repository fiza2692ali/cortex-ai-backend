const helmet = require("helmet");
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const searchRoutes = require("./routes/searchRoutes");
const chatRoutes = require("./routes/chatRoutes");
const billingRoutes = require("./routes/billingRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const adminRoutes = require("./routes/adminRoutes");

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const {
    searchLimiter
} = require("./middleware/rateLimiter");

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(cors());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    webhookRoutes
);

app.use(express.json());
app.use(logger);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/search", searchLimiter, searchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

module.exports = app;