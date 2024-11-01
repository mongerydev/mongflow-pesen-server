const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");

const {
  getLogsByDate,
  createLog,
  putLog,
  approveLog,
  removeLog,
  getNonApprovedLogs,
  getUsageLogs,
  createStockUsageLog
} = require("../controllers/StockLogs");

const express = require("express");
const router = express.Router();

router.route("/:product_type").get(authenticate, paramValidate("product_type"), getLogsByDate);
router.route("/usage/:product_type").get(authenticate, paramValidate("product_type"), getUsageLogs);
router.route("/").post(authenticate, createLog);
router.route("/usage").post(authenticate, createStockUsageLog);
router.route("/:id").put(authenticate, putLog);
router.route("/approve/:id").patch(authenticate, approveLog);
router.route("/:id").delete(authenticate, paramValidate("id"), removeLog);
router.route('/all/nonapproved').get(authenticate, getNonApprovedLogs)

module.exports = router;
