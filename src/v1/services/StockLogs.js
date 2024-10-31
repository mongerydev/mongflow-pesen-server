const insertLog = (data, client) => {
  const query = `
          INSERT INTO productstocklogs (
              date, userid, total_price, 
               waybill, payment_type, payment_date, 
              customer_id, customer_city, customer_county, 
              secondary_rate, vat_rate,
              vat_witholding_rate, vat_declaration,
              vat_witholding, total_price_with_vat, details, primary_rate, 
              maturity_date, interest_rate
          ) 
          VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10, 
              $11, $12, $13, $14, $15,
              $16, $17, $18, $19
          ) 
          RETURNING *`;

  const values = [
    data.date,
    data.userid,
    data.total_price,
    data.waybill,
    data.payment_type,
    data.payment_date,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.secondary_rate,
    data.vat_rate,
    data.vat_witholding_rate,
    data.vat_declaration,
    data.vat_witholding,
    data.total_price_with_vat,
    data.details,
    data.primary_rate,
    data.maturity_date,
    data.interest_rate,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertLogProduct = (data, client) => {
  const query = `
      WITH p AS (
        SELECT *
        FROM product
        WHERE product_id = $2
      ), pl AS (
        INSERT INTO logproducts (
          log_id, product_id, attributes, quantity, price, price_with_vat, price_primary, price_secondary, product_unit
        ) 
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        RETURNING *
      )
      SELECT *, (SELECT "hasAttributes" from p), (SELECT  product_name FROM p) FROM pl`;

  const values = [
    data.log_id,
    data.product_id,
    data.attributes,
    data.quantity,
    data.price,
    data.price_with_vat,
    data.price_primary,
    data.price_secondary,
    data.product_unit,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getLog = (id, client) => {
  const query = "SELECT * FROM productstocklogs WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const getLogIdByProduct = (id, client) => {
  const query = "SELECT log_id FROM logproducts WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateLog = (data, client) => {
  const query = `
      UPDATE productstocklogs
      SET 
          date = $1,
          userid = $2,
          total_price = $3,
          waybill = $4,
          payment_type = $5,
          payment_date = $6,
          customer_id = $7,
          customer_city = $8,
          customer_county = $9,
          secondary_rate = $10,
          vat_rate = $11,
          vat_witholding_rate = $12,
          vat_declaration = $13,
          vat_witholding = $14,
          total_price_with_vat = $15,
          details = $16,
          primary_rate = $17,
          maturity_date=$18,
          interest_rate=$19
      WHERE id = $20
      RETURNING *`;

  const values = [
    data.date,
    data.userid,
    data.total_price,
    data.waybill,
    data.payment_type,
    data.payment_date,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.secondary_rate,
    data.vat_rate,
    data.vat_witholding_rate,
    data.vat_declaration,
    data.vat_witholding,
    data.total_price_with_vat,
    data.details,
    data.primary_rate,
    data.maturity_date,
    data.interest_rate,
    data.id,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const deleteAllLogProducts = (data, client) => {
  const query = `
   DELETE FROM logproducts WHERE log_id=$1`;

  const values = [data.log_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getLogProducts = (data, client) => {
  const query = `SELECT * FROM logproducts WHERE log_id=$1`;

  const values = [data.log_id];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const updateLogApproval = (id, client) => {
  const query = `
    UPDATE productstocklogs
    SET isapproved=TRUE
    WHERE 
        id = $1 
    RETURNING *`;

  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateEachLog = async (id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE productstocklogs SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const reduceStockByLogId = async (client, data) => {
  const query = `
      UPDATE productstocks 
      SET quantity = $2 WHERE logproduct_id = $1 RETURNING *`;

  const values = [data.id, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getRangeLogs = (data, client) => {
  const query = `SELECT 
    s.*, 
    aggregated_products.products,
    c.companyname, 
    c.currency, 
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
                'price_primary', pl.price_primary,
                'price_secondary', pl.price_secondary,
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
        WHERE p.product_type = $3
        GROUP BY  log_id
    ) AS aggregated_products ON s.id = aggregated_products.log_id
  LEFT JOIN 
    customer AS c ON c.customerid = s.customer_id
  LEFT JOIN 
    "User" AS u ON u.userid = s.userid
  WHERE 
    s.date BETWEEN $1 AND $2
  ORDER BY 
    s.date ASC;
  `;

  const values = [data.startDate, data.endDate, data.product_type];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delLog = (id, client) => {
  const query = `DELETE FROM productstocklogs WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getLogsNonApproved = (client) => {
  const query = `SELECT 
  s.*, 
  aggregated_products.products,
  c.companyname, 
  c.currency, 
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
              'price_primary', pl.price_primary,
              'price_secondary', pl.price_secondary,
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
      GROUP BY log_id
  ) AS aggregated_products ON s.id = aggregated_products.log_id
LEFT JOIN 
  customer AS c ON c.customerid = s.customer_id
LEFT JOIN 
  "User" AS u ON u.userid = s.userid
WHERE isapproved=FALSE
ORDER BY 
  s.date ASC;
`;

  if (client) return client.query(query);
  return process.pool.query(query);
};

const _getUsageLogs = (product_type, client) => {
  const query = `SELECT ul.*, p.product_name, lp.price_primary, lp.product_unit, psl.waybill, c.companyname, u.username
  FROM usagelogs ul
    LEFT JOIN logproducts lp ON ul.logproduct_id = lp.id
    LEFT JOIN product p ON lp.product_id = p.product_id
    LEFT JOIN productstocklogs psl ON lp.log_id = psl.id
    LEFT JOIN customer c ON psl.customer_id= c.customerid
    LEFT JOIN "User" u ON ul.user_id= u.userid
  WHERE ul.product_type=$1`;

  const values=[product_type]
  if (client) return client.query(query, values);
  return process.pool.query(query);
};

const insertUsageLog = (data, client) => {
  const query = `
        INSERT INTO usagelogs (
            date, user_id, logproduct_id, quantity, 
            details, product_type
        ) 
        VALUES (
            $1, $2, $3, $4, $5, $6
           
        ) 
        RETURNING *`;

  const values = [
    data.date,
    data.user_id,
    data.logproduct_id,
    data.quantity,
    data.details,
    data.product_type,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

module.exports = {
  insertLog,
  insertLogProduct,
  updateLog,
  deleteAllLogProducts,
  getLogProducts,
  updateEachLog,
  getRangeLogs,
  reduceStockByLogId,
  updateLog,
  delLog,
  getLog,
  updateLogApproval,
  getLogIdByProduct,
  getLogsNonApproved,
  _getUsageLogs,
  insertUsageLog
};
