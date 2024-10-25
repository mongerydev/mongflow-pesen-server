const insertLog = (data, client) => {
  const query = `
        INSERT INTO lastproductlogs (
            date, userid, product_id, attributes, price, 
            quantity, waybill, payment_type, payment_date, 
            customer_id, customer_city, customer_county, 
            currency_id, exchange_rate, vat_rate,
            vat_witholding_rate, vat_declaration,
            vat_witholding, price_with_vat, details,
            usd_rate, maturity_date, interest_rate
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, 
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20,
            $21, $22, $23
        ) 
        RETURNING *`;

  const values = [
    data.date,
    data.userid,
    data.product_id,
    data.attributes,
    data.price,
    data.quantity,
    data.waybill,
    data.payment_type,
    data.payment_date,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.currency_id,
    data.exchange_rate,
    data.vat_rate,
    data.vat_witholding_rate,
    data.vat_declaration,
    data.vat_witholding,
    data.price_with_vat,
    data.details,
    data.usd_rate,
    data.maturity_date,
    data.interest_rate,

  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertWarehouseStock = (data, client) => {
  const query = `
        INSERT INTO lastproductwarehouse (
            product_id, attributes, price, 
            quantity, customer_id, customer_city, customer_county, 
            currency_id, exchange_rate
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9
        ) 
        RETURNING *`;

  const values = [
    data.product_id,
    data.attributes,
    data.price,
    data.quantity,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.currency_id,
    data.exchange_rate,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateWarehouseStock = (data, client) => {
  const query = `
    UPDATE lastproductwarehouse 
    SET 
        price = ROUND(((price * quantity + $2::numeric * $1::numeric) / (quantity + $2::numeric))::numeric, 4),
        quantity = quantity + $2
    WHERE id=$3
    RETURNING *`;

  const values = [data.price, data.quantity, data.id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getWarehouseStock = (data, client) => {
  const query = `
    SELECT * from lastproductwarehouse
    WHERE 
      product_id = $1 
      AND attributes = $2 
      AND customer_id = $3 
      AND customer_city = $4
      AND customer_county = $5
  `;
  const values = [
    data.product_id,
    data.attributes,
    data.customer_id,
    data.customer_city,
    data.customer_county,
  ];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

// const getProductStocks = ()=>{
//   return process.pool.query(
//     `SELECT * FROM lastproductstocks ORDER BY id ASC`
//   );
// }

const getProductStocks = (client) => {
  const query = `SELECT 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.log_id,
      w.logproduct_id,
      l.customer_id,
      l.exchange_rate,
      c.currency_code,
      p.product_name,
      p."hasAttributes",
      p.product_type,
      s.companyname,
      CASE
      WHEN p."hasAttributes" = true THEN 
        COALESCE(
          (
            SELECT jsonb_object_agg(attr.attribute_name, val.value)
            FROM jsonb_each_text(w.attributes::jsonb) AS attr_val(key, value)
            LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.key::int
            LEFT JOIN value AS val ON val.value_id = attr_val.value::int
          ), '{}'::jsonb
        )
      ELSE 
        NULL
    END AS attributeDetails
    FROM 
      productstocks w
    LEFT JOIN productstocklogs AS l ON l.id = w.log_id
    LEFT JOIN currency AS c ON c.currency_id = l.currency_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = l.customer_id
    WHERE 
      p.product_type = 0
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.logproduct_id,
      w.log_id,
      l.customer_id,
      l.exchange_rate,
      c.currency_code,
      p.product_name,
      p."hasAttributes",
      p.product_type,
      s.companyname
    ORDER BY 
      w.id ASC`;

  if (client) return client.query(query);
  return process.pool.query(query);
};
const getLast = (attributes, client) => {
  const query = `
        SELECT s.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
        FROM stocks s
        LEFT JOIN "User" u ON u.userid = s.constituent
        LEFT JOIN "User" u2 ON u2.userid = s.last_edited_by
        LEFT JOIN product p ON p.product_id = s.product_id
        WHERE s.attributes = $1
        ORDER BY s.date DESC
        LIMIT 1
    `;

  if (client) return client.query(query, [attributes]);
  return process.pool.query(query, [attributes]);
};

const getLastSet = (attributesList, client) => {
  // Create a string of placeholders for the query ($1, $2, $3, etc.)
  const placeholders = attributesList
    .map((_, index) => `$${index + 1}`)
    .join(",");
  const query = `
        SELECT s.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
        FROM stocks s
        LEFT JOIN "User" u ON u.userid = s.constituent
        LEFT JOIN "User" u2 ON u2.userid = s.last_edited_by
        LEFT JOIN product p ON p.product_id = s.product_id
        WHERE s.attributes IN (${placeholders})
        ORDER BY s.date DESC;
    `;

  return client.query(query, attributesList).then((result) => {
    if (result.rows.length === 0) {
      throw new Error("No stock entries found for the provided attributes");
    }
    return result.rows;
  });
};

// const getRangeLogs = (data) => {
//     console.log("data", data)
//     return process.pool.query(
//       'SELECT * FROM "lastproductlogs" WHERE date BETWEEN $1 AND $2 ORDER BY date ASC',
//       [data.startDate, data.endDate]
//     );
// }

const getAllAttributeDetails = (id, client) => {
  const query = `SELECT lastproductlogs.product_id, 
                jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
         FROM lastproductlogs
         LEFT JOIN LATERAL (
             SELECT key::int AS attr_id, value::int AS val_id
             FROM jsonb_each_text(lastproductlogs.attributes::jsonb)
         ) AS attr_val ON true
         LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
         LEFT JOIN value AS val ON val.value_id = attr_val.val_id
         WHERE lastproductlogs.id= $1
         GROUP BY lastproductlogs.product_id`;

  const values = [id];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getAttributeDetails = (attributesJson, client) => {
  const query = `
    SELECT 
      attr.attribute_name,
      val.value
    FROM (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text($1::jsonb)
    ) AS attr_val
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
  `;

  const values = [attributesJson];

  return new Promise((resolve, reject) => {
    (client || process.pool).query(query, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const attributeDetails = {};
        result.rows.forEach((row) => {
          attributeDetails[row.attribute_name] = row.value;
        });
        resolve(attributeDetails);
      }
    });
  });
};

const getRangeLogs = (data, client) => {
  const query = `SELECT 
  s.*, 
  aggregated_products.products,
  c.companyname, 
  cu.currency_code, 
  u.username
FROM 
  productstocklogs s
INNER JOIN 
  (
      SELECT 
          log_id,
          jsonb_agg(jsonb_build_object(
              'product_id', pl.product_id,
              'attributes', pl.attributes,
              'quantity', pl.quantity,
              'product_unit', pl.product_unit,
              'price_tl', pl.price_tl,
              'price', pl.price,
              'price_with_vat', pl.price_with_vat,
              'product_name', p.product_name,
              'hasAttributes', p."hasAttributes",
              'attributeDetails', (
                  CASE
                      WHEN p."hasAttributes" = true THEN 
                          COALESCE(
                              (
                                  SELECT jsonb_object_agg(attr.attribute_name, val.value)
                                  FROM LATERAL (
                                      SELECT key::int AS attr_id, value::int AS val_id
                                      FROM jsonb_each_text(pl.attributes::jsonb)
                                  ) AS attr_val
                                  LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
                                  LEFT JOIN value AS val ON val.value_id = attr_val.val_id
                              ), '{}'::jsonb
                          )
                      ELSE 
                          null
                  END
              )
          )) AS products
      FROM 
          logproducts AS pl
      INNER JOIN product AS p ON p.product_id = pl.product_id 
      WHERE p.product_type = 0
      GROUP BY  log_id
  ) AS aggregated_products ON s.id = aggregated_products.log_id
LEFT JOIN 
  customer AS c ON c.customerid = s.customer_id
LEFT JOIN 
  currency AS cu ON cu.currency_id = s.currency_id
LEFT JOIN 
  "User" AS u ON u.userid = s.userid
WHERE 
  s.date BETWEEN $1 AND $2
ORDER BY 
  s.date ASC;
`;

  const values = [data.startDate, data.endDate];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
// const getRangeLogs = () => {
//   return process.pool.query(
//     `SELECT 
//     s.id, s.product_id, s.*, p.product_name, p."hasAttributes", c.companyname, cu.currency_code, u.username,
//     CASE
//         WHEN p."hasAttributes" = true THEN 
//             COALESCE(
//                 (
//                     SELECT jsonb_object_agg(attr.attribute_name, val.value)
//                     FROM LATERAL (
//                         SELECT key::int AS attr_id, value::int AS val_id
//                         FROM jsonb_each_text(s.attributes::jsonb)
//                     ) AS attr_val
//                     LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
//                     LEFT JOIN value AS val ON val.value_id = attr_val.val_id
//                 ), '{}'::jsonb
//             )
//         ELSE 
//             null
//     END AS attributeDetails
// FROM 
// lastproductlogs s
// LEFT JOIN product AS p ON p.product_id = s.product_id
// LEFT JOIN customer AS c ON c.customerid = s.customer_id
// LEFT JOIN currency AS cu ON cu.currency_id = s.currency_id
// LEFT JOIN "User" AS u ON u.userid = s.userid

// GROUP BY 
//     s.id, s.product_id, s.*, p.product_name, p."hasAttributes", c.companyname, cu.currency_code, u.username
// ORDER BY 
//     s.id ASC;`
//   );
// };

const getAllWarehouse = () => {
  return process.pool.query(
    `SELECT 
      w.id, 
      w.product_id, 
      w.price, 
      w.quantity,
      w.attributes,
      w.customer_id,
      w.customer_city,
      w.customer_county,
      w.exchange_rate,
      c.currency_code,
      p.product_name,
      s.companyname,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
      lastproductwarehouse w
    LEFT JOIN LATERAL (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text(w.attributes::jsonb)
    ) AS attr_val ON true
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
    LEFT JOIN currency AS c ON c.currency_id = w.currency_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = w.customer_id
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price, 
      w.quantity,
      w.attributes,
      w.customer_id,
      w.customer_city,
      w.customer_county,
      w.exchange_rate,
      c.currency_code,
      p.product_name,
      s.companyname
    ORDER BY 
      w.id ASC`
  );
};

const update = (data, client) => {
  const query =
    "UPDATE stocks SET stock = $1, last_edited_by = $2 WHERE stock_id = $3 RETURNING *";
  const values = [data.stock, data.userid, data.stock_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateSet = async (data, client) => {
  // Ensure that stockDiff and stockId are present
  if (data.stockDiff === undefined || data.stock_id === undefined) {
    throw new Error("stockDiff and stock_id must be provided");
  }

  const query = `
        UPDATE stocks
        SET stock = stock - $1, last_edited_by = $2
        WHERE stock_id = $3
        RETURNING *;
    `;

  // Execute the update query with the provided stockDiff and stock_id
  const result = await client.query(query, [
    data.stockDiff,
    data.userid,
    data.stock_id,
  ]);

  if (result.rowCount === 0) {
    // If no rows are updated, log an error or throw an exception
    console.error(`No stock entry updated for stock_id: ${data.stock_id}`);
    throw new Error(`No stock entry updated for stock_id: ${data.stock_id}`);
  }

  console.log("Stock update result:", result.rows[0]);
  return result.rows[0]; // Return the updated stock entry
};

const del = (id) => {
  return process.pool.query("DELETE FROM stocks WHERE stock_id = $1", [id]);
};

const delLog = (id, client) => {
  const query = `DELETE FROM lastproductlogs WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delStock = (id, client) => {
  const query = `DELETE FROM lastproductstocks WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delWarehouse = (id, client) => {
  const query = `DELETE FROM lastproductwarehouse WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getStock = (data, client) => {
  const query =
    "SELECT * FROM productstocks WHERE product_id = $1 and attributes=$2";
  const values = [data.product_id, data.attributes];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getLog = (id, client) => {
  const query =
    "SELECT product_id, attributes, price, quantity, customer_id, customer_city, customer_county FROM lastproductlogs WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const getAllStockCodes = ( client) => {
  const query =
    "SELECT * FROM stockcodes";


  if (client) return client.query(query);
  return process.pool.query(query);
};

const undoStockUpdate = (data, client) => {
  const query = `
  UPDATE lastproductstocks 
  SET 
      price = CASE 
                  WHEN (quantity - $4::numeric) <= 0 THEN 0 
                  ELSE ROUND(((price * quantity - $4::numeric * $3::numeric) / (quantity - $4::numeric))::numeric, 4) 
              END,
      quantity = CASE 
                    WHEN (quantity - $4::numeric) <= 0 THEN 0 
                    ELSE quantity - $4::numeric 
                END
  WHERE 
      product_id = $1 AND 
      attributes = $2 
  RETURNING *`;

  const values = [data.product_id, data.attributes, data.price, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const undoWarehouseStockUpdate = (data, client) => {
  const query = `
   UPDATE lastproductwarehouse
   SET 
       price = CASE 
                   WHEN (quantity - $6::numeric) <= 0 THEN 0 
                   ELSE ROUND(((price * quantity - $6::numeric * $5::numeric) / (quantity - $6::numeric))::numeric, 4) 
               END,
       quantity = CASE 
                     WHEN (quantity - $6::numeric) <= 0 THEN 0 
                     ELSE quantity - $6::numeric 
                 END
   WHERE 
       product_id = $1 AND 
       attributes = $2 AND
       customer_id = $3 AND
       customer_city = $4 AND
       customer_county = $7
   RETURNING *`;

  const values = [
    data.product_id,
    data.attributes,
    data.customer_id,
    data.customer_city,
    data.price,
    data.quantity,
    data.customer_county,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertStock = (data, client) => {
  const query =
    "INSERT INTO productstocks (product_id, attributes, price_usd, quantity ) VALUES( $1, $2, $3, $4) RETURNING *";
  const values = [data.product_id, data.attributes, data.price_usd, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateStock = (data, client) => {
  const query = `
    WITH updated_stock AS (
      UPDATE productstocks 
      SET 
        price_usd = ROUND(((price_usd * quantity + $4::numeric * $3::numeric) / (quantity + $4::numeric))::numeric, 4),
        quantity = quantity + $4 
      WHERE 
        product_id = $1 AND 
        attributes = $2 
      RETURNING *
    )
    SELECT 
      us.*,
      p."hasAttributes"
    FROM 
      updated_stock us
    INNER JOIN 
      product p ON us.product_id = p.product_id`;

  const values = [
    data.product_id,
    data.attributes,
    data.price_usd,
    data.quantity,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const reduceStock = async (data, client) => {
  const query = `
    UPDATE productstocks 
    SET 
        quantity = quantity - $2
    WHERE 
        product_id = $1 AND attributes= $3 AND quantity >=$2 RETURNING *`;

  const values = [data.product_id, data.quantity, data.attributes];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

module.exports = {
  insertLog,
  insertWarehouseStock,
  updateWarehouseStock,
  getWarehouseStock,
  getStock,
  getLog,
  insertStock,
  updateStock,
  getRangeLogs,
  update,
  updateSet,
  del,
  delLog,
  delStock,
  delWarehouse,
  undoStockUpdate,
  undoWarehouseStockUpdate,
  getLast,
  getLastSet,
  getAllWarehouse,
  getAllAttributeDetails,
  getAttributeDetails,
  getProductStocks,
  getAllStockCodes,
  reduceStock

};
