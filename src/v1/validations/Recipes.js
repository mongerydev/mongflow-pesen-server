const Joi = require("joi/lib");

const createValidation = Joi.object({
  order_id: Joi.number().required(),
  details: Joi.object().required(),
  cost: Joi.number().required(),
  recipe_id: Joi.string().required(),
  wastage_percentage: Joi.number().required(),
  total_bunker: Joi.number().required(),
  unit_bunker_cost: Joi.number().required(),
  total_bunker_cost: Joi.number().required(),
});

const updateValidation = Joi.object({
  details: Joi.object().required(),
  cost: Joi.number().required(),
  recipe_id: Joi.string().required(),
  wastage_percentage: Joi.number().required(),
  total_bunker: Joi.number().required(),
  unit_bunker_cost: Joi.number().required(),
  total_bunker_cost: Joi.number().required(),
});

const createSpecialRecipeValidation = Joi.object({
  details: Joi.object().required(),
  name: Joi.string().required(),
});

module.exports = {
  createValidation,
  updateValidation,
  createSpecialRecipeValidation,
};
