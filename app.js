const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const searchRoutes = require("./routes/searchRoutes");
const chatRoutes = require("./routes/chatRoutes");
const billingRoutes = require("./routes/billingRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());

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
app.use("/api/search", searchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/billing", billingRoutes);

app.use(errorHandler);

module.exports = app;