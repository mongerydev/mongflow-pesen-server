const insert = (client, data) => {
  return client.query(
    `INSERT INTO orders (
        userid, customer_id, currency, order_status, order_date, 
        order_number, subtotal, tax_rate, total_with_tax, 
        status, approver_id, secondary_rate, total_cost, 
        valid_date, delivery_terms, delivery_point, payment_type, 
        maturity, notes, vat_declaration, vat_witholding_rate, 
        vat_witholding, isproduction, primary_rate, invoice_number, invoice_date
    )  
    VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, 
        $21, $22, $23, $24, $25, $26
    ) 
    RETURNING *`,
    [
      data.userid,
      data.customer_id,
      data.currency,
      data.order_status,
      data.order_date,
      data.order_number,
      data.subtotal,
      data.tax_rate,
      data.total_with_tax,
      data.status,
      data.approver_id,
      data.secondary_rate,
      data.total_cost,
      data.valid_date,
      data.delivery_terms,
      data.delivery_point,
      data.payment_type,
      data.maturity,
      data.notes,
      data.vat_declaration,
      data.vat_witholding_rate,
      data.vat_witholding,
      data.isproduction,
      data.primary_rate,
      data.invoice_number,
      data.invoice_date
    ]
  );
};

const getAll = (client) => {
  const query = `
  WITH Customer AS (
    SELECT 
      customerid, 
      jsonb_agg(jsonb_build_object(
        'companyname', companyname, 
        'email', email, 
        'phone', phone
      )) AS Customer 
    FROM customer 
    GROUP BY customerid
  ), ProductionAggregates AS (
    SELECT 
      prs.orderproduct_id, 
      SUM(DISTINCT prs.total_bunker_cost) AS total_cost,
      SUM(DISTINCT prs.total_ton) AS total_ton, 
      SUM(sfo.quantity) AS total_produced_kg
    FROM productionrecipes prs
    LEFT JOIN shiftfororder sfo ON sfo.production_recipe_id = prs.id
    GROUP BY prs.orderproduct_id
  )
  SELECT o.*, u.username, cu.Customer[0], u2.username AS approver, 
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'product_id', p.product_id, 
        'product_name', pr.product_name, 
        'attributes', p.attributes, 
        'attributedetails', p.attributedetails, 
        'unit_price', p.unit_price, 
        'total_price', p.total_price, 
        'unit_cost', p.unit_cost, 
        'total_cost', p.total_cost, 
        'quantity', p.quantity, 
        'recipe_id', p.recipe_id, 
        'log_id', p.log_id, 
        'stocklogs', (
          SELECT jsonb_agg(psl.waybill)
          FROM productstocklogs psl
          LEFT JOIN orderstocks ors ON ors.orderproduct_id = p.id
          LEFT JOIN logproducts lp ON lp.id = ors.logproduct_id
          WHERE psl.id = lp.log_id
        ), 
        'weight', p.weight, 
        'product_unit', p.product_unit, 
        'delivery_date', p.delivery_date, 
        'vat_rate', p.vat_rate,
        'vat_witholding_rate', p.vat_witholding_rate,
        'discount_rate', p.discount_rate,
        'orderStatus', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', os.id,
              'quantity', os.quantity,
              'isshipped', os.isshipped,
              'statustype', os.statustype,
              'production_recipe_id', pro.id 
            )
          )
          FROM orderstatus os
          LEFT JOIN productionrecipes pro ON pro.orderstatus_id = os.id
          WHERE os.orderproduct_id = p.id
        ),
        'productions', (
          SELECT 
            jsonb_build_object(
              'total_recipe_cost', pa.total_cost,
              'total_ton', pa.total_ton,
              'total_produced_kg', pa.total_produced_kg
            )
          
          FROM ProductionAggregates pa
          WHERE pa.orderproduct_id = p.id
        )
      )
    )
    FROM orderproducts p
    LEFT JOIN product pr ON pr.product_id = p.product_id
    WHERE p.order_id = o.order_id
  ) as products
  FROM "orders" o
  LEFT JOIN "User" u ON o.userid = u.userid 
  LEFT JOIN "User" u2 ON o.approver_id = u2.userid 
  LEFT JOIN Customer cu ON o.customer_id = cu.customerid 
  GROUP BY o.order_id, u.username, cu.Customer[0], u2.username
  ORDER BY o.order_id ASC;
  `;

  if (client) return client.query(query);
  return process.pool.query(query);
};

