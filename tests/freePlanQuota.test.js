const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../models/User");
jest.mock("../models/Subscription");

const User = require("../models/User");
const Subscription = require("../models/Subscription");

const app = require("../app");

const USER_ID = "507f1f77bcf86cd799439011";
const SUBSCRIPTION_ID = "507f1f77bcf86cd799439012";
const SESSION_ID = "507f1f77bcf86cd799439013";

describe("Free Plan Quota Enforcement", () => {

    let token;

    beforeAll(() => {
        token = jwt.sign(
            {
                userId: USER_ID,
                email: "freeuser@example.com"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock the authenticated user.
        User.findById.mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: USER_ID,
                name: "Free Plan User",
                email: "freeuser@example.com",
                role: "user",
                isSuspended: false
            })
        });

        // Simulate a Free user who has used
        // all 20 monthly messages.
        Subscription.findOne.mockResolvedValue({
            _id: SUBSCRIPTION_ID,
            owner: USER_ID,
            plan: "free",
            status: "active",
            stripeSubscriptionId: null,
            periodStart: new Date("2026-10-01"),
            periodEnd: new Date("2099-01-01"),
            messagesUsed: 20,
            documentsUploaded: 0,
            storageUsedBytes: 0
        });

        // The real quota service uses an atomic
        // conditional update to reserve usage.
        // MongoDB returns null if the condition
        // cannot be satisfied.
        Subscription.findOneAndUpdate.mockResolvedValue(
            null
        );
    });

    test(
        "Blocks a Free user after 20 messages",
        async () => {

            const response = await request(app)
                .post(
                    `/api/chat/sessions/${SESSION_ID}/messages`
                )
                .set(
                    "Authorization",
                    `Bearer ${token}`
                )
                .send({
                    content: "Can you explain this document?"
                });

            expect(response.statusCode).toBe(403);

            expect(response.body).toEqual({
                success: false,
                message:
                    "message quota exceeded. Upgrade your plan to continue."
            });

            // Verify the service attempted to
            // reserve quota using the Free-plan limit.
            expect(
                Subscription.findOneAndUpdate
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    _id: SUBSCRIPTION_ID,
                    messagesUsed: {
                        $lte: 19
                    }
                }),
                {
                    $inc: {
                        messagesUsed: 1
                    }
                },
                {
                    new: true
                }
            );

            // No message quota should be consumed
            // when the user is already at the limit.
            expect(
                Subscription.findOneAndUpdate
            ).toHaveBeenCalledTimes(1);
        }
    );

});
