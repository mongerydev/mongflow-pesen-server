const validate = require('../middlewares/validate')
const authenticate = require('../middlewares/authenticate')
const paramValidate = require('../middlewares/paramValidate')
const customAuthenticate = require('../middlewares/customAuthenticate')
const schemas = require('../validations/Users')

const { get, verify, login, create, remove, put, changePhoto, changePassword, changeUserType } = require('../controllers/Users')

const express = require('express')
const router = express.Router()

router.route('/').get(authenticate, verify)
router.route('/all').get(authenticate, customAuthenticate(), get)
router.route('/').post(validate(schemas.createValidation), create)
router.route('/').put(authenticate, validate(schemas.updateValidation), put)
router.route('/').delete(authenticate, remove)

router.route('/login').post(validate(schemas.loginValidation), login)
router.route('/photo').put(authenticate, validate(schemas.changePhotoValidation), changePhoto)
router.route('/change-password').put(authenticate, validate(schemas.changePasswordValidation), changePassword)
router.route('/change-usertype/:userid').put(authenticate, paramValidate('userid'), validate(schemas.changeUserTypeValidation), changeUserType)

module.exports = router
