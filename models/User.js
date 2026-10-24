
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        // Platform-level role
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        // Used by admin suspension endpoint
        isSuspended: {
            type: Boolean,
            default: false
        },

        suspendedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
