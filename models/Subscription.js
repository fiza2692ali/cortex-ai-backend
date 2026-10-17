const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },

        plan: {
            type: String,
            enum: ["free", "pro", "team"],
            default: "free"
        },

        status: {
            type: String,
            default: "active"
        },

        stripeCustomerId: {
            type: String,
            default: null
        },

        stripeSubscriptionId: {
            type: String,
            default: null
        },

        stripePriceId: {
            type: String,
            default: null
        },

        cancelAtPeriodEnd: {
            type: Boolean,
            default: false
        },

        periodStart: {
            type: Date,
            default: Date.now
        },

        periodEnd: {
            type: Date,
            default: () => {
                const date = new Date();
                date.setUTCMonth(date.getUTCMonth() + 1);
                return date;
            }
        },

        messagesUsed: {
            type: Number,
            default: 0
        },

        documentsUploaded: {
            type: Number,
            default: 0
        },

        storageUsedBytes: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "Subscription",
    subscriptionSchema
);