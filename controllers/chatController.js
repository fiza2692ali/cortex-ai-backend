const mongoose = require("mongoose");

const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const Document = require("../models/Document");

const {
    generateRagAnswer
} = require("../services/ragService");

function getOwnerId(req) {
    return req.user?.userId ||
           req.user?.id ||
           req.user?._id;
}

function isValidId(id) {
    return mongoose.isValidObjectId(id);
}

async function refundMessageQuota(req) {
    if (req.quotaReservation) {
        await req.quotaReservation.refund();
    }
}

async function createSession(req, res, next) {
    try {
        const ownerId = getOwnerId(req);
        const {
            title = "New Chat",
            documentIds = []
        } = req.body || {};

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.length > 150
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid session title."
            });
        }

        if (
            !Array.isArray(documentIds) ||
            documentIds.some(id => !isValidId(id))
        ) {
            return res.status(400).json({
                success: false,
                message: "documentIds must contain valid IDs."
            });
        }

        const uniqueIds = [...new Set(
            documentIds.map(String)
        )];

        if (uniqueIds.length > 0) {
            const count = await Document.countDocuments({
                _id: { $in: uniqueIds },
                owner: ownerId,
                status: "ready"
            });

            if (count !== uniqueIds.length) {
                return res.status(400).json({
                    success: false,
                    message:
                        "All selected documents must belong to you and be ready."
                });
            }
        }

        const session = await ChatSession.create({
            owner: ownerId,
            title: title.trim(),
            documentIds: uniqueIds
        });

        return res.status(201).json({
            success: true,
            message: "Chat session created.",
            session
        });

    } catch (error) {
        next(error);
    }
}

async function getSessions(req, res, next) {
    try {
        const sessions = await ChatSession.find({
            owner: getOwnerId(req)
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: sessions.length,
            sessions
        });

    } catch (error) {
        next(error);
    }
}


async function sendMessage(req, res, next) {
    try {
        const ownerId = getOwnerId(req);
        const sessionId = req.params.id;
        const { content } = req.body || {};

        // Validate session ID
        if (!isValidId(sessionId)) {
            await refundMessageQuota(req);

            return res.status(400).json({
                success: false,
                message: "Invalid session ID."
            });
        }

        // Validate message content
        if (
            typeof content !== "string" ||
            !content.trim() ||
            content.length > 4000
        ) {
            await refundMessageQuota(req);

            return res.status(400).json({
                success: false,
                message:
                    "Message must contain 1 to 4000 characters."
            });
        }

        // Find a session belonging to this user
        const session = await ChatSession.findOne({
            _id: sessionId,
            owner: ownerId
        });

        if (!session) {
            await refundMessageQuota(req);

            return res.status(404).json({
                success: false,
                message: "Chat session not found."
            });
        }

        // Retrieve the last 10 messages
        const history = await Message.find({
            session: session._id
        })
            .sort({ createdAt: -1, _id: -1 })
            .limit(10)
            .lean();

        history.reverse();

        // Generate answer using the existing RAG service
        const result = await generateRagAnswer({
            question: content.trim(),
            ownerId,
            documentIds: session.documentIds,
            history
        });

        // Save user message
        const userMessage = await Message.create({
            session: session._id,
            role: "user",
            content: content.trim()
        });

        // Save assistant response
        const assistantMessage = await Message.create({
            session: session._id,
            role: "assistant",
            content: result.answer,
            sources: result.sources
        });

        return res.status(201).json({
            success: true,
            sessionId: session._id,
            userMessage,
            assistantMessage
        });

    } catch (error) {
        try {
            await refundMessageQuota(req);
        } catch (refundError) {
            console.error(
                "Message quota refund failed:",
                refundError
            );
        }

        next(error);
    }
}

async function getMessages(req, res, next) {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID."
            });
        }

        const session = await ChatSession.findOne({
            _id: req.params.id,
            owner: getOwnerId(req)
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found."
            });
        }

        const messages = await Message.find({
            session: session._id
        }).sort({ createdAt: 1, _id: 1 });

        return res.status(200).json({
            success: true,
            sessionId: session._id,
            count: messages.length,
            messages
        });

    } catch (error) {
        next(error);
    }
}

async function deleteSession(req, res, next) {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID."
            });
        }

        const session = await ChatSession.findOne({
            _id: req.params.id,
            owner: getOwnerId(req)
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found."
            });
        }

        await Message.deleteMany({
            session: session._id
        });

        await ChatSession.deleteOne({
            _id: session._id
        });

        return res.status(200).json({
            success: true,
            message:
                "Chat session and messages deleted successfully."
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    createSession,
    getSessions,
    sendMessage,
    getMessages,
    deleteSession
};