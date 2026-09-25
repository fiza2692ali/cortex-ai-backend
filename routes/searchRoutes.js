const express = require("express");

const router = express.Router();

const {
    semanticSearch
} = require("../controllers/searchController");

const authMiddleware =
    require("../middleware/authMiddleware");


router.post(
    "/",
    authMiddleware,
    semanticSearch
);


module.exports = router;