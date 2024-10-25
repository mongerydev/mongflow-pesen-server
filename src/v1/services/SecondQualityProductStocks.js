const getAll = (client) => {
  const query = `SELECT 
      s.id, s.product_id, s.price_tl, s.price_usd, s.quantity, p.product_name, p."hasAttributes",
      CASE
          WHEN p."hasAttributes" = true THEN 
              COALESCE(
                  (
                      SELECT jsonb_object_agg(attr.attribute_name, val.value)
                      FROM LATERAL (
                          SELECT key::int AS attr_id, value::int AS val_id
                          FROM jsonb_each_text(s.attributes::jsonb)
                      ) AS attr_val
                      LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
                      LEFT JOIN value AS val ON val.value_id = attr_val.val_id
                  ), '{}'::jsonb
              )
          ELSE 
          null
      END AS attributeDetails
  FROM 
      productstocks s
  INNER JOIN product AS p ON p.product_id = s.product_id AND p.product_type = 3
  
  GROUP BY 
      s.id, s.product_id, s.price_tl, s.price_usd, s.quantity, s.attributes, p.product_name, p."hasAttributes"
  ORDER BY 
      s.id ASC;`;

  if (client) return client.query(query);
  return process.pool.query(query);
};

const getAllWarehouse = (client) => {
  const query = `SELECT 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.log_id,
      w.shift_id,
      lp.product_unit,
      l.customer_id,
      l.customer_city,
      l.customer_county,
      l.exchange_rate,
      c.currency_code,
      p.product_name,
      s.companyname,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
      productstocks w
    LEFT JOIN LATERAL (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text(w.attributes::jsonb)
    ) AS attr_val ON true
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
    LEFT JOIN productstocklogs AS l ON l.id = w.log_id
    LEFT JOIN logproducts AS lp ON lp.id = w.logproduct_id
    LEFT JOIN currency AS c ON c.currency_id = l.currency_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = l.customer_id
    WHERE 
      p.product_type = 3
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.log_id,
      w.shift_id,
      lp.product_unit,
      l.customer_id,
      l.customer_city,
      l.customer_county,
      l.exchange_rate,
      c.currency_code,
      p.product_name,
      s.companyname
    ORDER BY 
      w.id ASC`;

  if (client) return client.query(query);
  return process.pool.query(query);
};
const updateEach = async (id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE secondqualityproductstocks SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const insertLog = (data, client) => {
  const query = `
          INSERT INTO secondqualityproductlogs (
              date, userid, product_id, attributes, price, 
              quantity, waybill, payment_type, payment_date, 
              customer_id, customer_city, customer_county, 
              currency_id, exchange_rate, vat_rate,
              vat_witholding_rate, vat_declaration,
              vat_witholding, price_with_vat, details,
              usd_rate
          ) 
          VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10, 
              $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20,
              $21
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
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getAllLogs = () => {
  return process.pool.query(
    "SELECT * FROM secondqualityproductlogs ORDER BY date ASC"
  );
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
        WHERE p.product_type = 3
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
const updateEachLog = async (id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE secondqualityproductlogs SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const getStock = (data, client) => {
  const query = "SELECT id FROM productstocks WHERE product_id = $1 ";
  const values = [data.product_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertStock = (data, client) => {
  const query =
    "INSERT INTO productstocks (product_id, price_tl, price_usd, quantity, shift_id ) VALUES( $1, $2, $3, $4, $5) RETURNING *";
  const values = [
    data.product_id,
    data.price_tl,
    data.price_usd,
    data.quantity,
    data.shift_id,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateStock = (data, client) => {
  const query = `
    UPDATE productstocks 
    SET 
        price = ROUND(((price * quantity + $3::numeric * $2::numeric) / (quantity + $3::numeric))::numeric, 4),
        price_usd = ROUND(((price_usd * quantity + $3::numeric * $2::numeric) / (quantity + $3::numeric))::numeric, 4),
        quantity = quantity + $3
    WHERE 
        id = $1
    RETURNING *`;

  const values = [data.id, data.price, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

module.exports = {
  getAll,
  updateEach,
  insertLog,
  updateEachLog,
  getAllLogs,
  getRangeLogs,
  updateStock,
  insertStock,
  getStock,
  getAllWarehouse
};
