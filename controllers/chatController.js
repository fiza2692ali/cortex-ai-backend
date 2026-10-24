const mongoose = require("mongoose");

const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const Document = require("../models/Document");

const {
    generateRagAnswer
} = require("../services/ragService");

function getOwnerId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id
    );
}

function getWorkspaceId(req) {
    return req.workspace?._id || null;
}

function sessionFilter(req, id) {
    const workspaceId = getWorkspaceId(req);

    return workspaceId
        ? { _id: id, workspace: workspaceId }
        : {
            _id: id,
            owner: getOwnerId(req),
            workspace: null
        };
}

async function refundMessageQuota(req) {
    await req.quotaReservation?.refund();
}

async function createSession(req, res, next) {
    try {
        const ownerId = getOwnerId(req);
        const workspaceId = getWorkspaceId(req);

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
            documentIds.length > 100 ||
            documentIds.some(
                id => !mongoose.isValidObjectId(id)
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "documentIds must contain valid IDs."
            });
        }

        const uniqueIds = [
            ...new Set(documentIds.map(String))
        ];

        if (uniqueIds.length > 0) {
            const accessFilter = workspaceId
                ? { workspace: workspaceId }
                : { owner: ownerId, workspace: null };

            const count = await Document.countDocuments({
                _id: { $in: uniqueIds },
                ...accessFilter,
                status: "ready"
            });

            if (count !== uniqueIds.length) {
                return res.status(400).json({
                    success: false,
                    message:
                        "All selected documents must be accessible and ready."
                });
            }
        }

        const session = await ChatSession.create({
            owner: ownerId,
            workspace: workspaceId,
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
        const workspaceId = getWorkspaceId(req);

        const filter = workspaceId
            ? { workspace: workspaceId }
            : {
                owner: getOwnerId(req),
                workspace: null
            };

        const sessions = await ChatSession.find(filter)
            .sort({ createdAt: -1 });

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
        const workspaceId = getWorkspaceId(req);
        const sessionId = req.params.sessionId || req.params.id;
        const { content } = req.body || {};

        if (!mongoose.isValidObjectId(sessionId)) {
            await refundMessageQuota(req);

            return res.status(400).json({
                success: false,
                message: "Invalid session ID."
            });
        }

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

        const session = await ChatSession.findOne(
            sessionFilter(req, sessionId)
        );

        if (!session) {
            await refundMessageQuota(req);

            return res.status(404).json({
                success: false,
                message: "Chat session not found."
            });
        }

        // Revalidate document access at message time.
        // A document might have been deleted after
        // the session was created.
        if (session.documentIds.length > 0) {
            const accessFilter = workspaceId
                ? { workspace: workspaceId }
                : { owner: ownerId, workspace: null };

            const count = await Document.countDocuments({
                _id: { $in: session.documentIds },
                ...accessFilter,
                status: "ready"
            });

            if (count !== session.documentIds.length) {
                await refundMessageQuota(req);

                return res.status(400).json({
                    success: false,
                    message:
                        "Some session documents are no longer available."
                });
            }
        }

        const history = await Message.find({
            session: session._id
        })
            .sort({ createdAt: -1, _id: -1 })
            .limit(10)
            .lean();

        history.reverse();

        const result = await generateRagAnswer({
            question: content.trim(),
            ownerId,
            workspaceId,
            documentIds: session.documentIds,
            history
        });

        const userMessage = await Message.create({
            session: session._id,
            role: "user",
            content: content.trim()
        });

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
        const sessionId = req.params.sessionId || req.params.id;

        if (!mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID."
            });
        }

        const session = await ChatSession.findOne(
            sessionFilter(req, sessionId)
        );

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
        const sessionId = req.params.sessionId || req.params.id;

        if (!mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID."
            });
        }

        const session = await ChatSession.findOne(
            sessionFilter(req, sessionId)
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Chat session not found."
            });
        }

        // Only the creator can delete a shared session.
        if (
            getWorkspaceId(req) &&
            String(session.owner) !== String(getOwnerId(req)) &&
            !req.workspace.isOwner(getOwnerId(req))
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only the session creator or workspace owner can delete it."
            });
        }

        await Message.deleteMany({
            session: session._id
        });

        await ChatSession.deleteOne({
            _id: session._id,
            ...(
                getWorkspaceId(req)
                    ? { workspace: getWorkspaceId(req) }
                    : { owner: getOwnerId(req), workspace: null }
            )
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