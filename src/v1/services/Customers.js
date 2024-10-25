const insert = (data) => {
  return process.pool.query(
    'INSERT INTO "customer" (userid, companyname, email, phone, address, website, products, contacts, taxid, taxoffice, customer_type, customer_code, account_code, currency, tc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
    [
      data.userid,
      data.companyname,
      data.email,
      data.phone,
      data.address,
      data.website,
      data.products,
      data.contacts,
      data.taxid,
      data.taxoffice,
      data.customer_type,
      data.customer_code,
      data.account_code,
      data.currency,
      data.tc,
    ]
  );
};

const insertContact = (data) => {
  return process.pool.query(
    `INSERT INTO "dailycontacts" (userid, customerid, companyname, person, contacttype, date, time, result)
       VALUES( $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
    [
      data.userid,
      data.customerid,
      data.companyname,
      data.person,
      data.contacttype,
      data.date,
      data.time,
      data.result,
    ]
  );
};

const getAll = (client) => {
  return process.pool.query(
    `SELECT customer.*, 
    (
       SELECT jsonb_agg(to_jsonb(cf))
       FROM (
         SELECT date, payoff, debt, transaction, details
         FROM cashflows
         WHERE customer_id = customer.customerid
       ) cf
      ) AS cashflows,
      (
        SELECT sum(debt)
        FROM cashflows WHERE customer_id = customer.customerid
       ) AS ciro,
       (
        SELECT count(*)
        FROM orders WHERE customer_id = customer.customerid
       ) AS total_orders,
       (
        SELECT count(*)
        FROM productstocklogs WHERE customer_id = customer.customerid
       ) AS total_logs
     FROM "customer"
     ORDER BY customer.companyname ASC`
  );
};

const getDateRangeContacts = (data) => {
  console.log("data", data);
  return process.pool.query(
    'SELECT * FROM "dailycontacts" WHERE date BETWEEN $1 AND $2 ORDER BY date DESC',
    [data.startDate, data.endDate]
  );
};

const getOne = (customerid, client) => {
  const query = `SELECT customer.*,
  (
     SELECT jsonb_agg(to_jsonb(cf))
     FROM (
       SELECT date, payoff, debt, transaction, details
       FROM cashflows
       WHERE customer_id = customer.customerid
     ) cf
    ) AS cashflows,
    (
      SELECT sum(debt)
      FROM cashflows WHERE customer_id = customer.customerid
     ) AS ciro,
     (
      SELECT count(*)
      FROM orders WHERE customer_id = customer.customerid
     ) AS total_orders,
     (
      SELECT count(*)
      FROM productstocklogs WHERE customer_id = customer.customerid
     ) AS total_logs
   FROM "customer"
   WHERE customerid = $1
   ORDER BY customer.companyname ASC`;
  const values = [customerid];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getOneDetail = (customerid, client) => {
  const query = `SELECT customer.*,
  (
     SELECT jsonb_agg(to_jsonb(cf))
     FROM (
       SELECT date, payoff, debt, transaction, details
       FROM cashflows
       WHERE customer_id = customer.customerid
     ) cf
    ) AS cashflows,
    (
      SELECT sum(debt)
      FROM cashflows WHERE customer_id = customer.customerid
     ) AS ciro,
     (
      SELECT count(*)
      FROM orders WHERE customer_id = customer.customerid
     ) AS total_orders,
     (
      SELECT count(*)
      FROM productstocklogs WHERE customer_id = customer.customerid
     ) AS total_logs
   FROM "customer" 
   ORDER BY customer.companyname ASC`;
  const values = [customerid];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getCustomerName = (customerid, client) => {
  const query = `SELECT companyname FROM "customer" WHERE customerid = $1`;
  const values = [customerid];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const update = (data) => {
  return process.pool.query(
    'UPDATE "customer" SET companyname = $1, email = $2, phone = $3, address = $4, website = $5, products = $6, contacts = $7, taxid = $8, taxoffice = $9, customer_type = $10, customer_code = $12, account_code = $13, currency = $14, tc = $15 WHERE customerid = $11 RETURNING *',
    [
      data.companyname,
      data.email,
      data.phone,
      data.address,
      data.website,
      data.products,
      data.contacts,
      data.taxid,
      data.taxoffice,
      data.customer_type,
      data.customerid,
      data.customer_code,
      data.account_code,
      data.currency,
      data.tc,
    ]
  );
};

const updateContact = (data) => {
  console.log("data of cus", data);
  return process.pool.query(
    `UPDATE "dailycontacts" 
       SET customerid=$2, person = $3, contacttype = $4, date = $5, time = $6, result = $7, companyname=$8 WHERE id = $1 RETURNING *`,
    [
      data.id,
      data.customerid,
      data.person,
      data.contacttype,
      data.date,
      data.time,
      data.result,
      data.companyname,
    ]
  );
};

const del = (id) => {
  return process.pool.query('DELETE FROM "customer" WHERE customerid = $1', [
    id,
  ]);
};

const delContact = (id) => {
  return process.pool.query('DELETE FROM "dailycontacts" WHERE id = $1', [id]);
};

const patchCustomer = (id, data, client) => {
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE "customer" SET ${setValues} WHERE customerid = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  if (client) {
    return client.query(query, values);
  } else {
    return process.pool.query(query, values);
  }
};

module.exports = {
  insert,
  getAll,
  getOne,
  update,
  del,
  insertContact,
  getDateRangeContacts,
  updateContact,
  delContact,
  getCustomerName,
  getOneDetail,
  patchCustomer,
};
