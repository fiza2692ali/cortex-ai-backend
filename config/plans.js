const MB = 1024 * 1024;

const PLANS = {
    free: {
        name: "Free",
        maxDocuments: 5,
        maxMessages: 20,
        maxStorageBytes: 25 * MB
    },

    pro: {
        name: "Pro",
        maxDocuments: 50,
        maxMessages: 500,
        maxStorageBytes: 500 * MB
    },

    team: {
        name: "Team",
        maxDocuments: 500,
        maxMessages: 5000,
        maxStorageBytes: 5 * 1024 * MB
    }
};

function getPlan(planName) {
    return PLANS[planName] || PLANS.free;
}

function getPlanFromPriceId(priceId) {
    if (
        priceId &&
        priceId === process.env.STRIPE_PRO_PRICE_ID
    ) {
        return "pro";
    }

    if (
        priceId &&
        priceId === process.env.STRIPE_TEAM_PRICE_ID
    ) {
        return "team";
    }

    return null;
}

module.exports = {
    PLANS,
    getPlan,
    getPlanFromPriceId
};