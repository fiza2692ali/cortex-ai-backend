require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const startUsageResetJob = require("./jobs/usageResetJob");

const PORT = process.env.PORT || 5000;

connectDB();
startUsageResetJob();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});