const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.use(logger);

app.use("/api/health", healthRoutes);

app.use(errorHandler);

module.exports = app;