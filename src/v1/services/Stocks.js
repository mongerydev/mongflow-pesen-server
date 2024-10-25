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

const getAllWarehouse = (client, product_type) => {
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
  s.currency,
  p.product_name,
  p."hasAttributes",
  p.product_type,
  s.companyname,
  CASE
  WHEN p."hasAttributes" = true THEN 
    (SELECT jsonb_object_agg(attr.attribute_name, val.value)
     FROM jsonb_each_text(w.attributes::jsonb) AS attr_val(key, value)
     JOIN attribute AS attr ON attr.attribute_id = attr_val.key::int
     JOIN value AS val ON val.value_id = attr_val.value::int
     ) 
  ELSE 
    NULL
  END AS attributeDetails
FROM 
  productstocks w
JOIN product p ON p.product_id = w.product_id
LEFT JOIN productstocklogs l ON l.id = w.log_id
LEFT JOIN logproducts lp ON lp.id = w.logproduct_id
LEFT JOIN customer s ON s.customerid = l.customer_id
WHERE 
  p.product_type = $1
GROUP BY 
  w.id, lp.product_unit, l.customer_id, s.companyname, p.product_name
ORDER BY 
  w.id ASC;
`;

  const values = [product_type];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getWarehouseStock = (id, client) => {
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
  s.currency,
  p.product_name,
  p."hasAttributes",
  p.product_type,
  s.companyname,
  CASE
  WHEN p."hasAttributes" = true THEN 
    (SELECT jsonb_object_agg(attr.attribute_name, val.value)
     FROM jsonb_each_text(w.attributes::jsonb) AS attr_val(key, value)
     JOIN attribute AS attr ON attr.attribute_id = attr_val.key::int
     JOIN value AS val ON val.value_id = attr_val.value::int
     ) 
  ELSE 
    NULL
  END AS attributeDetails
FROM 
  productstocks w
JOIN product p ON p.product_id = w.product_id
LEFT JOIN productstocklogs l ON l.id = w.log_id
LEFT JOIN logproducts lp ON lp.id = w.logproduct_id
LEFT JOIN customer s ON s.customerid = l.customer_id
WHERE 
  w.id = $1
GROUP BY 
  w.id, lp.product_unit, l.customer_id, s.companyname, p.product_name
ORDER BY 
  w.id ASC;
`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getProductStocks = (client, product_type) => {
  const query = `SELECT 
      w.id, 
      w.product_id, 
      w.price_primary, 
      w.price_secondary, 
      w.price, 
      w.quantity,
      w.attributes,
      w.log_id,
      w.logproduct_id,
      l.customer_id,
      l.customer_county,
      l.customer_city,
      l.waybill,
      lp.product_unit,
      s.currency,
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
    END AS attributedetails
    FROM 
      productstocks w
    LEFT JOIN productstocklogs AS l ON l.id = w.log_id
    LEFT JOIN logproducts AS lp ON lp.id = w.logproduct_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = l.customer_id
    WHERE 
      p.product_type = $1
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price_primary, 
      w.price_secondary, 
      w.price, 
      w.quantity,
      w.attributes,
      w.logproduct_id,
      w.log_id,
      l.customer_id,
      l.customer_county,
      l.customer_city,
      l.waybill,
      lp.product_unit,
      s.currency,
      p.product_name,
      p."hasAttributes",
      p.product_type,
      s.companyname
    ORDER BY 
      w.id ASC`;

  const values = [product_type];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getStockById = (client, id) => {
  const query = "SELECT * FROM productstocks WHERE id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getStockByLogId = (id, client) => {
  const query = `SELECT * FROM productstocks WHERE logproduct_id=$1`;
  const values = [id];

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

const insertStock = (data, client) => {
  const query = `
    INSERT INTO productstocks (product_id, attributes, price_primary, price_secondary, price, quantity, log_id, logproduct_id, shift_id, production_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *,
      (SELECT "hasAttributes" FROM product WHERE product_id = $1) AS "hasAttributes",
      (SELECT product_name FROM product WHERE product_id = $1)`;

  const values = [
    data.product_id,
    data.attributes,
    data.price_primary,
    data.price_secondary,
    data.price,
    data.quantity,
    data.log_id ?? null,
    data?.logproduct_id ?? null,
    data?.shift_id ?? null,
    data.production_id ?? null,
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

  const values = [data.logproduct_id, data.quantity];

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

// const reduceStock = async (data, client) => {
//   const query = `
//     UPDATE productstocks
//     SET
//         quantity = quantity - $3
//     WHERE
//         product_id = $1 AND
//         attributes = $2
//     RETURNING *`;

//   const values = [data.product_id, data.attributes, data.quantity];

//   if (client) return client.query(query, values);
//   return process.pool.query(query, values);
// };

const getStockByShiftId = async ({ shift_id, output_product_id }, client) => {
  const query = `
    SELECT * FROM productstocks WHERE shift_id = $1 AND product_id = $2 `;

  const values = [shift_id, output_product_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const reduceStockById = async (data, client) => {
  const query = `
    UPDATE productstocks
    SET 
        quantity = quantity - $2
    WHERE id=$1
    RETURNING *`;

  const values = [data.id, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const reduceStockByLogId = async (data, client) => {
  const query = `
    UPDATE productstocks
    SET 
        quantity = GREATEST(quantity - $2, 0) -- Prevent quantity from going below zero
    WHERE logproduct_id = $1
      AND quantity >= $2 -- Only update if there is enough stock
    RETURNING *`;

  const values = [data.logproduct_id, data.quantity];

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

const getAllStockCodes = (client) => {
  const query = "SELECT * FROM stockcodes";

  if (client) return client.query(query);
  return process.pool.query(query);
};

module.exports = {
  insertWarehouseStock,
  getWarehouseStock,
  getAllWarehouse,
  getProductStocks,
  getStock,
  insertStock,
  updateStock,
  updateEachStock,
  delStock,
  delWarehouse,
  undoStockUpdate,
  reduceStockById,
  getStockById,
  getStockByShiftId,
  delStockById,
  undoReduceStock,
  getStockByLogId,
  getAllStockCodes,
  reduceStockByLogId,
};
