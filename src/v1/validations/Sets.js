const Joi = require('joi/lib')

const createValidation = Joi.object({
    set_name: Joi.string().required(),
    products: Joi.array().required()
})

module.exports = {
    createValidation
}
