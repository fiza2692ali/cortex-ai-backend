
const mongoose = require("mongoose");

const Workspace = require("../models/Workspace");
const Subscription = require("../models/Subscription");

function getUserId(req) {
    return req.user?.userId ||
           req.user?.id ||
           req.user?._id;
}

// Check whether the authenticated user has
// an active Team subscription.
async function requireTeamPlan(req, res, next) {
    try {
        const subscription = await Subscription.findOne({
            owner: getUserId(req)
        });

        if (
            !subscription ||
            subscription.plan !== "team" ||
            !["active", "trialing"].includes(
                subscription.status
            ) ||
            (subscription.periodEnd &&
                subscription.periodEnd <= new Date())
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "An active Team subscription is required."
            });
        }

        req.teamSubscription = subscription;
        next();

    } catch (error) {
        next(error);
    }
}

// Check workspace membership and billing eligibility.
async function requireWorkspaceMember(req, res, next) {
    try {
        const workspaceId = req.params.id;
        const userId = getUserId(req);

        if (!mongoose.isValidObjectId(workspaceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid workspace ID."
            });
        }

        const workspace = await Workspace.findById(
            workspaceId
        );

        if (
            !workspace ||
            !workspace.isActive ||
            !workspace.isMember(userId)
        ) {
            return res.status(404).json({
                success: false,
                message: "Workspace not found."
            });
        }

        const subscription = await Subscription.findOne({
            owner: workspace.billingOwner
        });

        if (
            !subscription ||
            subscription.plan !== "team" ||
            !["active", "trialing"].includes(
                subscription.status
            ) ||
            (subscription.periodEnd &&
                subscription.periodEnd <= new Date())
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "This workspace requires an active Team subscription."
            });
        }

        req.workspace = workspace;
        req.teamSubscription = subscription;

        next();

    } catch (error) {
        next(error);
    }
}

// Only the workspace owner can manage members.
function requireWorkspaceOwner(req, res, next) {
    if (
        !req.workspace ||
        !req.workspace.isOwner(getUserId(req))
    ) {
        return res.status(403).json({
            success: false,
            message:
                "Only the workspace owner can perform this action."
        });
    }

    next();
}

module.exports = {
    requireTeamPlan,
    requireWorkspaceMember,
    requireWorkspaceOwner
};
