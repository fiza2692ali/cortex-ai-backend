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

router.use(authMiddleware);

router.get("/plans", getPlans);
router.get("/me", getMyBilling);
router.post("/checkout", createCheckout);
router.post("/cancel", cancelSubscription);

module.exports = router;