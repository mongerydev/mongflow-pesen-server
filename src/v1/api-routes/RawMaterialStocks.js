const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");

const {
  getLogsByDate,
  createLog,
  putLog,
  remove,
  approveLog,
  getAllProductStocks,
  getAllWarehouseStock,
  reduceStocks,
} = require("../controllers/RawMaterialStocks");

const express = require("express");
const router = express.Router();

router.route("/stocks").get(authenticate, getAllProductStocks);
router.route("/stocks").patch(authenticate, reduceStocks);
router.route("/stocks/warehouse").get(authenticate, getAllWarehouseStock);

router.route("/logs").get(authenticate, getLogsByDate);
router.route("/logs").post(authenticate, createLog);
router.route("/logs/:id").put(authenticate, putLog);
router.route("/logs/approve/:id").patch(authenticate, approveLog);
router.route("/logs/:id").delete(authenticate, paramValidate("id"), remove);

module.exports = router;
