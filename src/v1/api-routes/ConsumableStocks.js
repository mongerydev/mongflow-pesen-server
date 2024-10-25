const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");

const {
  getLogsByDate,
  createLog,
  putLog,
  remove,
  approveLog,
  reduceStocks,
  getAllProductStocks,
  getUsageLogs
} = require("../controllers/ConsumableStocks");

const express = require("express");
const router = express.Router();

router.route("/stocks").get(authenticate, getAllProductStocks);
router.route("/stocks").patch(authenticate, reduceStocks);


router.route("/logs").post(authenticate, createLog);
router.route("/logs").get(authenticate, getLogsByDate);
router.route("/logs/approve/:id").patch(authenticate, approveLog);
router.route("/logs/:id").put(authenticate, putLog);
router.route("/logs/:id").delete(authenticate, paramValidate("id"), remove);


router.route("/logs/usage").get(authenticate, getUsageLogs);

module.exports = router;
