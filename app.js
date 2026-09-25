const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const searchRoutes = require("./routes/searchRoutes");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");


const app = express();

app.use(cors());
app.use(express.json());

app.use(logger);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/search", searchRoutes);

app.use(errorHandler);

module.exports = app;