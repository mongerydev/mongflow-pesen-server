const { getApp } = require('../controllers/App')

const express = require('express')
const router = express.Router()

router.route('/').get(getApp)

module.exports = router
