const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

function getOwnerId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id
    );
}

function quotaMiddleware(type) {
    return async (req, res, next) => {
        try {
            const ownerId = getOwnerId(req);

            if (!ownerId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const allowed = await reserveUsage(
                ownerId,
                type
            );

            if (!allowed) {
                return res.status(403).json({
                    success: false,
                    message: `${type} quota exceeded. Upgrade your plan to continue.`
                });
            }

            // Allow controllers to refund usage when
            // an operation fails.
            req.quotaReservation = {
                type,
                ownerId,
                async refund() {
                    if (this.refunded) return;
                    this.refunded = true;

                    await releaseUsage(
                        ownerId,
                        type
                    );
                }
            };

            next();

        } catch (error) {
            next(error);
        }
    };
}

module.exports = quotaMiddleware;