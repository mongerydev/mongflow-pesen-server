const authenticate = require("../middlewares/authenticate");

const { getStocks, putStock, getLogsByDate, createLog, putLog  } = require("../controllers/SecondQualityProductStocks");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, getStocks);
router.route("/:id").put(authenticate, putStock);

router.route("/log").post(authenticate, createLog);
router.route("/logs").get(authenticate, getLogsByDate);
router.route("/logs/:id").patch(authenticate, putLog);

module.exports = router;
