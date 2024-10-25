// const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");
// const schemas = require("../validations/Shifts");

const {
  create,
  getDayShift,
  getOrderShiftsForProduction,
  delShift,
} = require("../controllers/Shifts");

const express = require("express");
const router = express.Router();


router.route("/add").post(authenticate, create);
router.route("/").get(authenticate, getDayShift);
router.route("/:id").get(authenticate, getOrderShiftsForProduction);
router.route("/:id").delete(authenticate, paramValidate("id"), delShift);







module.exports = router;
