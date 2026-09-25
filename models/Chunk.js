const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema(
    {
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Document",
            required: true,
            index: true
        },

        chunkIndex: {
            type: Number,
            required: true
        },

        text: {
            type: String,
            required: true
        },

        tokenCount: {
            type: Number,
            required: true
        },

        embeddingStatus: {
            type: String,
            enum: ["pending", "embedded", "failed"],
            default: "pending"
        },

        embeddingAttempts: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

chunkSchema.index(
    { document: 1, chunkIndex: 1 },
    { unique: true }
);

module.exports = mongoose.model("Chunk", chunkSchema);