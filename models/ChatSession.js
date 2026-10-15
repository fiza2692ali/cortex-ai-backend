const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
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

module.exports = mongoose.model(
    "ChatSession",
    chatSessionSchema
);