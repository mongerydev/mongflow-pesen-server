const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");
const schemas = require("../validations/Customers");

const {
  get,
  create,
  put,
  remove,
  removeContact,
  getContacts,
  createContact,
  putContact,
} = require("../controllers/Customers");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, get);
router
  .route("/")
  .post(authenticate, 
    // validate(schemas.createValidation), 
    create);
router
  .route("/:id")
  .put(
    authenticate,
    paramValidate("id"),
    // validate(schemas.createValidation),
    put
  );
router.route("/:id").delete(authenticate, paramValidate("id"), remove);

//contact Routes
router.route("/contact").post(authenticate, createContact);
router.route("/contact").get(authenticate, getContacts);

router.route("/contact/:id").put(authenticate, paramValidate("id"), putContact);

router
  .route("/contact/:id")
  .delete(authenticate, paramValidate("id"), removeContact);

module.exports = router;
