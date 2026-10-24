
const mongoose = require("mongoose");

const workspaceMemberSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        role: {
            type: String,
            enum: ["owner", "member"],
            default: "member"
        },

        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

const workspaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        members: {
            type: [workspaceMemberSchema],
            default: []
        },

        // Team subscription belongs to this user
        billingOwner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Find workspaces belonging to a member
workspaceSchema.index({
    "members.user": 1
});

// Check whether a user belongs to a workspace
workspaceSchema.methods.isMember = function (userId) {
    return this.members.some(member =>
        member.user.toString() === userId.toString()
    );
};

// Check whether a user owns a workspace
workspaceSchema.methods.isOwner = function (userId) {
    return this.owner.toString() === userId.toString();
};

module.exports = mongoose.model(
    "Workspace",
    workspaceSchema
);
