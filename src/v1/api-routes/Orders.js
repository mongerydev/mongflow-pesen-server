const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");
const schemas = require("../validations/Orders");

const {
  get,
  create,
  put,
  remove,
  patch,
  patchStatus,
  createOrderNumber,
  delOrderNumber,
  updateSome,
  getOrderExpenseCost,
  approveOrder,
  createOrderStock,
  getOrderStocks,
  updateOrderStock
} = require("../controllers/Orders");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, get);
router.route("/cost/:id").get(authenticate, getOrderExpenseCost);
router.route("/").post(
  authenticate,
  //  validate(schemas.createValidation),
  create
);
router.route("/:id").put(
  authenticate,
  paramValidate("id"),
  // validate(schemas.updateValidation),
  put
);

router
  .route("/:id")
  .patch(
    authenticate,
    paramValidate("id"),
    validate(schemas.editValidation),
    patch
  );
router.route("/patch/:id").patch(authenticate, updateSome);

router.route("/:id").delete(authenticate, paramValidate("id"), remove);
router
  .route("/:id/change-status")
  .patch(
    authenticate,
    paramValidate("id"),
    validate(schemas.updateStatusValidation),
    patchStatus
  );
router
  .route("/:id/approve")
  .patch(
    authenticate,
    paramValidate("id"),
    // validate(schemas.updateStatusValidation),
    approveOrder
  );


  router
  .route("/:id/stock")
  .get(
    authenticate,
    paramValidate("id"),
    // validate(schemas.updateStatusValidation),
    getOrderStocks
  );
  router
  .route("/:id/stock")
  .post(
    authenticate,
    paramValidate("id"),
    // validate(schemas.updateStatusValidation),
    createOrderStock
  );
  router
  .route("/:id/stock")
  .put(
    authenticate,
    paramValidate("id"),
    // validate(schemas.updateStatusValidation),
    updateOrderStock
  );
router
  .route("/:order_number/order-number")
  .delete(authenticate, paramValidate("order_number"), delOrderNumber);
router.route("/order-number").get(authenticate, createOrderNumber);

module.exports = router;
