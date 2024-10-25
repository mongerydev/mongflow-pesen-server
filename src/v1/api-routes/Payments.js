const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");
const schemas = require("../validations/Customers");

const {
  getLastMonth,
  create,
  getDateRange,
} = require("../controllers/Payments");

const express = require("express");
const router = express.Router();

router.route("/lastmonth").get(authenticate, getLastMonth);
router.route("/daterange").get(authenticate, getDateRange);
router.route("/").post(authenticate, create);
// router.route("/:id").put(
//   authenticate,
//   paramValidate("id"),
//   //  validate(schemas.createValidation),
//   put
// );
// router.route("/:id").delete(authenticate, paramValidate("id"), remove);

module.exports = router;
