const insertLog = (data, client) => {
  const query = `
        INSERT INTO productstocklogs (
            date, userid, total_price, 
             waybill, payment_type, payment_date, 
            customer_id, customer_city, customer_county, 
            currency_id, exchange_rate, vat_rate,
            vat_witholding_rate, vat_declaration,
            vat_witholding, total_price_with_vat, details, usd_rate, 
            maturity_date, interest_rate
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, 
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20
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
    data.currency_id,
    data.exchange_rate,
    data.vat_rate,
    data.vat_witholding_rate,
    data.vat_declaration,
    data.vat_witholding,
    data.total_price_with_vat,
    data.details,
    data.usd_rate,
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
        log_id, product_id, attributes, quantity, price, price_with_vat, price_tl, price_usd, product_unit
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
    data.price_tl,
    data.price_usd,
    data.product_unit,
  ];

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
        currency_id = $10,
        exchange_rate = $11,
        vat_rate = $12,
        vat_witholding_rate = $13,
        vat_declaration = $14,
        vat_witholding = $15,
        total_price_with_vat = $16,
        details = $17,
        usd_rate = $18,
        maturity_date=$19,
        interest_rate=$20
    WHERE id = $21
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
    data.currency_id,
    data.exchange_rate,
    data.vat_rate,
    data.vat_witholding_rate,
    data.vat_declaration,
    data.vat_witholding,
    data.total_price_with_vat,
    data.details,
    data.usd_rate,
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

const insertWarehouseStock = (data, client) => {
  const query = `
        INSERT INTO productwarehousestocks (
            product_id, attributes, price_tl, price_usd, 
            quantity, log_id
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6
        ) 
        RETURNING *`;

  const values = [
    data.product_id,
    data.attributes,
    data.price_tl,
    data.price_usd,
    data.quantity,
    data.log_id,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
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
      w.logproduct_id,
      lp.product_unit,
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
    LEFT JOIN logproducts AS lp ON lp.id = w.logproduct_id
    LEFT JOIN currency AS c ON c.currency_id = l.currency_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = l.customer_id
    WHERE 
      p.product_type = 1
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.logproduct_id,
      w.log_id,
      lp.product_unit,
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
const getWarehouseStock = (id,client) => {
  const query = `SELECT 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.log_id,
      w.logproduct_id,
      lp.product_unit,
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
    LEFT JOIN logproducts AS lp ON lp.id = w.logproduct_id
    LEFT JOIN currency AS c ON c.currency_id = l.currency_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = l.customer_id
    WHERE 
      w.id = $1
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price_tl, 
      w.price_usd, 
      w.quantity,
      w.attributes,
      w.logproduct_id,
      w.log_id,
      lp.product_unit,
      l.customer_id,
      l.exchange_rate,
      c.currency_code,
      p.product_name,
      p."hasAttributes",
      p.product_type,
      s.companyname
    ORDER BY 
      w.id ASC`;
      const values = [id];

      if (client) return client.query(query, values);
      return process.pool.query(query, values);
};
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
      p.product_type = 1
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

const getStockById = (client, id) => {
  const query = "SELECT * FROM productstocks WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
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

const updateEachStock = async (order_id) => {
  const client = await process.pool.connect();
  const query = "SELECT details FROM recipes WHERE order_id=$1";
  const { rows } = await process.pool.query(query, [parseInt(order_id)]);
  console.log(rows);
  const recipe_details = rows;
  for (const recipe of recipe_details) {
    await client.query("BEGIN");

    try {
      const keys = Object.keys(recipe.details);
      for (const key of keys) {
        const stockReduction = recipe.details[key];
        const id = parseInt(key, 10); // Assuming the key represents an ID
        console.log("id of material: ", id);
        const selectQuery = {
          text: "SELECT * FROM recipematerialstocks WHERE id = $1",
          values: [id],
        };

        const { rows } = await client.query(selectQuery);

        if (rows.length === 1) {
          const row = rows[0];
          const updatedStock = row.stock - stockReduction;

          if (updatedStock < 0) {
            console.error(`Negative stock for ID ${id}`);
            await client.query("ROLLBACK");
            throw new Error("Negative stock encountered");
          }
          const updateQuery = {
            text: "UPDATE recipematerialstocks SET quantity = $1 WHERE id = $2",
            values: [updatedStock, id],
          };

          await client.query(updateQuery);
        } else {
          console.error(`No or multiple rows found for ID ${id}`);
          throw new Error("Error processing details");
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transaction rolled back:", error);
      throw new Error("Error processing details");
    }
  }

  const stocks = await process.pool.query(
    "SELECT * FROM recipematerialstocks ORDER BY id ASC"
  );

  return stocks;
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
      WHERE p.product_type = 1
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

const updateLogApproval = async (id, client) => {
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

const insertStock = (data, client) => {
  const query = `
    INSERT INTO productstocks (product_id, attributes, price_tl, price_usd, quantity, log_id, logproduct_id, shift_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *,
      (SELECT "hasAttributes" FROM product WHERE product_id = $1) AS "hasAttributes",
      (SELECT product_name FROM product WHERE product_id = $1)`;

  const values = [
    data.product_id,
    data.attributes,
    data.price_tl,
    data.price_usd,
    data.quantity,
    data.log_id ?? null,
    data?.logproduct_id ?? null,
    data?.shift_id ?? null,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const undoReduceStock = (data, client) => {
  const query = `
    WITH updated_stock AS (
      UPDATE productstocks 
      SET 
        quantity = quantity + $2::numeric
      WHERE 
        logproduct_id = $1 
      RETURNING *
    )
    SELECT 
      us.*,
      p."hasAttributes",
      p.product_name
    FROM 
      updated_stock us
    INNER JOIN 
      product p ON us.product_id = p.product_id`;

  const values = [
    data.logproduct_id,
    data.quantity,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const updateStock = (data, client) => {
  const query = `
    WITH updated_stock AS (
      UPDATE productstocks 
      SET 
        price_tl = ROUND(((price_tl * quantity + $3::numeric * $2::numeric) / (quantity + $3::numeric))::numeric, 4),
        price_usd = ROUND(((price_usd * quantity + $3::numeric * $4::numeric) / (quantity + $3::numeric))::numeric, 4),
        quantity = quantity + $3
      WHERE 
        product_id = $1 
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
    data.price_tl,
    data.quantity,
    data.price_usd,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const reduceStock = async (data, client) => {
  const query = `
    UPDATE productstocks 
    SET 
        quantity = quantity - $3 
    WHERE 
        product_id = $1 AND 
        attributes = $2 
    RETURNING *`;

  const values = [data.product_id, data.attributes, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const getStockByShiftId = async ({shift_id, output_product_id}, client) => {
  const query = `
    SELECT * FROM productstocks WHERE shift_id = $1 AND product_id = $2 `;

  const values = [shift_id, output_product_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const reduceWarehouseStock = async (data, client) => {
  const query = `
    UPDATE productwarehousestocks
    SET 
        quantity = quantity - $2
    WHERE id=$1
    RETURNING *`;

  const values = [data.id, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delLog = (id, client) => {
  const query = `DELETE FROM productstocklogs WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delStock = (id, client) => {
  const query = `DELETE FROM productstocks WHERE logproduct_id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const delStockById = (id, client) => {
  const query = `DELETE FROM productstocks WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delWarehouse = (id, client) => {
  const query = `DELETE FROM productwarehousestocks WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getStock = (data, client) => {
  let query;

  query = `SELECT ps.*, p.product_name 
             FROM productstocks ps
             LEFT JOIN product p 
             ON ps.product_id = p.product_id 
             WHERE ps.product_id = $1`;

  const values = [data.product_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getLog = (id, client) => {
  const query = "SELECT * FROM productstocklogs WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const undoStockUpdate = (data, client) => {
  const query = `
  UPDATE productstocks 
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

  const values = [
    data.product_id,
    data.attributes,
    data.price_tl,
    data.quantity,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getStockByLogId = (id, client) => {
  const query = `SELECT * FROM productstocks WHERE logproduct_id=$1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

module.exports = {
  insertLog,
  insertLogProduct,
  updateLog,
  deleteAllLogProducts,
  getLogProducts,
  insertWarehouseStock,
  getWarehouseStock,
  getAllWarehouse,
  getProductStocks,
  getStock,
  insertStock,
  updateStock,
  updateEachLog,
  getRangeLogs,
  updateEachStock,
  reduceStockByLogId,
  updateLog,
  delLog,
  delStock,
  delWarehouse,
  getLog,
  undoStockUpdate,
  updateLogApproval,
  reduceStock,
  reduceWarehouseStock,
  getStockById,
  getStockByLogId,
  getStockByShiftId,
  delStockById,
  undoReduceStock
};
