const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");

const {
  getAllProductStocks,
  getAllWarehouseStock,
  updateStocksInProduction,
  reduceStocks,
  getStockCodes,
} = require("../controllers/Stocks");

const express = require("express");
const router = express.Router();

router
  .route("/:product_type")
  .get(authenticate, paramValidate("product_type"), getAllProductStocks);
router.route("/codes").get(authenticate, getStockCodes);
router.route("/").patch(authenticate, reduceStocks);
router
  .route("/production/:id")
  .put(authenticate, paramValidate("id"), updateStocksInProduction);
router
  .route("/warehouse/:product_type")
  .get(authenticate, paramValidate("product_type"), getAllWarehouseStock);

module.exports = router;
