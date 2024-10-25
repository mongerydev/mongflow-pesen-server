// const Joi = require('joi');

// const uuidValidation = Joi.string().guid({ version: 'uuidv4' });

// const stocksValidation = Joi.object().pattern(
//   Joi.number().integer(),
//   Joi.number().integer()
// );

// const productsValidation = Joi.object().pattern(
//   Joi.number().integer(),
//   Joi.number().integer()
// );


// const createValidation = Joi.object({
//   id: uuidValidation.required(),
//   date: Joi.date().iso().required(),
//   shift_number: Joi.number().integer().required(),
//   production_recipe_id: uuidValidation.required(),
//   quantity: Joi.number().integer().required(),
//   wastage_percentage: Joi.number().min(0).max(1).required(), // assuming percentage as a fraction of 1 (e.g., 0.15 for 15%)
//   second_quality_stocks: Joi.string().custom((value, helpers) => {
//     if (typeof value === 'string') {
//       try {
//         const parsed = JSON.parse(value);
//         const validation = stocksValidation.validate(parsed);
//         if (validation.error) {
//           return helpers.error('any.invalid');
//         }
//       } catch (err) {
//         return helpers.error('any.invalid');
//       }
//     } else {
//       return helpers.error('string.base');
//     }
//     return value; // If no error, return the validated value
//   }, 'Second Quality Stocks Validation').required(),
//   consumable_products: Joi.string().custom((value, helpers) => {
//     if (typeof value === 'string') {
//       try {
//         const parsed = JSON.parse(value);
//         const validation = stocksValidation.validate(parsed);
//         if (validation.error) {
//           return helpers.error('any.invalid');
//         }
//       } catch (err) {
//         return helpers.error('any.invalid');
//       }
//     } else {
//       return helpers.error('string.base');
//     }
//     return value; // If no error, return the validated value
//   }, 'Consumable Products Validation').required(),
// });


// const createValidationForProcess = Joi.object({
//   id: uuidValidation.required(),
//   date: Joi.date().iso().required(),
//   shift_number: Joi.number().integer().required(),
//   used_products: Joi.string().custom((value, helpers) => {
//     try {
//       const parsed = JSON.parse(value);
//       const validation = productsValidation.validate(parsed);
//       if (validation.error) {
//         return helpers.error('any.invalid');
//       }
//     } catch (err) {
//       return helpers.error('any.invalid');
//     }
//     return value; // If no error, return the validated value
//   }, 'Used Products Validation').required(),
//   output_product_id: Joi.number().integer().required(),
//   output_quantity: Joi.number().integer().required(),
//   wastage_percentage: Joi.number().min(0).max(1).required(), // assuming percentage as a fraction of 1 (e.g., 0.15 for 15%)
//   consumable_products: Joi.string().custom((value, helpers) => {
//     try {
//       const parsed = JSON.parse(value);
//       const validation = productsValidation.validate(parsed);
//       if (validation.error) {
//         return helpers.error('any.invalid');
//       }
//     } catch (err) {
//       return helpers.error('any.invalid');
//     }
//     return value; // If no error, return the validated value
//   }, 'Consumable Products Validation').required(),
// });


// module.exports = {
//   createValidation,
//   createValidationForProcess
// };
