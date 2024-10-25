const Joi = require('joi/lib')

const createValidation = Joi.object({
    productName: Joi.string().required().min(3),
    defaultPrice: Joi.number().required(),
    defaultCurrency: Joi.string().required(),
    attributes: Joi.array().required(),
    type: Joi.number().required(),
    hasAttributes: Joi.boolean().required()
})

const updateValidation = Joi.object({
    productName: Joi.string().required().min(3),
    defaultPrice: Joi.number().required(),
    defaultCurrency: Joi.string().required(),
    attributes: Joi.array().required(),
    hasAttributes: Joi.boolean().required()

})

module.exports = {
    createValidation,
    updateValidation
}
