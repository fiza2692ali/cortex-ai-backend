
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header is missing."
            });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message:
                    "Authorization header must use Bearer token."
            });
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token is missing."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        // Verify JWT signature and expiration
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload."
            });
        }

        // Retrieve current user from database
        const user = await User.findById(
            decoded.userId
        ).select("_id name email role isSuspended");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists."
            });
        }

        // Block suspended users, including those
        // holding previously issued valid JWTs.
        if (user.isSuspended) {
            return res.status(403).json({
                success: false,
                message: "This account has been suspended."
            });
        }

        // Keep userId and id for compatibility
        // with existing Week 1-6 controllers.
        req.user = {
            userId: user._id.toString(),
            id: user._id.toString(),
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token."
            });
        }

        if (error.name === "CastError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload."
            });
        }

        console.error("Authentication error:", error);

        next(error);
    }
};

module.exports = authMiddleware;
