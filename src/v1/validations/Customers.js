const Joi = require('joi/lib')

const createValidation = Joi.object({
    companyname: Joi.string().required().min(3),
    // email: Joi.string().email().required(),
    // phone: Joi.string().required(),
    // address: Joi.string().required()
})

module.exports = {
    createValidation
}
