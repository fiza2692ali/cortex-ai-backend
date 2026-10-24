const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

function getBillingOwnerId(req) {
    // Workspace operations use the Team billing owner.
    if (req.workspace) {
        return req.workspace.billingOwner;
    }

    // Personal operations use the authenticated user.
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id
    );
}

function quotaMiddleware(type) {
    return async (req, res, next) => {
        try {
            const ownerId = getBillingOwnerId(req);

            if (!ownerId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            const allowed = await reserveUsage(
                ownerId,
                type
            );

            if (!allowed) {
                return res.status(403).json({
                    success: false,
                    message:
                        `${type} quota exceeded. Upgrade your plan to continue.`
                });
            }

            req.quotaReservation = {
                type,
                ownerId,
                refunded: false,

                async refund() {
                    if (this.refunded) return;

                    await releaseUsage(
                        ownerId,
                        type
                    );

                    this.refunded = true;
                }
            };

            next();

        } catch (error) {
            next(error);
        }
    };
}

module.exports = quotaMiddleware;