const Joi = require('joi/lib')

const createValidation = Joi.object({
    product_id: Joi.number().required(),
    date: Joi.string().required(),
    stock: Joi.number().required(),
    attributes: Joi.string().required()
})

const updateValidation = Joi.object({
    stock: Joi.number().required()
})

module.exports = {
    createValidation,
    updateValidation
}
