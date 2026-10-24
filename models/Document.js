
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        // User who uploaded the document
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        // Null means this is a personal document
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            default: null,
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

        fileSize: {
            type: Number,
            default: 0,
            min: 0
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

// Supports efficient workspace document queries
documentSchema.index({
    workspace: 1,
    uploadedAt: -1
});

module.exports = mongoose.model(
    "Document",
    documentSchema
);
