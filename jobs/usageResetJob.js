const cron = require("node-cron");
const Subscription = require("../models/Subscription");

function nextMonth(date) {
    const result = new Date(date);
    result.setUTCMonth(
        result.getUTCMonth() + 1
    );
    return result;
}

function startUsageResetJob() {
    // Run at midnight UTC every day.
    cron.schedule("0 0 * * *", async () => {
        try {
            const now = new Date();

            // Free subscriptions use locally managed
            // monthly billing periods.
            const expired =
                await Subscription.find({
                    stripeSubscriptionId: null,
                    periodEnd: { $lte: now }
                });

            for (const subscription of expired) {
                let start =
                    new Date(subscription.periodEnd);

                let end = nextMonth(start);

                while (end <= now) {
                    start = end;
                    end = nextMonth(start);
                }

                await Subscription.updateOne(
                    {
                        _id: subscription._id,
                        stripeSubscriptionId: null,
                        periodEnd: {
                            $lte: now
                        }
                    },
                    {
                        $set: {
                            periodStart: start,
                            periodEnd: end,
                            messagesUsed: 0,
                            documentsUploaded: 0
                        }
                    }
                );
            }

            console.log(
                "Free-plan usage reset check completed"
            );

        } catch (error) {
            console.error(
                "Usage reset job failed:",
                error
            );
        }
    }, {
        timezone: "UTC"
    });
}

module.exports = startUsageResetJob;