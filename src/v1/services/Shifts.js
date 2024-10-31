// const createShift = (data, client) => {
//   console.log("data", data)
//  const query =
//    'INSERT INTO "shifts" (date, shift_number, consumable_products, bunker_quantity ) VALUES ($1, $2, $3::jsonb[], $4) RETURNING *';
//  const values = [
//    data.date,
//    data.shift,
//   data.consumable_products,
//    data.bunker_quantity,
//  ];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };

// const insertForOrder = (data, client) => {
//  console.log("insertfororder data", data);

//  const query =
//    'INSERT INTO "shiftfororder" (shift_id, date, shift_number, production_recipe_id, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *';
//  const values = [
//    data.shift_id,
//    data.date,
//    parseInt(data.shift),
//    data.production_recipe_id,
//    parseInt(data.quantity),
//  ];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };

// const insertForProcess = (data, client) => {
//  const query =
//    'INSERT INTO "shiftforprocess" (shift_id, date, shift_number, used_products, output_product_id, output_quantity, used_product_cost ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
//  const values = [
//    data.shift_id,
//    data.date,
//    parseInt(data.shift),
//    data.usedProducts,
//    parseInt(data.output_product),
//    parseInt(data.output_quantity),
//    parseFloat(data.usedProductsCosts),
//  ];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };

// const getDayShiftsOrder = (data, client) => {
//  const query = `SELECT 
//      sf.*, 
//      (
//          SELECT jsonb_build_object(
//              'id', pr.id,
//              'orderproduct_id', pr.orderproduct_id,
//              'details', pr.details,
//              'order_id', pr.order_id,
//              'attributes', pr.attributes,
//              'product_name', p.product_name,
//              'attributeDetails', jsonb_object_agg(attr.attribute_name, val.value)
//          ) 
//          FROM  
//              "productionrecipes" pr 
//              JOIN "product" p ON pr.product_id = p.product_id
//              LEFT JOIN LATERAL (
//                SELECT key::int AS attr_id, value::int AS val_id
//                FROM jsonb_each_text(pr.attributes::jsonb)
//              ) AS attr_val ON true
//              LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
//              LEFT JOIN value AS val ON val.value_id = attr_val.val_id
//          WHERE 
//              sf.production_recipe_id = pr.id
//          GROUP BY 
//              pr.id, p.product_name
//      ) AS production_recipe
//    FROM 
//      "shiftfororder" sf 
//    WHERE 
//      DATE(sf.date) = $1;
//  `;
//  const values = [data.date];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };

// const getDayShiftsProcess = (data, client) => {
//  const query = `SELECT 
//        sfp.*, 
//        p.product_name AS output_product_name
//     FROM 
//        "shiftforprocess" sfp
//     JOIN 
//        "product" p ON p.product_id = sfp.output_product_id
//     WHERE 
//        DATE(sfp.date) = $1
//     GROUP BY 
//        sfp.id, p.product_name `;
//  const values = [data.date];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getShiftDetail = (data, client) => {
//  const query = `SELECT * FROM shifts WHERE DATE(date) = $1`;
//  const values = [data.date];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };

// const getOrderShift = (data, client) => {
//  const query =
//    'SELECT id FROM "shiftfororder" WHERE date = $1 AND shift_number=$2';
//  const values = [data.date, data.shift];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getShiftOrdersById = (id, client) => {
//  const query = 'SELECT id FROM "shiftfororder" WHERE id = $1';
//  const values = [id];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getShiftProcessById = (shift_id, client) => {
//  const query = 'SELECT * FROM "shiftforprocess" WHERE shift_id = $1';
//  const values = [shift_id];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getProcessShift = (data, client) => {
//  const query =
//    'SELECT id FROM "shiftforprocess" WHERE date = $1 AND shift_number=$2';
//  const values = [data.date, data.shift];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getShift = (data, client) => {
//  const query = 'SELECT id FROM "shifts" WHERE date = $1 AND shift_number=$2';
//  const values = [data.date, data.shift];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getOrderShiftsById = (data, client) => {
//  const query = `SELECT so.*, pr.orderproduct_id, pr.product_id, p.product_name, op.attributes
//  FROM "shiftfororder" so
//  LEFT JOIN productionrecipes pr ON pr.id = $1 
//  LEFT JOIN product p ON p.product_id = pr.product_id 
//  LEFT JOIN orderproducts op ON op.id = pr.orderproduct_id 
//  LEFT JOIN shifts s ON s.id = so.shift_id 
//    WHERE production_recipe_id = $1
//    ORDER BY so.date ASC`;
//  const values = [data.production_recipe_id];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };
// const getShiftExpenseByDate = ({ date, quantity }, client) => {
//  const query = `
//    SELECT COALESCE(SUM((ce.daily_usd_amount / 40 * $2::numeric / 1000)), 0) AS cost
//    FROM companyexpenses ce 
//    WHERE $1::date BETWEEN ce.start_date AND COALESCE(ce.end_date, CURRENT_DATE)
//  `;

//  const values = [date, quantity];

//  if (client) {
//    return client.query(query, values);
//  }
//  return process.pool.query(query, values);
// };

// const deleteShift = (id, client) => {
//  const query = `DELETE FROM shifts WHERE id = $1`;
//  const values = [id];

//  if (client) return client.query(query, values);
//  return process.pool.query(query, values);
// };

// module.exports = {
//  insertForOrder,
//  insertForProcess,
//  getDayShiftsOrder,
//  getDayShiftsProcess,
//  createShift,
//  getOrderShift,
//  getProcessShift,
//  getShift,
//  getShiftDetail,
//  getOrderShiftsById,
//  getShiftExpenseByDate,
//  getShiftOrdersById,
//  getShiftProcessById,
//  deleteShift,
// };
