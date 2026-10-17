const Subscription = require("../models/Subscription");
const { getPlan } = require("../config/plans");

function nextMonth(date) {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + 1);
    return result;
}

async function getSubscription(ownerId) {
    let subscription = await Subscription.findOne({
        owner: ownerId
    });

    if (!subscription) {
        try {
            subscription = await Subscription.create({
                owner: ownerId
            });
        } catch (error) {
            if (error.code !== 11000) {
                throw error;
            }

            subscription = await Subscription.findOne({
                owner: ownerId
            });
        }
    }

    return subscription;
}

async function resetExpiredPeriod(ownerId) {
    const subscription = await getSubscription(ownerId);

    // Stripe manages paid billing-period dates.
    // Do not advance paid periods using a local calendar.
    if (subscription.stripeSubscriptionId) {
        return subscription;
    }

    const now = new Date();

    if (subscription.periodEnd > now) {
        return subscription;
    }

    let newStart = new Date(subscription.periodEnd);
    let newEnd = nextMonth(newStart);

    while (newEnd <= now) {
        newStart = newEnd;
        newEnd = nextMonth(newStart);
    }

    await Subscription.updateOne(
        {
            _id: subscription._id,
            periodEnd: { $lte: now },
            stripeSubscriptionId: null
        },
        {
            $set: {
                periodStart: newStart,
                periodEnd: newEnd,
                messagesUsed: 0,
                documentsUploaded: 0
            }
        }
    );

    return getSubscription(ownerId);
}

async function reserveUsage(ownerId, type, amount = 1) {
    await resetExpiredPeriod(ownerId);

    const field = {
        message: "messagesUsed",
        document: "documentsUploaded",
        storage: "storageUsedBytes"
    }[type];

    const limitField = {
        message: "maxMessages",
        document: "maxDocuments",
        storage: "maxStorageBytes"
    }[type];

    if (!field || !Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid usage reservation");
    }

    const subscription = await getSubscription(ownerId);
    const plan = getPlan(subscription.plan);
    const limit = plan[limitField];

    const updated = await Subscription.findOneAndUpdate(
        {
            _id: subscription._id,
            [field]: { $lte: limit - amount }
        },
        {
            $inc: { [field]: amount }
        },
        { new: true }
    );

    return Boolean(updated);
}

async function releaseUsage(ownerId, type, amount = 1) {
    const field = {
        message: "messagesUsed",
        document: "documentsUploaded",
        storage: "storageUsedBytes"
    }[type];

    if (!field || !Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid usage release");
    }

    await Subscription.updateOne(
        {
            owner: ownerId,
            [field]: { $gte: amount }
        },
        {
            $inc: { [field]: -amount }
        }
    );
}

module.exports = {
    getSubscription,
    resetExpiredPeriod,
    reserveUsage,
    releaseUsage
};