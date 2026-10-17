const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

async function storageQuotaMiddleware(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const ownerId =
            req.user?.userId ||
            req.user?.id ||
            req.user?._id;

        const size = req.file.size;

        const allowed = await reserveUsage(
            ownerId,
            "storage",
            size
        );

        if (!allowed) {
            await req.quotaReservation?.refund();
            
            return res.status(403).json({
                success: false,
                message: "Storage quota exceeded"
            });
        }

        req.storageReservation = {
            ownerId,
            size,
            async refund() {
                if (this.refunded) return;
                this.refunded = true;

                await releaseUsage(
                    ownerId,
                    "storage",
                    size
                );
            }
        };

        next();

    } catch (error) {
        next(error);
    }
}

module.exports = storageQuotaMiddleware;