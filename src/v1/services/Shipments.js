const httpStatus = require("http-status");

const insertForShipmentProducts = (data, client) => {
  return client.query(
    `INSERT INTO shipmentproducts 
        (order_id, product_id, attributes, shipped_quantity, waybill_number, waybill_date, address, total_cost, unit_cost, orderstatus_id, orderproduct_id, shipment_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        RETURNING *`,
    [
      data.order_id,
      data.product_id,
      JSON.stringify(data.attributes),
      data.shipped_quantity,
      data.waybill_number,
      data.waybill_date ? new Date(data.waybill_date) : null,
      data.address,
      data.total_cost,
      data.unit_cost,
      data.orderstatus_id,
      data.orderproduct_id,
      data.shipment_id,
    ]
  );
};

const insertForShipmentGeneralDetails = (data, client) => {
  return client.query(
    `INSERT INTO shipments 
        (total_quantity, vehicle_plate, driver_name, is_shipment_included, price, vat_rate, 
        vat_witholding_rate, vat_witholding, price_with_vat, vat_declaration, usd_rate) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
    [
      data.total_quantity,
      data.vehicle_plate,
      data.driver_name,
      data.is_shipment_included,
      data.price,
      data.vat_rate,
      data.vat_witholding_rate,
      data.vat_witholding,
      data.price_with_vat,
      data.vat_declaration,
      data.usd_rate,
    ]
  );
};

const getFilteredShippedQuantitySum = (
  orderNumber,
  attributesValues,
  client
) => {
  const query = `
      SELECT SUM(shipped_quantity) AS total_shipped_quantity
      FROM shipmentproducts
      WHERE order_number = $1 AND attributes_values = $2
    `;

  if (client) {
    return client.query(query, [orderNumber, attributesValues]);
  } else {
    return process.pool.query(query, [orderNumber, attributesValues]);
  }
};

const getWillBeShippedQuantity = (orderNumber, attributesValues, client) => {
  const query = `
      SELECT will_be_shipped_quantity
      FROM shipmentproducts
      WHERE order_number = $1 AND attributes_values = $2
      LIMIT 1
    `;

  // Use the provided client if in a transaction, otherwise use the pool
  if (client) {
    return client.query(query, [orderNumber, attributesValues]);
  } else {
    return process.pool.query(query, [orderNumber, attributesValues]);
  }
};

const _getShipments = (client) => {
  const query = `
  SELECT sh.*, c.companyname,
         json_agg(
           json_build_object(
             'product_id', p.product_id,
             'id', p.id,
             'shipment_id', p.shipment_id,
             'orderproduct_id', p.orderproduct_id,
             'orderstatus_id', p.orderstatus_id,
             'waybill_date', p.waybill_date,
             'waybill_number', p.waybill_number,
             'attributes', p.attributes,
             'order_id', p.order_id,
             'shipped_quantity', p.shipped_quantity,
             'unit_cost', p.unit_cost,
             'total_cost', p.total_cost,
             'address', p.address,
             'product_name', pr.product_name,
             'attributeDetails', (
              CASE
                  WHEN pr."hasAttributes" = true THEN 
                      COALESCE(
                          (
                              SELECT jsonb_object_agg(attr.attribute_name, val.value)
                              FROM LATERAL (
                                  SELECT key::int AS attr_id, value::int AS val_id
                                  FROM jsonb_each_text(p.attributes::jsonb)
                              ) AS attr_val
                              LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
                              LEFT JOIN value AS val ON val.value_id = attr_val.val_id
                          ), '{}'::jsonb
                      )
                  ELSE 
                      null
              END
          )
           )
         ) AS products
  FROM shipments sh
  LEFT JOIN shipmentproducts p ON p.shipment_id = sh.id
  LEFT JOIN product pr ON p.product_id = pr.product_id
  LEFT JOIN orders o ON p.order_id = o.order_id
  LEFT JOIN customer c ON c.customerid = o.customer_id
  GROUP BY sh.id, c.companyname
  ORDER BY sh.id DESC;`;

  // Use the provided client if in a transaction, otherwise use the pool
  if (client) {
    return client.query(query);
  } else {
    return process.pool.query(query);
  }
};

const _getOneShipment = (id,client) => {
  const query = `
  SELECT sh.*, c.companyname,
         json_agg(
           json_build_object(
             'product_id', p.product_id,
             'id', p.id,
             'shipment_id', p.shipment_id,
             'orderproduct_id', p.orderproduct_id,
             'orderstatus_id', p.orderstatus_id,
             'waybill_date', p.waybill_date,
             'waybill_number', p.waybill_number,
             'attributes', p.attributes,
             'order_id', p.order_id,
             'shipped_quantity', p.shipped_quantity,
             'unit_cost', p.unit_cost,
             'total_cost', p.total_cost,
             'address', p.address,
             'product_name', pr.product_name,
             'attributeDetails', (
              CASE
                  WHEN pr."hasAttributes" = true THEN 
                      COALESCE(
                          (
                              SELECT jsonb_object_agg(attr.attribute_name, val.value)
                              FROM LATERAL (
                                  SELECT key::int AS attr_id, value::int AS val_id
                                  FROM jsonb_each_text(p.attributes::jsonb)
                              ) AS attr_val
                              LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
                              LEFT JOIN value AS val ON val.value_id = attr_val.val_id
                          ), '{}'::jsonb
                      )
                  ELSE 
                      null
              END
          )
           )
         ) AS products
  FROM shipments sh
  LEFT JOIN shipmentproducts p ON p.shipment_id = sh.id
  LEFT JOIN product pr ON p.product_id = pr.product_id
  LEFT JOIN orders o ON p.order_id = o.order_id
  LEFT JOIN customer c ON c.customerid = o.customer_id
  WHERE sh.id=$1
  GROUP BY sh.id, c.companyname;`;

  const values=[id]

  if (client) return client.query(query, values) ;
  return process.pool.query(query, values);
};

module.exports = {
  insertForShipmentProducts,
  insertForShipmentGeneralDetails,
  getFilteredShippedQuantitySum,
  getWillBeShippedQuantity,
  _getShipments,
  _getOneShipment
};
