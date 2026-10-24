const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
    // User who created the chat session
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // Null means personal chat session
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        default: null,
        index: true
    },

    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },

    documentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document"
    }],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Efficiently list workspace chat sessions
chatSessionSchema.index({
    workspace: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "ChatSession",
    chatSessionSchema
);
