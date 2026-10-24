const express = require("express");
const router = express.Router();

const authMiddleware = require(
    "../middleware/authMiddleware"
);

const {
    getPlans,
    getMyBilling,
    createCheckout,
    cancelSubscription
} = require("../controllers/billingController");

/**
 * @swagger
 * /api/billing/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available plans returned successfully
 *       401:
 *         description: Authentication required
 *
 * /api/billing/me:
 *   get:
 *     summary: Get current user's billing details
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing details returned successfully
 *       401:
 *         description: Authentication required
 *
 * /api/billing/checkout:
 *   post:
 *     summary: Create a Stripe checkout session
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 example: pro
 *     responses:
 *       200:
 *         description: Checkout session created
 *       400:
 *         description: Invalid checkout request
 *       401:
 *         description: Authentication required
 *
 * /api/billing/cancel:
 *   post:
 *     summary: Cancel current subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancellation requested
 *       401:
 *         description: Authentication required
 */

router.use(authMiddleware);

router.get("/plans", getPlans);
router.get("/me", getMyBilling);
router.post("/checkout", createCheckout);
router.post("/cancel", cancelSubscription);

module.exports = router;