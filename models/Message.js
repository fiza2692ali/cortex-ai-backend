const mongoose = require("mongoose");

const sourceSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true
    },

    chunkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chunk",
        required: true
    },

    filename: String,
    chunkIndex: Number,
    score: Number
}, { _id: false });

const messageSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatSession",
        required: true,
        index: true
    },

    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },

    content: {
        type: String,
        required: true
    },

    sources: {
        type: [sourceSchema],
        default: []
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

messageSchema.index({
    session: 1,
    createdAt: 1
});

module.exports = mongoose.model("Message", messageSchema);