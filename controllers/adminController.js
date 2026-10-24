const mongoose = require("mongoose");

const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Subscription = require("../models/Subscription");
const Message = require("../models/Message");
const ChatSession = require("../models/ChatSession");

// Pagination helper
function getPagination(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);

    if (
        !Number.isInteger(page) ||
        !Number.isInteger(limit) ||
        page < 1 ||
        limit < 1 ||
        limit > 100
    ) {
        return null;
    }

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
}

// GET /api/admin/users
async function getUsers(req, res, next) {
    try {
        const pagination = getPagination(req.query);

        if (!pagination) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters."
            });
        }

        const { page, limit, skip } = pagination;

        const [users, total] = await Promise.all([
            User.find()
                .select(
                    "name email role isSuspended suspendedAt createdAt"
                )
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments()
        ]);

        return res.status(200).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            users
        });

    } catch (error) {
        next(error);
    }
}

// GET /api/admin/workspaces
async function getWorkspaces(req, res, next) {
    try {
        const pagination = getPagination(req.query);

        if (!pagination) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters."
            });
        }

        const { page, limit, skip } = pagination;

        const [workspaces, total] = await Promise.all([
            Workspace.find()
                .select(
                    "name description owner billingOwner " +
                    "members isActive createdAt updatedAt"
                )
                .populate("owner", "name email")
                .populate("billingOwner", "name email")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Workspace.countDocuments()
        ]);

        return res.status(200).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            workspaces
        });

    } catch (error) {
        next(error);
    }
}

// PATCH /api/admin/users/:id/suspend
async function suspendUser(req, res, next) {
    try {
        const { id } = req.params;
        const { suspend } = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        if (typeof suspend !== "boolean") {
            return res.status(400).json({
                success: false,
                message:
                    "suspend must be true or false."
            });
        }

        // Prevent an admin from suspending themselves.
        if (String(id) === String(req.user.userId)) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot suspend your own admin account."
            });
        }

        // Protect other administrator accounts.
        const user = await User.findOneAndUpdate(
            {
                _id: id,
                role: "user"
            },
            {
                $set: {
                    isSuspended: suspend,
                    suspendedAt: suspend ? new Date() : null
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).select(
            "name email role isSuspended suspendedAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "Regular user not found or account cannot be modified."
            });
        }

        return res.status(200).json({
            success: true,
            message: suspend
                ? "User suspended successfully."
                : "User reactivated successfully.",
            user
        });

    } catch (error) {
        next(error);
    }
}

// GET /api/admin/analytics
async function getAnalytics(req, res, next) {
    try {
        const now = new Date();

        // Start of today in UTC.
        const todayStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        ));

        // 30 calendar days, including today.
        const thirtyDaysAgo = new Date(todayStart);
        thirtyDaysAgo.setUTCDate(
            thirtyDaysAgo.getUTCDate() - 29
        );

        const [
            totalUsers,
            totalWorkspaces,
            activeWorkspaces,
            suspendedUsers,
            planDistribution,
            subscriptionStatuses,
            messagesPerDay,
            dailyActiveUserIds
        ] = await Promise.all([
            User.countDocuments(),

            Workspace.countDocuments(),

            Workspace.countDocuments({
                isActive: true
            }),

            User.countDocuments({
                isSuspended: true
            }),

            Subscription.aggregate([
                {
                    $group: {
                        _id: "$plan",
                        count: { $sum: 1 }
                    }
                }
            ]),

            Subscription.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]),

            Message.aggregate([
                {
                    $match: {
                        role: "user",
                        createdAt: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "UTC"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]),

            // DAU is based on users who sent chat messages today.
            Message.aggregate([
                {
                    $match: {
                        role: "user",
                        createdAt: { $gte: todayStart }
                    }
                },
                {
                    $lookup: {
                        from: ChatSession.collection.name,
                        localField: "session",
                        foreignField: "_id",
                        as: "sessionData"
                    }
                },
                { $unwind: "$sessionData" },
                {
                    $group: {
                        _id: "$sessionData.owner"
                    }
                }
            ])
        ]);

        const plans = {
            free: 0,
            pro: 0,
            team: 0
        };

        for (const item of planDistribution) {
            if (Object.hasOwn(plans, item._id)) {
                plans[item._id] = item.count;
            }
        }

        const statuses = {};

        for (const item of subscriptionStatuses) {
            statuses[item._id] = item.count;
        }

        const messageCountMap = new Map(
            messagesPerDay.map(item => [
                item._id,
                item.count
            ])
        );

        const last30Days = [];

        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setUTCDate(date.getUTCDate() + i);

            const dateKey = date.toISOString().slice(0, 10);

            last30Days.push({
                date: dateKey,
                messages: messageCountMap.get(dateKey) || 0
            });
        }

        return res.status(200).json({
            success: true,
            generatedAt: now,

            overview: {
                totalUsers,
                suspendedUsers,
                totalWorkspaces,
                activeWorkspaces,
                dailyActiveUsers: dailyActiveUserIds.length
            },

            planDistribution: plans,

            subscriptionStatuses: statuses,

            subscriptions: {
                active: statuses.active || 0,
                cancelled: statuses.canceled ||
                           statuses.cancelled || 0,
                scheduledToCancel:
                    await Subscription.countDocuments({
                        cancelAtPeriodEnd: true,
                        status: {
                            $in: ["active", "trialing"]
                        }
                    })
            },

            messagesPerDay: last30Days
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    getUsers,
    getWorkspaces,
    suspendUser,
    getAnalytics
};
