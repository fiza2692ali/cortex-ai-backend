const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        filename: {
            type: String,
            required: true,
            trim: true
        },

        fileType: {
            type: String,
            required: true,
            enum: ["pdf", "docx", "txt"]
        },

        status: {
            type: String,
            enum: ["processing", "ready", "failed"],
            default: "processing"
        },

        pageCount: {
            type: Number,
            default: 0
        },

        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Document", documentSchema);