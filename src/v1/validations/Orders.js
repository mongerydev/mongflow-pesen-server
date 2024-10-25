const Joi = require('joi/lib')

const createValidation = Joi.object({
    customer_id: Joi.number().required(),
    currency_code: Joi.string().required(),
    order_status: Joi.string().required(),
    order_date: Joi.string().required(),
    order_number: Joi.string().required(),
    products: Joi.array().required(),
    sets: Joi.array().required(),
    subtotal: Joi.number().required(),
    tax_rate: Joi.number().required(),
    total_with_tax: Joi.number().required(),
    exchange_rate: Joi.number().required(),
    total_cost: Joi.number().required()

})

const updateValidation = Joi.object({
    products: Joi.array().required(),
    order_status: Joi.string().required(),
    stock_diff: Joi.number().required(),
    product_attributes: Joi.string().required()
})

const updateValidationSet = Joi.object({
    sets: Joi.array().required(),
    order_status: Joi.string().required(),
    stockDiffs: Joi.array().items(Joi.number()).required(),
    attributes: Joi.array().items(Joi.string()).required()
});

const editValidation = Joi.object({
    customerid: Joi.number().required(),
    currency_code: Joi.string().required(),
    products: Joi.array().required(),
    sets: Joi.array().required(),
    subtotal: Joi.number().required(),
    total_with_tax: Joi.number().required(),
    order_status: Joi.string().required()
})

const updateStatusValidation = Joi.object({
    status: Joi.string().required()
})

module.exports = {
    createValidation,
    updateValidation,
    editValidation,
    updateStatusValidation,
    updateValidationSet
}
