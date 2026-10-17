const stripe = require("../config/stripe");
const Subscription = require("../models/Subscription");

const {
    getPlanFromPriceId
} = require("../config/plans");

function getId(value) {
    return typeof value === "string"
        ? value
        : value?.id;
}

function stripeDate(seconds) {
    return seconds
        ? new Date(seconds * 1000)
        : null;
}

async function syncSubscription(stripeSubscription) {
    const customerId = getId(
        stripeSubscription.customer
    );

    const subscriptionId = stripeSubscription.id;

    let local = await Subscription.findOne({
        stripeCustomerId: customerId
    });

    if (!local) {
        const ownerId =
            stripeSubscription.metadata?.ownerId;

        if (ownerId) {
            local = await Subscription.findOne({
                owner: ownerId
            });
        }
    }

    if (!local) {
        throw new Error(
            `No local subscription found for ${subscriptionId}`
        );
    }

    const item =
        stripeSubscription.items?.data?.[0];

    const priceId = getId(item?.price);

    const plan = getPlanFromPriceId(priceId);

    if (!plan) {
        throw new Error(
            `Unrecognized Stripe price: ${priceId}`
        );
    }

    // Current Stripe API versions may expose billing
    // period dates on subscription items.
    const startSeconds =
        item?.current_period_start ||
        stripeSubscription.current_period_start;

    const endSeconds =
        item?.current_period_end ||
        stripeSubscription.current_period_end;

    if (!startSeconds || !endSeconds) {
        throw new Error(
            "Stripe billing-period dates are missing"
        );
    }

    const newStart = stripeDate(startSeconds);
    const newEnd = stripeDate(endSeconds);

    // Stripe may retry webhooks or deliver them out of order.
    // Do not reset counters for the same billing period.
    const isNewPeriod =
        !local.stripeSubscriptionId ||
        newStart > local.periodStart;

    const status = stripeSubscription.status;

    const hasAccess = [
        "active",
        "trialing"
    ].includes(status);

    const update = {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        status,
        plan: hasAccess ? plan : "free",
        cancelAtPeriodEnd:
            stripeSubscription.cancel_at_period_end,
        periodStart: newStart,
        periodEnd: newEnd
    };

    if (isNewPeriod) {
        update.messagesUsed = 0;
        update.documentsUploaded = 0;
    }

    await Subscription.updateOne(
        { _id: local._id },
        { $set: update }
    );
}

exports.handleStripeWebhook = async (
    req,
    res
) => {
    const signature =
        req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error(
            "Invalid Stripe webhook signature:",
            error.message
        );

        return res.status(400).send(
            "Invalid webhook signature"
        );
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;

                if (
                    session.mode !== "subscription" ||
                    !session.subscription
                ) {
                    break;
                }

                const subscription =
                    await stripe.subscriptions.retrieve(
                        getId(session.subscription)
                    );

                await syncSubscription(subscription);
                break;
            }

            case "customer.subscription.updated": {
                const subscription =
                    await stripe.subscriptions.retrieve(
                        event.data.object.id
                    );

                await syncSubscription(subscription);
                break;
            }

            case "customer.subscription.deleted": {
                const deleted = event.data.object;

                const local =
                    await Subscription.findOne({
                        stripeSubscriptionId:
                            deleted.id
                    });

                if (local) {
                    await Subscription.updateOne(
                        { _id: local._id },
                        {
                            $set: {
                                plan: "free",
                                status: "canceled",
                                cancelAtPeriodEnd: false,
                                stripeSubscriptionId: null,
                                stripePriceId: null,
                                messagesUsed: 0,
                                documentsUploaded: 0,
                                periodStart: new Date(),
                                periodEnd: new Date(
                                    Date.now() +
                                    30 * 24 * 60 * 60 * 1000
                                )
                            }
                        }
                    );
                }

                break;
            }

            default:
                console.log(
                    "Ignored Stripe event:",
                    event.type
                );
        }

        return res.json({
            received: true
        });

    } catch (error) {
        console.error(
            "Stripe webhook processing failed:",
            error
        );

        // Stripe will retry delivery for non-2xx responses.
        return res.status(500).json({
            received: false,
            message: "Webhook processing failed"
        });
    }
};