const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");
const { combinedShipmentSchema } = require("../validations/Shipments");

const {
  createShipment, getShipments,
} = require("../controllers/Shipments");

const express = require("express");
const router = express.Router();

//shipment general details routes



router.post(
    "/",
    authenticate,
    // validate(combinedShipmentSchema), // use the combined schema for validation
    createShipment
  );


  router.get(
    "/",
    authenticate,
    // validate(combinedShipmentSchema), // use the combined schema for validation
    getShipments
  );

module.exports = router;