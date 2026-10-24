const fs = require("fs/promises");

const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

async function removeUploadedFile(req) {
    if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
    }
}

async function storageQuotaMiddleware(req, res, next) {
    try {
        if (!req.file) {
            await req.quotaReservation?.refund();

            return res.status(400).json({
                success: false,
                message: "No file uploaded."
            });
        }

        // Workspace uploads charge the Team billing owner.
        // Personal uploads charge the authenticated user.
        const ownerId = req.workspace
            ? req.workspace.billingOwner
            : (
                req.user?.userId ||
                req.user?.id ||
                req.user?._id
            );

        if (!ownerId) {
            await removeUploadedFile(req);
            await req.quotaReservation?.refund();

            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const size = req.file.size;

        if (!Number.isSafeInteger(size) || size <= 0) {
            await removeUploadedFile(req);
            await req.quotaReservation?.refund();

            return res.status(400).json({
                success: false,
                message: "Uploaded file must not be empty."
            });
        }

        const allowed = await reserveUsage(
            ownerId,
            "storage",
            size
        );

        if (!allowed) {
            await removeUploadedFile(req);
            await req.quotaReservation?.refund();

            return res.status(403).json({
                success: false,
                message: "Storage quota exceeded."
            });
        }

        req.storageReservation = {
            ownerId,
            size,
            refunded: false,

            async refund() {
                if (this.refunded) return;

                await releaseUsage(
                    ownerId,
                    "storage",
                    size
                );

                this.refunded = true;
            }
        };

        next();

    } catch (error) {
        await removeUploadedFile(req);

        try {
            await req.quotaReservation?.refund();
        } catch (refundError) {
            console.error(
                "Quota refund error:",
                refundError
            );
        }

        next(error);
    }
}

module.exports = storageQuotaMiddleware;