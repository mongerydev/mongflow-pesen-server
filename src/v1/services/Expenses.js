const _getExpenses = (client) => {
  const query = `SELECT e.id, e.item_id, e.start_date, e.end_date,
    e.daily_usd_amount, e.amount, e.usd_rate, u.username as created_by, it.is_fixed, it.frequency
    FROM companyexpenses e
    LEFT JOIN  "User" u ON u.userid = e.created_by
    LEFT JOIN companyexpensesitems it ON it.id = e.item_id
    ORDER BY start_date`;

  if (client) return client.query(query);
  return process.pool.query(query);
};

const _getClasses = () => {
  return process.pool.query("SELECT * FROM companyexpensesclass");
};

const _getItems = () => {
  return process.pool.query(
    "SELECT * FROM companyexpensesitems ORDER BY id ASC"
  );
};

const _createItem = (data) => {
  return process.pool.query(
    'INSERT INTO "companyexpensesitems" (class_id, name, frequency, is_fixed) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.class_id, data.name, data.frequency, data.is_fixed]
  );
};

const checkExistingItem = async (name) => {
  const query = "SELECT * FROM companyexpensesitems WHERE name = $1";
  const result = await process.pool.query(query, [name]);
  return result.rows.length > 0;
};
const getExpensesByItem = async (id, client) => {
  const query = "SELECT * FROM companyexpenses WHERE item_id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getExpenseById = async (id, client) => {
  const query = `SELECT e.*, it.is_fixed, it.frequency 
  FROM companyexpenses e
  LEFT JOIN companyexpensesitems it ON it.id = e.item_id
   WHERE e.id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getExpenseItemById = async (id, client) => {
  const query = `SELECT * FROM companyexpensesitems WHERE id = $1`;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _patchExpense = (id, data, client) => {
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");
  const query = `UPDATE companyexpenses SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  if (client) {
    return client.query(query, values);
  } else {
    return process.pool.query(query, values);
  }
};
const _patchExpenseItem = (id, data, client) => {
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE companyexpensesitems SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  if (client) {
    return client.query(query, values);
  } else {
    return process.pool.query(query, values);
  }
};

// BURASI EXTRA CRON JOB İLE HER AY TETİKLENECEK
const _createExpense = (data, client) => {
  const query =
    'INSERT INTO "companyexpenses" (start_date, end_date, item_id, usd_rate, amount, daily_usd_amount, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
  const values = [
    data.start_date,
    data.end_date,
    data.item_id,
    data.usd_rate,
    data.amount,
    data.daily_usd_amount,
    data.created_by,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _updateExpense = (data) => {
  return process.pool.query(
    "UPDATE companyexpenses SET monthly_expenses=$1, daily_expenses=$2, hourly_expenses=$3, monthly_cost=$4, daily_cost=$5, hourly_cost=$6, saved_expenses=$7  WHERE id=$8 RETURNING *",
    [
      data.monthly_expenses,
      data.daily_expenses,
      data.hourly_expenses,
      data.monthly_cost,
      data.daily_cost,
      data.hourly_cost,
      data.saved_expenses,
      data.id,
    ]
  );
};

const _updateExpenseItemFrequency = (data) => {
  return process.pool.query(
    "UPDATE companyexpensesitems SET frequency=$1 WHERE id=$2 RETURNING *",
    [data.frequency, data.id]
  );
};
const _delExpenseItem = (id, client) => {
  const query = "DELETE FROM companyexpensesitems WHERE id=$1 RETURNING *";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};
const _delExpense = (id, client) => {
  const query = "DELETE FROM companyexpenses WHERE id=$1 RETURNING *";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};


const _createClass = (data, client) => {
  const query = 'INSERT INTO "companyexpensesclass" (name) VALUES ($1) RETURNING *';
  values=[data.name]

if (client) return client.query(query, values);
return process.pool.query(query, values);
};
const _editClass = (data, client) => {
  const query = 'UPDATE "companyexpensesclass" SET name=$1 WHERE id=$2 RETURNING *';
  values=[data.name, data.id]

if (client) return client.query(query, values);
return process.pool.query(query, values);
};
const _delClass = (id,client) => {
  const query = `DELETE FROM companyexpensesclass WHERE id=$1 RETURNING *`;
  values=[parseInt(id)]

if (client) return client.query(query, values);
return process.pool.query(query, values);
};

const checkExistingClass = async (name) => {
  const query = "SELECT * FROM companyexpensesclass WHERE name = $1";
  const result = await process.pool.query(query, [name]);
  return result.rows.length > 0;
};

module.exports = {
  _getExpenses,
  _getClasses,
  _getItems,
  _createItem,
  _createExpense,
  _updateExpense,
  checkExistingItem,
  _updateExpenseItemFrequency,
  getExpensesByItem,
  _patchExpense,
  _patchExpenseItem,
  _delExpenseItem,
  _delExpense,
  getExpenseById,
  getExpenseItemById,
  _createClass,
  _delClass,
  _editClass,
  checkExistingClass
};
