const stripe = require("../config/stripe");

const {
    PLANS
} = require("../config/plans");

const {
    getSubscription,
    resetExpiredPeriod
} = require("../services/subscriptionService");

function getOwnerId(req) {
    return (
        req.user?.userId ||
        req.user?.id ||
        req.user?._id
    );
}

// GET /api/billing/plans
exports.getPlans = async (req, res, next) => {
    try {
        res.json({
            success: true,
            plans: PLANS
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/billing/me
exports.getMyBilling = async (req, res, next) => {
    try {
        const ownerId = getOwnerId(req);

        const subscription =
            await resetExpiredPeriod(ownerId);

        res.json({
            success: true,
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                cancelAtPeriodEnd:
                    subscription.cancelAtPeriodEnd,
                periodStart: subscription.periodStart,
                periodEnd: subscription.periodEnd
            },
            usage: {
                documentsUploaded:
                    subscription.documentsUploaded,
                messagesUsed:
                    subscription.messagesUsed,
                storageUsedBytes:
                    subscription.storageUsedBytes
            },
            limits: PLANS[subscription.plan]
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/billing/checkout
exports.createCheckout = async (req, res, next) => {
    try {
        const { plan } = req.body;
        const ownerId = getOwnerId(req);

        if (!["pro", "team"].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: "Select pro or team"
            });
        }

        const priceId =
            plan === "pro"
                ? process.env.STRIPE_PRO_PRICE_ID
                : process.env.STRIPE_TEAM_PRICE_ID;

        if (!priceId) {
            return res.status(500).json({
                success: false,
                message: "Stripe price is not configured"
            });
        }

        const subscription =
            await getSubscription(ownerId);

        if (subscription.stripeSubscriptionId) {
            return res.status(409).json({
                success: false,
                message:
                    "An existing Stripe subscription is already linked to this account."
            });
        }

        let customerId =
            subscription.stripeCustomerId;

        if (!customerId) {
            const customer =
                await stripe.customers.create({
                    metadata: {
                        ownerId: String(ownerId)
                    }
                });

            customerId = customer.id;

            await subscription.updateOne({
                stripeCustomerId: customerId
            });
        }

        const session =
            await stripe.checkout.sessions.create({
                mode: "subscription",
                customer: customerId,

                line_items: [
                    {
                        price: priceId,
                        quantity: 1
                    }
                ],

                client_reference_id:
                    String(ownerId),

                metadata: {
                    ownerId: String(ownerId),
                    plan
                },

                subscription_data: {
                    metadata: {
                        ownerId: String(ownerId),
                        plan
                    }
                },

                success_url:
                    `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,

                cancel_url:
                    `${process.env.CLIENT_URL}/billing/cancel`
            });

        res.json({
            success: true,
            checkoutUrl: session.url,
            sessionId: session.id
        });

    } catch (error) {
        next(error);
    }
};

// POST /api/billing/cancel
exports.cancelSubscription = async (
    req,
    res,
    next
) => {
    try {
        const ownerId = getOwnerId(req);

        const subscription =
            await getSubscription(ownerId);

        if (!subscription.stripeSubscriptionId) {
            return res.status(400).json({
                success: false,
                message:
                    "No paid subscription to cancel"
            });
        }

        await stripe.subscriptions.update(
            subscription.stripeSubscriptionId,
            {
                cancel_at_period_end: true
            }
        );

        // The webhook will synchronize the local state.
        res.json({
            success: true,
            message:
                "Cancellation requested. The subscription will end at the current billing period's end."
        });

    } catch (error) {
        next(error);
    }
};