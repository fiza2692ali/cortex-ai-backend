const request = require("supertest");

jest.mock("../config/stripe", () => ({
    webhooks: {
        constructEvent: jest.fn()
    },
    subscriptions: {
        retrieve: jest.fn()
    }
}));

jest.mock("../models/Subscription", () => ({
    findOne: jest.fn(),
    updateOne: jest.fn()
}));

const stripe = require("../config/stripe");
const Subscription = require("../models/Subscription");
const app = require("../app");

describe("Stripe Webhook Security Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Rejects a webhook with an invalid signature", async () => {
        stripe.webhooks.constructEvent.mockImplementation(() => {
            throw new Error("Invalid signature");
        });

        const response = await request(app)
            .post("/api/webhooks/stripe")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "invalid-signature")
            .send(JSON.stringify({
                type: "customer.subscription.updated",
                data: {
                    object: {
                        id: "sub_fake"
                    }
                }
            }));

        expect(response.statusCode).toBe(400);
        expect(response.text).toBe("Invalid webhook signature");

        expect(Subscription.updateOne)
            .not.toHaveBeenCalled();

        expect(stripe.subscriptions.retrieve)
            .not.toHaveBeenCalled();
    });

    test("Rejects a webhook with no signature", async () => {
        stripe.webhooks.constructEvent.mockImplementation(() => {
            throw new Error("Missing signature");
        });

        const response = await request(app)
            .post("/api/webhooks/stripe")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({
                type: "customer.subscription.deleted",
                data: {
                    object: {
                        id: "sub_fake"
                    }
                }
            }));

        expect(response.statusCode).toBe(400);

        expect(Subscription.updateOne)
            .not.toHaveBeenCalled();
    });

    test("Passes the raw request body to Stripe verification", async () => {
        stripe.webhooks.constructEvent.mockReturnValue({
            type: "test.unknown_event",
            data: {
                object: {}
            }
        });

        const payload = JSON.stringify({
            type: "test.unknown_event",
            data: {
                object: {}
            }
        });

        const response = await request(app)
            .post("/api/webhooks/stripe")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "test-signature")
            .send(payload);

        expect(response.statusCode).toBe(200);

        expect(stripe.webhooks.constructEvent)
            .toHaveBeenCalledTimes(1);

        const [rawBody, signature, webhookSecret] =
            stripe.webhooks.constructEvent.mock.calls[0];

        expect(Buffer.isBuffer(rawBody)).toBe(true);

        expect(rawBody.toString("utf8")).toBe(payload);

        expect(signature).toBe("test-signature");

        expect(webhookSecret).toBe(
            process.env.STRIPE_WEBHOOK_SECRET
        );

        expect(Subscription.updateOne)
            .not.toHaveBeenCalled();
    });

    test("Does not process a webhook when verification fails", async () => {
        stripe.webhooks.constructEvent.mockImplementation(() => {
            throw new Error("Signature verification failed");
        });

        const response = await request(app)
            .post("/api/webhooks/stripe")
            .set("Content-Type", "application/json")
            .set("stripe-signature", "tampered-signature")
            .send(JSON.stringify({
                type: "checkout.session.completed",
                data: {
                    object: {
                        mode: "subscription",
                        subscription: "sub_fake"
                    }
                }
            }));

        expect(response.statusCode).toBe(400);

        expect(Subscription.findOne)
            .not.toHaveBeenCalled();

        expect(Subscription.updateOne)
            .not.toHaveBeenCalled();

        expect(stripe.subscriptions.retrieve)
            .not.toHaveBeenCalled();
    });
});
