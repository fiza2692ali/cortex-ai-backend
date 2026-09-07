const express = require("express");
const {
    registerUser,
    loginUser
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Register a new user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

// Get logged-in user's information
router.get("/me", protect, (req, res) => {
    res.status(200).json({
        success: true,
        user: {
            id: req.user.userId,
            email: req.user.email
        }
    });
});

module.exports = router;