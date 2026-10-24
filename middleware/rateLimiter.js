const { rateLimit } = require("express-rate-limit");

// Prevent excessive login and registration attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication requests. Please try again after 15 minutes."
    }
});

// Protect expensive AI message generation
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many chat requests. Please try again shortly."
    }
});

// Limit semantic search requests
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many search requests. Please try again shortly."
    }
});

module.exports = {
    authLimiter,
    chatLimiter,
    searchLimiter
};
