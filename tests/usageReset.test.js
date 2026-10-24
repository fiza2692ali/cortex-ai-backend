const Subscription = require("../models/Subscription");
const cron = require("node-cron");

const {
    resetExpiredPeriod
} = require("../services/subscriptionService");

const startUsageResetJob = require(
    "../jobs/usageResetJob"
);

jest.mock("../models/Subscription");
jest.mock("node-cron", () => ({
    schedule: jest.fn()
}));

const OWNER_ID = "507f1f77bcf86cd799439011";
const SUBSCRIPTION_ID = "507f1f77bcf86cd799439012";

function makeSubscription(overrides = {}) {
    return {
        _id: SUBSCRIPTION_ID,
        owner: OWNER_ID,
        plan: "free",
        stripeSubscriptionId: null,
        periodStart: new Date("2026-09-01T00:00:00Z"),
        periodEnd: new Date("2026-10-01T00:00:00Z"),
        messagesUsed: 15,
        documentsUploaded: 4,
        storageUsedBytes: 1024,
        ...overrides
    };
}

describe("Usage Reset Unit Tests", () => {

    beforeEach(() => {
        jest.clearAllMocks();

        jest.useFakeTimers();
        jest.setSystemTime(
            new Date("2026-10-23T12:00:00Z")
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("Does not reset an unexpired subscription", async () => {
        Subscription.findOne.mockResolvedValue(
            makeSubscription({
                periodEnd: new Date(
                    "2026-11-01T00:00:00Z"
                )
            })
        );

        await resetExpiredPeriod(OWNER_ID);

        expect(
            Subscription.updateOne
        ).not.toHaveBeenCalled();
    });

    test("Resets expired Free-plan usage", async () => {
        const expired = makeSubscription();

        Subscription.findOne
            .mockResolvedValueOnce(expired)
            .mockResolvedValueOnce({
                ...expired,
                periodStart: new Date(
                    "2026-10-01T00:00:00Z"
                ),
                periodEnd: new Date(
                    "2026-11-01T00:00:00Z"
                ),
                messagesUsed: 0,
                documentsUploaded: 0
            });

        Subscription.updateOne.mockResolvedValue({
            modifiedCount: 1
        });

        const result = await resetExpiredPeriod(
            OWNER_ID
        );

        expect(
            Subscription.updateOne
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: SUBSCRIPTION_ID,
                stripeSubscriptionId: null
            }),
            {
                $set: expect.objectContaining({
                    messagesUsed: 0,
                    documentsUploaded: 0,
                    periodStart: new Date(
                        "2026-10-01T00:00:00Z"
                    ),
                    periodEnd: new Date(
                        "2026-11-01T00:00:00Z"
                    )
                })
            }
        );

        expect(result.messagesUsed).toBe(0);
    });

    test("Advances across multiple expired months", async () => {
        const expired = makeSubscription({
            periodEnd: new Date(
                "2026-06-01T00:00:00Z"
            )
        });

        Subscription.findOne.mockResolvedValue(expired);

        Subscription.updateOne.mockResolvedValue({
            modifiedCount: 1
        });

        await resetExpiredPeriod(OWNER_ID);

        const update =
            Subscription.updateOne.mock.calls[0][1];

        expect(update.$set.periodStart).toEqual(
            new Date("2026-10-01T00:00:00Z")
        );

        expect(update.$set.periodEnd).toEqual(
            new Date("2026-11-01T00:00:00Z")
        );
    });

    test("Does not locally reset Stripe subscriptions", async () => {
        Subscription.findOne.mockResolvedValue(
            makeSubscription({
                plan: "pro",
                stripeSubscriptionId: "sub_test123"
            })
        );

        await resetExpiredPeriod(OWNER_ID);

        expect(
            Subscription.updateOne
        ).not.toHaveBeenCalled();
    });

    test("Registers the daily UTC cron schedule", () => {
        startUsageResetJob();

        expect(cron.schedule).toHaveBeenCalledWith(
            "0 0 * * *",
            expect.any(Function),
            { timezone: "UTC" }
        );
    });

    test("Cron job resets expired Free subscriptions", async () => {
        startUsageResetJob();

        const callback =
            cron.schedule.mock.calls[0][1];

        Subscription.find.mockResolvedValue([
            makeSubscription()
        ]);

        Subscription.updateOne.mockResolvedValue({
            modifiedCount: 1
        });

        await callback();

        expect(
            Subscription.updateOne
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: SUBSCRIPTION_ID,
                stripeSubscriptionId: null
            }),
            {
                $set: expect.objectContaining({
                    messagesUsed: 0,
                    documentsUploaded: 0
                })
            }
        );
    });

    test("Cron job skips Stripe-managed subscriptions", async () => {
        startUsageResetJob();

        const callback =
            cron.schedule.mock.calls[0][1];

        Subscription.find.mockResolvedValue([]);

        await callback();

        expect(
            Subscription.find
        ).toHaveBeenCalledWith({
            stripeSubscriptionId: null,
            periodEnd: {
                $lte: new Date(
                    "2026-10-23T12:00:00Z"
                )
            }
        });

        expect(
            Subscription.updateOne
        ).not.toHaveBeenCalled();
    });

    test("Preserves storage usage during monthly reset", async () => {
        Subscription.findOne.mockResolvedValue(
            makeSubscription()
        );

        Subscription.updateOne.mockResolvedValue({
            modifiedCount: 1
        });

        await resetExpiredPeriod(OWNER_ID);

        const update =
            Subscription.updateOne.mock.calls[0][1];

        expect(
            update.$set.storageUsedBytes
        ).toBeUndefined();
    });

});