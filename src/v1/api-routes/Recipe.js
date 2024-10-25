const authenticate = require("../middlewares/authenticate");
const validate = require("../middlewares/validate");
const paramValidate = require("../middlewares/paramValidate");
const schemas = require("../validations/Recipes");

const {
  get,
  create,
  put,
  remove,
  getSpecialRecipes,
  createSpecialRecipe,
  removeSpecialRecipe,
  createProductionRecipe,
  getProductionRecipes
} = require("../controllers/Recipes");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, get);
router.route("/production").get(authenticate, getProductionRecipes);

router.route("/").post(
  authenticate,
  //  validate(schemas.createValidation),
  create
);
router.route("/production").post(
  authenticate,
  //  validate(schemas.createValidation),
  createProductionRecipe
);
router
  .route("/:id")
  .put(
    authenticate,
    paramValidate("id"),
    put
  );
router.route("/:id").delete(authenticate, paramValidate("id"), remove);

// registered special recipes
router.route("/special").get(authenticate, getSpecialRecipes);
router
  .route("/special")
  .post(
    authenticate,
    // validate(schemas.createSpecialRecipeValidation),
    createSpecialRecipe
  );
router
  .route("/special/:id")
  .delete(authenticate, paramValidate("id"), removeSpecialRecipe);

module.exports = router;
