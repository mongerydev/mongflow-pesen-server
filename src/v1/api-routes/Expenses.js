const paramValidate = require("../middlewares/paramValidate");
const authenticate = require("../middlewares/authenticate");

const {
  getExpenses,
  getItems,
  getClasses,
  createExpense,
  createItem,
  updateExpense,
  updateExpenseItemFrequency,
  patchExpense,
  patchExpenseItem,
  delExpense,
  delExpenseItem,
  getSummary,
  createClass,
  editClass,
  delClass
} = require("../controllers/Expenses");

const express = require("express");
const router = express.Router();


router.route("/").get(authenticate, getExpenses);
router.route("/").post(authenticate, createExpense);
router.route("/all").patch(authenticate, updateExpense);
router.route("/:id").delete(authenticate, paramValidate("id"), delExpense);
router.route("/").patch(authenticate, patchExpense);

router.route("/summary").get(authenticate, getSummary);

router.route("/class").get(authenticate, getClasses);
router.route("/class").post(authenticate, createClass);
router.route("/class").patch(authenticate, editClass);
router.route("/class/:id").delete(authenticate, delClass);

router.route("/items").get(authenticate, getItems);
router.route("/item").post(authenticate, createItem);
router.route("/item").patch(authenticate, patchExpenseItem);
router.route("/item/frequency").patch(authenticate, updateExpenseItemFrequency);
router
  .route("/item/:id")
  .delete(authenticate, paramValidate("id"), delExpenseItem);

module.exports = router;
