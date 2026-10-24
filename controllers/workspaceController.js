
const mongoose = require("mongoose");

const Workspace = require("../models/Workspace");
const User = require("../models/User");
const Document = require("../models/Document");
const ChatSession = require("../models/ChatSession");

function getUserId(req) {
    return req.user?.userId ||
           req.user?.id ||
           req.user?._id;
}

// CREATE WORKSPACE
async function createWorkspace(req, res, next) {
    try {
        const { name, description = "" } = req.body || {};

        if (
            typeof name !== "string" ||
            name.trim().length < 2 ||
            name.trim().length > 100 ||
            typeof description !== "string" ||
            description.length > 500
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid workspace name or description."
            });
        }

        const ownerId = getUserId(req);

        const workspace = await Workspace.create({
            name: name.trim(),
            description: description.trim(),
            owner: ownerId,
            billingOwner: ownerId,
            members: [
                {
                    user: ownerId,
                    role: "owner"
                }
            ]
        });

        return res.status(201).json({
            success: true,
            message: "Workspace created successfully.",
            workspace
        });

    } catch (error) {
        next(error);
    }
}

// LIST WORKSPACES
async function getWorkspaces(req, res, next) {
    try {
        const workspaces = await Workspace.find({
            isActive: true,
            "members.user": getUserId(req)
        })
            .select(
                "name description owner billingOwner " +
                "members isActive createdAt"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: workspaces.length,
            workspaces
        });

    } catch (error) {
        next(error);
    }
}

// GET WORKSPACE DETAILS
async function getWorkspace(req, res, next) {
    try {
        const workspace = await Workspace.findById(
            req.workspace._id
        ).populate(
            "members.user",
            "name email"
        );

        return res.status(200).json({
            success: true,
            workspace
        });

    } catch (error) {
        next(error);
    }
}

// INVITE REGISTERED USER BY EMAIL
async function inviteMember(req, res, next) {
    try {
        const { email } = req.body || {};

        if (
            typeof email !== "string" ||
            !email.trim() ||
            email.length > 254
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid email is required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: cleanEmail,
            isSuspended: { $ne: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "No active registered user found with this email."
            });
        }

        // Atomic update prevents duplicate membership
        // when two invitations arrive simultaneously.
        const updated = await Workspace.findOneAndUpdate(
            {
                _id: req.workspace._id,
                isActive: true,
                "members.user": { $ne: user._id }
            },
            {
                $push: {
                    members: {
                        user: user._id,
                        role: "member",
                        joinedAt: new Date()
                    }
                }
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(409).json({
                success: false,
                message:
                    "User is already a member or workspace is unavailable."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Member added successfully.",
            member: {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: "member"
            }
        });

    } catch (error) {
        next(error);
    }
}

// REMOVE WORKSPACE MEMBER
async function removeMember(req, res, next) {
    try {
        const memberId = req.params.userId;

        if (!mongoose.isValidObjectId(memberId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID."
            });
        }

        if (
            req.workspace.owner.toString() === memberId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Workspace owner cannot be removed."
            });
        }

        const updated = await Workspace.findOneAndUpdate(
            {
                _id: req.workspace._id,
                isActive: true,
                "members.user": memberId
            },
            {
                $pull: {
                    members: {
                        user: memberId
                    }
                }
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Workspace member not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Member removed successfully."
        });

    } catch (error) {
        next(error);
    }
}

// LIST WORKSPACE DOCUMENTS
async function getWorkspaceDocuments(req, res, next) {
    try {
        const documents = await Document.find({
            workspace: req.workspace._id
        })
            .select(
                "owner workspace filename fileType " +
                "fileSize status pageCount uploadedAt"
            )
            .sort({ uploadedAt: -1 });

        return res.status(200).json({
            success: true,
            count: documents.length,
            documents
        });

    } catch (error) {
        next(error);
    }
}

// LIST WORKSPACE CHAT SESSIONS
async function getWorkspaceChatSessions(req, res, next) {
    try {
        const sessions = await ChatSession.find({
            workspace: req.workspace._id
        })
            .select(
                "owner workspace title documentIds createdAt"
            )
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

module.exports = {
    createWorkspace,
    getWorkspaces,
    getWorkspace,
    inviteMember,
    removeMember,
    getWorkspaceDocuments,
    getWorkspaceChatSessions
};
