const validate = require('../middlewares/validate')
const authenticate = require('../middlewares/authenticate')
const paramValidate = require('../middlewares/paramValidate')
const schemas = require('../validations/Productions')

const { get, remove, complete, ship, createManual, putManual, deleteManual, getManual } = require('../controllers/Productions')

const express = require('express')
const router = express.Router()

router.route('/').get(authenticate, get)
router.route('/complete/:id').put(authenticate, paramValidate('id'), complete)
router.route('/ship').put(authenticate, ship)
router.route('/:id').delete(authenticate, paramValidate('id'), remove)


router.route('/manual').post(authenticate, createManual)
router.route('/manual').put(authenticate, putManual)
router.route('/manual/:id').delete(authenticate, paramValidate('id'), deleteManual)
router.route('/manual').get(authenticate, getManual)

module.exports = router
