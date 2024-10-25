const validate = require('../middlewares/validate')
const authenticate = require('../middlewares/authenticate')
const paramValidate = require('../middlewares/paramValidate')

const { getLogsByDate, create, put, remove,getAllWarehouseStock, getAllProductStocks, getStockCodes } = require('../controllers/LastProductStocks')

const express = require('express')

const router = express.Router()

router.route('/logs').get(authenticate, getLogsByDate)
// router.route('/warehouse').get(authenticate, getAllWarehouseStock)
router.route('/stocks').get(authenticate, getAllProductStocks)
router.route('/codes').get(authenticate, getStockCodes)
router.route('/').post(authenticate, create)
router.route('/:id').put(authenticate, paramValidate('id'), put)
router.route('/:id').delete(authenticate, paramValidate('id'), remove)

module.exports = router
