const validate = require('../middlewares/validate')
const authenticate = require('../middlewares/authenticate')
const paramValidate = require('../middlewares/paramValidate')
const schemas = require('../validations/Sets')

const { get, create, put, remove } = require('../controllers/Sets')

const express = require('express')
const router = express.Router()

router.route('/').get(authenticate, get)
router.route('/').post(authenticate, validate(schemas.createValidation), create)
router.route('/:id').put(authenticate, paramValidate('id'), validate(schemas.createValidation), put)
router.route('/:id').delete(authenticate, paramValidate('id'), remove)

module.exports = router
