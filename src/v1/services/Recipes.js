const insert = (data, client) => {
  const query = `INSERT INTO recipes(order_id, details, cost, id, total_bunker, wastage_percentage, unit_bunker_cost, total_bunker_cost, product_id, attributes, recipe_name) 
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
     RETURNING *`;
  const values = [
    data.order_id,
    data.details,
    data.cost,
    data.recipe_id.toString(),
    data.total_bunker,
    data.wastage_percentage,
    data.unit_bunker_cost,
    data.total_bunker_cost,
    data.product_id,
    data.attributes,
    data.recipe_name,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const insertDetails = (data, client) => {
  const query = `INSERT INTO recipedetails(logproduct_id, recipe_id, quantity, price) 
     VALUES($1, $2, $3, $4) 
     RETURNING *,
     (SELECT product_name FROM product p 
      LEFT JOIN logproducts lp ON lp.id= $1
      WHERE p.product_id = lp.product_id),
     (SELECT companyname FROM customer c
      LEFT JOIN logproducts lp ON lp.id= $1
      LEFT JOIN productstocklogs psl ON psl.id=lp.log_id
      WHERE c.customerid=psl.customer_id)`;
  const values = [
    data.logproduct_id,
    data.recipe_id,
    data.quantity,
    data.price,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const insertProductionDetails = (data, client) => {
  const query = `INSERT INTO productionrecipedetails(logproduct_id, recipe_id, quantity, price) 
     VALUES($1, $2, $3, $4) 
     RETURNING *,
     (SELECT product_name FROM product p 
      LEFT JOIN logproducts lp ON lp.id= $1
      WHERE p.product_id = lp.product_id),
     (SELECT companyname FROM customer c
      LEFT JOIN logproducts lp ON lp.id= $1
      LEFT JOIN productstocklogs psl ON psl.id=lp.log_id
      WHERE c.customerid=psl.customer_id)`;
  const values = [
    data.logproduct_id,
    data.recipe_id,
    data.quantity,
    data.price,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const insertProductionRecipe = (client, data) => {
  const query = `INSERT INTO productionrecipes(id, order_id, details, cost, total_bunker, total_ton, wastage_percentage, unit_bunker_cost, total_bunker_cost, date, product_id, attributes, recipe_name, orderstatus_id, orderproduct_id) 
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
     RETURNING *`;
  const values = [
    data.id,
    parseInt(data.order_id),
    data.details,
    parseFloat(data.cost),
    parseInt(data.total_bunker),
    parseFloat(data.total_ton),
    data.wastage,
    data.unit_bunker_cost,
    data.total_bunker_cost,
    data.date,
    data.product_id,
    data.attributes,
    data.recipe_name,
    data.orderstatus_id,
    data.orderproduct_id,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const update = (data, client) => {
  const query = `UPDATE recipes 
     SET details = $1, 
         cost = $2, 
         total_bunker = $3, 
         wastage_percentage = $4, 
         unit_bunker_cost = $5,
         total_bunker_cost = $6 ,
         recipe_name=$8
     WHERE id = $7 
     RETURNING *`;

  const values = [
    data.details,
    data.cost,
    data.total_bunker,
    data.wastage_percentage,
    data.unit_bunker_cost,
    data.total_bunker_cost,
    data.id,
    data.recipe_name,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const updateProductionRecipeWastage = (data, client) => {
  const query = `UPDATE productionrecipes SET wastage_percentage = $2 WHERE id = $1 RETURNING *`;

  const values = [data.production_recipe_id, data.wastage_percentage];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

// const getAll = async () => {
//   const result = await process.pool.query(`
//     SELECT
//       recipes.*,
//       COALESCE(json_agg(recipedetails) FILTER (WHERE recipedetails.recipe_id IS NOT NULL), '[]') AS recipe_details
//     FROM
//       recipes
//     LEFT JOIN
//       recipedetails ON recipedetails.recipe_id = recipes.id
//     GROUP BY
//       recipes.id
//   `);
//   return result;
// };

const getAll = async () => {
  return process.pool.query(`
    SELECT 
      recipes.*,
      COALESCE(
        json_agg(
          json_build_object(
            'price', rd.price,
            'quantity', rd.quantity,
            'logproduct_id', rd.logproduct_id,
            'product_name', p.product_name,
            'companyname', c.companyname,
            'stock', s.quantity
          )
        ) FILTER (WHERE rd.recipe_id IS NOT NULL), 
        '[]'
      ) AS recipe_details
    FROM recipes
    LEFT JOIN recipedetails rd ON rd.recipe_id = recipes.id
    LEFT JOIN logproducts lp ON lp.id = rd.logproduct_id
    LEFT JOIN product p ON p.product_id = lp.product_id
    LEFT JOIN productstocklogs psl ON psl.id = lp.log_id
    LEFT JOIN customer c ON c.customerid = psl.customer_id
    LEFT JOIN productstocks s ON s.log_id = lp.log_id
    GROUP BY recipes.id
  `);
};

const getAllProductionRecipes = async () => {
  return process.pool.query(`
    SELECT 
      productionrecipes.*,
      COALESCE(
        json_agg(
          json_build_object(
            'price', rd.price,
            'quantity', rd.quantity,
            'logproduct_id', rd.logproduct_id,
            'product_name', p.product_name,
            'companyname', c.companyname,
            'stock', s.quantity
          )
        ) FILTER (WHERE rd.recipe_id IS NOT NULL), 
        '[]'
      ) AS recipe_details
    FROM productionrecipes
    LEFT JOIN productionrecipedetails rd ON rd.recipe_id = productionrecipes.id
    LEFT JOIN logproducts lp ON lp.id = rd.logproduct_id
    LEFT JOIN product p ON p.product_id = lp.product_id
    LEFT JOIN productstocklogs psl ON psl.id = lp.log_id
    LEFT JOIN customer c ON c.customerid = psl.customer_id
    LEFT JOIN productstocks s ON s.log_id = lp.log_id
    GROUP BY productionrecipes.id
  `);
};
const getOne = (client, product_id) => {};

const delProductionRecipe = (id, client) => {
  const query = "DELETE FROM productionrecipes WHERE id = $1 RETURNING *";
  const values = [id];


  if (client) return client.query(query, values);
  return process.pool.query(query, values);

};

const delAllOfOrder = (order_id, client) => {
  const query = "DELETE FROM recipes WHERE order_id = $1 ";
  const values = [order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const delAllDetailsByRecipeId = (recipe_id, client) => {
  const query = "DELETE FROM recipedetails WHERE recipe_id = $1 ";
  const values = [recipe_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const insertSpecialRecipe = (data, client) => {
  const query = `INSERT INTO specialrecipes( details, name) 
     VALUES($1, $2) 
     RETURNING *`;

  const values = [data.details, data.name];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getAllSpecialRecipes = (client) => {
  const query="SELECT * FROM specialrecipes";

  if (client) return client.query(query);
  return process.pool.query(query);
};

const delSpecialRecipe = (id) => {
  return process.pool.query("DELETE FROM specialrecipes WHERE id = $1 ", [id]);
};

const getProductionRecipe = async (recipe_id, client) => {
  const query = "SELECT * FROM productionrecipes WHERE id=$1";
  const values = [recipe_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const getProductionRecipesByOrder = async (order_id, client) => {
  const query = "SELECT * FROM productionrecipes WHERE order_id=$1";
  const values = [order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getProductionRecipeDetailsById = (recipe_id, client) => {
  const query = `
    SELECT 
      prd.*, 
      lp.price_usd, 
      lp.price_tl, 
      lp.product_id, 
      lp.log_id
    FROM 
      productionrecipedetails prd
    LEFT JOIN 
      logproducts lp 
    ON 
      prd.logproduct_id = lp.id
    WHERE 
      prd.recipe_id = $1
  `;
  const values = [recipe_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

module.exports = {
  insert,
  insertProductionRecipe,
  getAll,
  getOne,
  update,
  delAllOfOrder,
  insertSpecialRecipe,
  getAllSpecialRecipes,
  delSpecialRecipe,
  getAllProductionRecipes,
  getProductionRecipe,
  updateProductionRecipeWastage,
  getProductionRecipesByOrder,
  insertDetails,
  insertProductionDetails,
  delAllDetailsByRecipeId,
  getProductionRecipeDetailsById,
  delProductionRecipe
};
