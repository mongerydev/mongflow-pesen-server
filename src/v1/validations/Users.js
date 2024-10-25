const Joi = require('joi')

const createValidation = Joi.object({
    Username: Joi.string().required().min(3),
    Password: Joi.string().required().min(3),
    Email: Joi.string().email().required()
})

const loginValidation = Joi.object({
    Password: Joi.string().required().min(3),
    Username: Joi.string().required().min(3)
})

const updateValidation = Joi.object({
    email: Joi.string().email().required(),
    company_name: Joi.string().required().min(3),
    phone: Joi.string().required().min(10),
    fullname: Joi.string().required().min(3)
})

const changePhotoValidation = Joi.object({
    photo: Joi.string().required().min(99)
})

const changePasswordValidation = Joi.object({
    oldPassword: Joi.string().required().min(3),
    newPassword: Joi.string().required().min(3),
    newPasswordAgain: Joi.string().required().min(3)
})

const changeUserTypeValidation = Joi.object({
    usertype: Joi.string().required().min(3)
})

module.exports = {
    createValidation,
    loginValidation,
    updateValidation,
    changePhotoValidation,
    changePasswordValidation,
    changeUserTypeValidation
}
