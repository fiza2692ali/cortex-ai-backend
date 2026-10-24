const Subscription = require("../models/Subscription");

const {
    reserveUsage,
    releaseUsage
} = require("../services/subscriptionService");

const quotaMiddleware = require(
    "../middleware/quotaMiddleware"
);

const { getPlan } = require("../config/plans");

jest.mock("../models/Subscription");

const OWNER_ID = "507f1f77bcf86cd799439011";
const TEAM_OWNER_ID = "507f191e810c19729de860ea";

function makeSubscription(overrides = {}) {
    return {
        _id: "507f1f77bcf86cd799439012",
        owner: OWNER_ID,
        plan: "free",
        periodStart: new Date("2026-10-01"),
        periodEnd: new Date("2099-01-01"),
        stripeSubscriptionId: null,
        messagesUsed: 0,
        documentsUploaded: 0,
        storageUsedBytes: 0,
        ...overrides
    };
}

describe("Quota Calculation Unit Tests", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Free plan has the expected quota limits", () => {
        const plan = getPlan("free");

        expect(plan.maxDocuments).toBe(5);
        expect(plan.maxMessages).toBe(20);
        expect(plan.maxStorageBytes).toBe(
            25 * 1024 * 1024
        );
    });

    test("Allows a message when quota is available", async () => {
        const subscription = makeSubscription({
            messagesUsed: 19
        });

        Subscription.findOne.mockResolvedValue(subscription);

        Subscription.findOneAndUpdate.mockResolvedValue({
            ...subscription,
            messagesUsed: 20
        });

        const allowed = await reserveUsage(
            OWNER_ID,
            "message"
        );

        expect(allowed).toBe(true);

        expect(
            Subscription.findOneAndUpdate
        ).toHaveBeenCalledWith(
            expect.objectContaining({
                messagesUsed: { $lte: 19 }
            }),
            {
                $inc: { messagesUsed: 1 }
            },
            { new: true }
        );
    });

    test("Rejects a message when quota is exhausted", async () => {
        Subscription.findOne.mockResolvedValue(
            makeSubscription({
                messagesUsed: 20
            })
        );

        Subscription.findOneAndUpdate.mockResolvedValue(
            null
        );

        const allowed = await reserveUsage(
            OWNER_ID,
            "message"
        );

        expect(allowed).toBe(false);
    });

    test("Rejects a document upload after the limit", async () => {
        Subscription.findOne.mockResolvedValue(
            makeSubscription({
                documentsUploaded: 5
            })
        );

        Subscription.findOneAndUpdate.mockResolvedValue(
            null
        );

        const allowed = await reserveUsage(
            OWNER_ID,
            "document"
        );

        expect(allowed).toBe(false);
    });

    test("Rejects storage exceeding the plan limit", async () => {
        Subscription.findOne.mockResolvedValue(
            makeSubscription()
        );

        Subscription.findOneAndUpdate.mockResolvedValue(
            null
        );

        const allowed = await reserveUsage(
            OWNER_ID,
            "storage",
            30 * 1024 * 1024
        );

        expect(allowed).toBe(false);
    });

    test("Releases message quota after a failed request", async () => {
        Subscription.updateOne.mockResolvedValue({
            modifiedCount: 1
        });

        await releaseUsage(
            OWNER_ID,
            "message"
        );

        expect(
            Subscription.updateOne
        ).toHaveBeenCalledWith(
            {
                owner: OWNER_ID,
                messagesUsed: { $gte: 1 }
            },
            {
                $inc: { messagesUsed: -1 }
            }
        );
    });

    test("Rejects invalid reservation types", async () => {
        await expect(
            reserveUsage(OWNER_ID, "invalid")
        ).rejects.toThrow(
            "Invalid usage reservation"
        );
    });

    test("Rejects invalid release amounts", async () => {
        await expect(
            releaseUsage(OWNER_ID, "message", -1)
        ).rejects.toThrow(
            "Invalid usage release"
        );
    });

    test("Charges workspace quota to the Team owner", async () => {
        const subscriptionService = require(
            "../services/subscriptionService"
        );

        const middleware = quotaMiddleware("message");

        const req = {
            user: {
                userId: OWNER_ID
            },
            workspace: {
                billingOwner: TEAM_OWNER_ID
            }
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        const next = jest.fn();

        Subscription.findOne.mockResolvedValue(
            makeSubscription({
                owner: TEAM_OWNER_ID,
                plan: "team"
            })
        );

        Subscription.findOneAndUpdate.mockResolvedValue({
            messagesUsed: 1
        });

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();

        expect(
            Subscription.findOne
        ).toHaveBeenCalledWith({
            owner: TEAM_OWNER_ID
        });

        expect(req.quotaReservation.ownerId)
            .toBe(TEAM_OWNER_ID);
    });

    test("Returns 403 when message quota is exhausted", async () => {
        const middleware = quotaMiddleware("message");

        const req = {
            user: {
                userId: OWNER_ID
            }
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        const next = jest.fn();

        Subscription.findOne.mockResolvedValue(
            makeSubscription({
                messagesUsed: 20
            })
        );

        Subscription.findOneAndUpdate.mockResolvedValue(
            null
        );

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

});