const getOne = (id, client) => {
  const query = `
  WITH Customer AS (
    SELECT 
      customerid, 
      jsonb_agg(jsonb_build_object(
        'companyname', companyname, 
        'email', email, 
        'phone', phone
      )) AS Customer 
    FROM customer 
    GROUP BY customerid
  ), ProductionAggregates AS (
    SELECT 
      prs.orderproduct_id, 
      SUM(DISTINCT prs.total_bunker_cost) AS total_cost,
      SUM(DISTINCT prs.total_ton) AS total_ton, 
      SUM(sfo.quantity) AS total_produced_kg
    FROM productionrecipes prs
    LEFT JOIN shiftfororder sfo ON sfo.production_recipe_id = prs.id
    GROUP BY prs.orderproduct_id
  )
  SELECT o.*, u.username, cu.Customer[0], u2.username AS approver, 
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'product_id', p.product_id, 
        'product_name', pr.product_name, 
        'attributes', p.attributes, 
        'attributedetails', p.attributedetails, 
        'unit_price', p.unit_price, 
        'total_price', p.total_price, 
        'unit_cost', p.unit_cost, 
        'total_cost', p.total_cost, 
        'quantity', p.quantity, 
        'recipe_id', p.recipe_id, 
        'log_id', p.log_id, 
        'stocklogs', (
          SELECT jsonb_agg(psl.waybill)
          FROM productstocklogs psl
          LEFT JOIN orderstocks ors ON ors.orderproduct_id = p.id
          LEFT JOIN logproducts lp ON lp.id = ors.logproduct_id
          WHERE psl.id = lp.log_id
        ), 
        'weight', p.weight, 
        'product_unit', p.product_unit, 
        'delivery_date', p.delivery_date, 
        'orderStatus', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', os.id,
              'quantity', os.quantity,
              'isshipped', os.isshipped,
              'statustype', os.statustype,
              'production_recipe_id', pro.id 
            )
          )
          FROM orderstatus os
          LEFT JOIN productionrecipes pro ON pro.orderstatus_id = os.id
          WHERE os.orderproduct_id = p.id
        ),
        'productions', (
          SELECT 
            jsonb_build_object(
              'total_recipe_cost', pa.total_cost,
              'total_ton', pa.total_ton,
              'total_produced_kg', pa.total_produced_kg
            )
          
          FROM ProductionAggregates pa
          WHERE pa.orderproduct_id = p.id
        )
      )
    )
    FROM orderproducts p
    LEFT JOIN product pr ON pr.product_id = p.product_id
    WHERE p.order_id = o.order_id
  ) as products
  FROM "orders" o
  LEFT JOIN "User" u ON o.userid = u.userid 
  LEFT JOIN "User" u2 ON o.approver_id = u2.userid 
  LEFT JOIN Customer cu ON o.customer_id = cu.customerid 
  WHERE o.order_id=$1
  GROUP BY o.order_id, u.username, cu.Customer[0], u2.username
  ORDER BY o.order_id ASC;
  `;

  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateOrderStatus = (data, client) => {
  const query =
    "UPDATE orders SET products = $1, order_status = $2 WHERE order_id = $3 RETURNING order_id";
  const values = [data.products, data.order_status, data.order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};



const update = async (client, data) => {
  try {
    const result = await client.query(
      `UPDATE orders SET 
        userid = $1, 
        customer_id = $2, 
        currency = $3, 
        order_status = $4, 
        order_date = $5, 
        order_number = $6, 
        subtotal = $7, 
        total_with_tax = $8, 
        approver_id = $9, 
        secondary_rate = $10, 
        valid_date = $11, 
        delivery_terms = $12, 
        delivery_point = $13, 
        payment_type = $14, 
        maturity = $15, 
        notes = $16, 
        isproduction = $17, 
        primary_rate = $18,
        invoice_number = $19,
        invoice_date = $20
      WHERE order_id = $21
      RETURNING *`,
      [
        data.userid,
        data.customer_id,
        data.currency,
        data.order_status,
        data.order_date,
        data.order_number,
        data.subtotal,
        data.total_with_tax,
        data.approver_id,
        data.secondary_rate,
        data.valid_date,
        data.delivery_terms,
        data.delivery_point,
        data.payment_type,
        data.maturity,
        data.notes,
        data.isproduction,
        data.primary_rate,
        data.invoice_number,
        data.invoice_date,
        data.order_id,
      ]
    );
    return result;
  } catch (error) {
    console.error("Error updating order:", error);
    throw error; // re-throw the error after logging it
  }
};

const getOrderProducts = (client, order_id) => {
  return client.query(`SELECT * FROM orderproducts WHERE order_id=$1`, [
    order_id,
  ]);
};

const updateProduct = (client, data) => {
  const query = `
    UPDATE orderproducts 
    SET 
      order_id = $2,
      product_id = $3,
      recipe_id = $4,
      log_id = $5,
      product_unit = $6,
      attributes = $7,
      attributedetails = $8,
      quantity = $9,
      weight = $10,
      unit_price = $11,
      total_price = $12,
      delivery_date = $13,
      vat_rate = $14,
      vat_witholding_rate = $15,
      discount_rate=$16
    WHERE id = $1
    RETURNING *
  `;

  const values = [
    data.id,
    data.order_id,
    data.product_id,
    data.recipe_id,
    data.log_id,
    data.product_unit,
    data.attributes,
    data.attributedetails,
    data.quantity,
    data.weight,
    data.unit_price,
    data.total_price,
    data.delivery_date,
    data.vat_rate,
    data.vat_witholding_rate,
    data.discount_rate,
  ];
  return client.query(query, values);
};

const insertProduct = (client, data) => {
  return client.query(
    `INSERT INTO orderproducts (
        order_id, product_id, recipe_id, log_id, product_unit,
        attributes, attributedetails, quantity, weight, unit_price, total_price,
        delivery_date, vat_rate, vat_witholding_rate, discount_rate
    ) 
    VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15
    ) 
    RETURNING *`,
    [
      data.order_id,
      data.product_id,
      data.recipe_id,
      data.log_id,
      data.product_unit,
      data.attributes,
      data.attributedetails,
      data.quantity,
      data.weight,
      data.unit_price,
      data.total_price,
      data.delivery_date,
      data.vat_rate,
      data.vat_witholding_rate,
      data.discount_rate,
    ]
  );
};

const getProductStatus = (client, data) => {
  return client.query(
    `SELECT * FROM orderstatus WHERE orderproduct_id =$1 AND statustype= $2`,
    [data.orderproduct_id, data.statustype]
  );
};
const getProductStatusById = (id, client) => {
  return client.query(`SELECT * FROM orderstatus WHERE id =$1`, [id]);
};
const insertProductStatus = (client, data) => {
  return client.query(
    `INSERT INTO orderstatus ( orderproduct_id, quantity, statustype ) 
    VALUES ( $1, $2, $3 )
    RETURNING *`,
    [data.orderproduct_id, data.quantity, data.statustype]
  );
};
const updateProductStatus = (client, data) => {
  return client.query(
    `UPDATE orderstatus SET quantity=$1, statustype=$2 WHERE id=$3
    RETURNING *`,
    [data.quantity, data.statustype, data.id]
  );
};
const updateProductStatusByProduct = (client, data) => {
  return client.query(
    `UPDATE orderstatus SET statustype=$1 WHERE orderproduct_id=$2
    RETURNING *`,
    [data.statustype, data.orderproduct_id]
  );
};

const updateProductShipStatus = (client, data) => {
  return client.query(
    `UPDATE orderstatus SET isshipped=$1 WHERE id=$2
    RETURNING *`,
    [data.isshipped, data.orderstatus_id]
  );
};
const reduceProductStatus = (client, data) => {
  return client.query(
    `UPDATE orderstatus SET quantity= quantity - $1 WHERE statustype= $2 AND orderproduct_id=$3
    RETURNING *`,
    [data.quantity, data.statustype, data.orderproduct_id]
  );
};

const delProduct = (client, id) => {
  const query = "DELETE FROM orderproducts WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const delProductStatus = (client, id) => {
  const query = "DELETE FROM orderstatus WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateStatus = (data, client) => {
  const query =
    "UPDATE orders SET status = $1, approver_id = $2 WHERE order_id = $3 RETURNING *";
  const values = [data.status, data.userid, data.order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const del = (id, client) => {
  const query = "DELETE FROM orders WHERE order_id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _insertOrderCounter = (data, client) => {
  const query =
    "INSERT INTO ordercounter (suffix, counter, date) VALUES ($1, $2, $3) RETURNING *";
  const values = [data.suffix, data.counter, data.date];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _getOrderCounter = (data, client) => {
  const query = "SELECT * FROM ordercounter WHERE suffix = $1";
  const values = [data.suffix];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _updateOrderCounter = (data, client) => {
  const query =
    "UPDATE ordercounter SET counter = $1, date = $2 WHERE suffix = $3 RETURNING *";
  const values = [data.counter, data.date, data.suffix];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const patchSome = (params, client) => {
  console.log("params of", params);
  const { order_id, ...data } = params;
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE orders SET ${setValues} WHERE order_id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

// const updateRecipeOrderStatusForShipment = (orderNumber, client) => {
//   const query = `UPDATE orders
//   SET products = (
//     SELECT jsonb_agg(
//       CASE
//         WHEN (item->>'type' = 'Sevk Bekliyor') THEN jsonb_set(item, '{type}', '"Sevk Edildi"')
//         ELSE item
//       END
//     )
//     FROM jsonb_array_elements(products->'orderStatus') AS item
//   )
//   WHERE order_number = $1
//     AND products->'orderStatus' IS NOT NULL
//     AND EXISTS (
//       SELECT 1
//       FROM jsonb_array_elements(products->'orderStatus') AS arr(item)
//       WHERE item->>'type' = 'Sevk Bekliyor'
//     )
//   RETURNING *;
//   `;

//   if (client) {
//     return client.query(query, [orderNumber]);
//   } else {
//     return process.pool.query(query, [orderNumber]);
//   }
// };

// const updateGeneralOrderStatusForShipment = (orderNumber, client) => {
//   const query = `
//     WITH conditions_met AS (
//       SELECT
//         (products->'orderStatus'->0->>'quantity')::int = 0 AS initial_condition_met,
//         NOT EXISTS (
//           SELECT 1
//           FROM jsonb_array_elements(products->'orderStatus') WITH ORDINALITY AS arr(value, index)
//           WHERE index > 1 AND value->>'type' != 'Sevk Edildi'
//         ) AS all_following_conditions_met
//       FROM orders
//       WHERE order_number = $1
//     )
//     UPDATE orders
//     SET
//       order_status = CASE
//         WHEN (SELECT initial_condition_met AND all_following_conditions_met FROM conditions_met)
//         THEN 'Sevk Edildi'
//         ELSE order_status -- No change if conditions are not met
//       END
//     WHERE order_number = $1
//     RETURNING *;
//   `;

//   if (client) {
//     return client.query(query, [orderNumber]);
//   } else {
//     return process.pool.query(query, [orderNumber]);
//   }
// };

const updateRecipeOrderStatusForShipment = (data, client) => {
  const query = `UPDATE orders
  SET products = (
      SELECT array_agg(
          CASE
              WHEN (product->>'recipe_id')::uuid = $3 THEN jsonb_set(product, '{orderStatus}', $1, true)
              ELSE product
          END
      )
      FROM unnest(products) AS product
  )
  WHERE
      order_number = $2
  RETURNING *;
  `;

  if (client) {
    return client.query(query, [
      JSON.stringify(data.newOrderStatus),
      data.order_number,
      data.recipe_id,
    ]);
  } else {
    return process.pool.query(query, [
      JSON.stringify(data.newOrderStatus),
      data.order_number,
      data.recipe_id,
    ]);
  }
};

const updateGeneralOrderStatusForShipment = (orderNumber, client) => {
  const query = `WITH conditions_met AS (
    SELECT
      (product->'orderStatus'->0->>'quantity')::int = 0 AS initial_condition_met,
      NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(product->'orderStatus') WITH ORDINALITY AS status(value, index)
        WHERE index > 1 AND value->>'type' != 'Sevk Edildi'
      ) AS all_following_conditions_met
    FROM orders
    CROSS JOIN LATERAL unnest(products) AS product
    WHERE order_number = $1
  )
  UPDATE orders
  SET 
    order_status = CASE
      WHEN (SELECT initial_condition_met AND all_following_conditions_met FROM conditions_met)
      THEN 'Sevk Edildi'
      ELSE order_status -- No change if conditions are not met
    END,
    status = CASE
      WHEN (SELECT initial_condition_met AND all_following_conditions_met FROM conditions_met)
      THEN status || RIGHT(status::text, 1) -- Concatenate the last digit of the current status value
      ELSE status -- No change if conditions are not met
    END
  WHERE order_number = $1
  RETURNING *;
  `;

  if (client) {
    return client.query(query, [orderNumber]);
  } else {
    return process.pool.query(query, [orderNumber]);
  }
};

const patchOrderProduct = (id, data, client) => {
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE orderproducts SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  if (client) {
    return client.query(query, values);
  } else {
    return process.pool.query(query, values);
  }
};

const getProductStatusQuantity = (client, { orderproduct_id, statustype }) => {
  return client.query(
    `SELECT SUM(quantity) AS total_quantity FROM orderstatus WHERE orderproduct_id=$1 AND statustype=$2`,
    [orderproduct_id, statustype]
  );
};

const patchProductStatus = (id, data, client) => {
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE orderstatus SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  if (client) {
    return client.query(query, values);
  } else {
    return process.pool.query(query, values);
  }
};

const getExpenseCostOrder = (order_id, client) => {
  const query = `
  SELECT pr.orderproduct_id, 
  COALESCE(SUM((ce.daily_usd_amount/40 * sfo.quantity/1000)), 0) AS cost
FROM productionrecipes AS pr
JOIN shiftfororder AS sfo ON pr.id = sfo.production_recipe_id
JOIN companyexpenses AS ce ON sfo.date BETWEEN ce.start_date AND COALESCE(ce.end_date, CURRENT_DATE)
WHERE pr.order_id = $1
GROUP BY pr.id;`;

  const values = [order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getOrderProduct = (id, client) => {
  return client.query(`SELECT * FROM orderproducts WHERE id=$1`, [id]);
};

const insertOrderStock = (data, client) => {
  return client.query(
    `INSERT INTO orderstocks (
        orderproduct_id, logproduct_id, orderproduction_id, quantity
    )  
    VALUES (
        $1, $2, $3, $4
    ) 
    RETURNING *`,
    [
      data.orderproduct_id,
      data.logproduct_id ?? null,
      data.orderproduction_id ?? null,
      data.quantity,
    ]
  );
};
const approveOrderStock = (orderproduct_id, client) => {
  return client.query(
    `UPDATE orderstocks SET isapproved= TRUE 
    WHERE orderproduct_id=$1 
    RETURNING *`,
    [
      orderproduct_id
    ]
  );
};
const shipOrderStock = (orderproduct_id, client) => {
  return client.query(
    `UPDATE orderstocks SET isshipped= TRUE 
    WHERE orderproduct_id=$1 
    RETURNING *`,
    [
      orderproduct_id
    ]
  );
};
const getOrderStock = (client, orderproduct_id) => {
  return client.query(`SELECT * FROM orderstocks WHERE orderproduct_id=$1`, [
    orderproduct_id,
  ]);
};

const getOrderStockQuantity = (client, orderproduct_id) => {
  return client.query(
    `SELECT SUM(quantity) FROM orderstocks WHERE orderproduct_id=$1`,
    [orderproduct_id]
  );
};

const delOrderStocks = (client, orderproduct_id) => {
  return client.query(`DELETE  FROM orderstocks WHERE orderproduct_id=$1`, [
    orderproduct_id,
  ]);
};
module.exports = {
  insert,
  getOne,
  getAll,
  updateOrderStatus,
  update,
  updateStatus,
  del,
  _insertOrderCounter,
  _getOrderCounter,
  _updateOrderCounter,
  patchSome,
  updateGeneralOrderStatusForShipment,
  updateRecipeOrderStatusForShipment,
  patchOrderProduct,
  getOrderProducts,
  updateProduct,
  insertProduct,
  getProductStatus,
  insertProductStatus,
  updateProductStatus,
  delProduct,
  reduceProductStatus,
  updateProductShipStatus,
  getProductStatusQuantity,
  patchProductStatus,
  delProductStatus,
  getExpenseCostOrder,
  getOrderProduct,
  getProductStatusById,
  updateProductStatusByProduct,
  insertOrderStock,
  getOrderStock,
  delOrderStocks,
  getOrderStockQuantity,
  approveOrderStock,
  shipOrderStock
};
