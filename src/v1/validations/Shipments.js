const Joi = require('joi');


const stocksValidation = Joi.object().pattern(
  Joi.number().integer(),
  Joi.number().integer()
);

const productsValidation = Joi.object().pattern(
  Joi.number().integer(),
  Joi.number().integer()
);


const createValidationForShipmentProducts = Joi.object({
  
  order_number: Joi.string().required(),
  product_id: Joi.number().integer().required(),
  attributes_values: Joi.object().required(),

  will_be_shipped_quantity: Joi.number().integer().required(),
  shipped_quantity: Joi.number().integer().required(),
  shipment_id: Joi.number().integer().required(),
  waybill_number: Joi.string().required(),
  waybill_date: Joi.date().iso().required(),
  address: Joi.string().required(),
  customer_id: Joi.number().integer().required(),
  divided_price: Joi.number().precision(2).required(),
  unit_price_per_kg: Joi.number().precision(2).required(),
  total_quantity: Joi.number().precision(2).required(),
});


const createValidationForGeneralDetails = Joi.object({
  total_shipment_quantity: Joi.number().integer().required(),
  vehicle_plate: Joi.string().required(),
  driver_name: Joi.string().required(),
  is_shipment_included: Joi.boolean().required(),
  shipment_price: Joi.number().precision(2).required(),
  vat_rate: Joi.number().precision(2).min(0).max(1).required(),
  vat_witholding_rate: Joi.number().precision(2).min(0).max(1).required(),
  vat_witholding: Joi.number().precision(2).required(),
  price_with_vat: Joi.number().precision(2).required(),
  vat_declaration: Joi.number().integer().required(),
  usd_rate: Joi.number().precision(2).required()
});

const combinedShipmentSchema = Joi.object({
  shipmentProducts: Joi.array().items(createValidationForShipmentProducts).required(),
  shipmentGeneralDetails: createValidationForGeneralDetails.required(),
});


module.exports = {
  createValidationForShipmentProducts,
  createValidationForGeneralDetails,
  combinedShipmentSchema
};