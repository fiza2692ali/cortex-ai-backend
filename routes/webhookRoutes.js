const express = require("express");

const router = express.Router();

const {
    handleStripeWebhook
} = require("../controllers/stripeWebhookController");

router.post("/", handleStripeWebhook);

module.exports = router;