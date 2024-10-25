const { getExchangeRates } = require('../controllers/Others')

const express = require('express')
const router = express.Router()

router.route('/exchange-rates').get(getExchangeRates)

module.exports = router
