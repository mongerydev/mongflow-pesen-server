const insert = (data, client) => {
  const query = `
          INSERT INTO cashflows (
              date, "transaction", payment_type, 
              customer_id, exchange_rate, 
              payoff, debt, balance, 
              account_id, order_id, log_id,
              created_by, details, waybill_number
          ) 
          VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10, 
              $11, $12, $13, $14
          ) 
          RETURNING *`;

  const values = [
    data.date,
    data.transaction,
    data.payment_type,
    data.customer_id,
    data.exchange_rate,
    data.payoff,
    data.debt,
    data.balance,
    data.account_id,
    data.order_id,
    data.log_id,
    data.created_by,
    data.details,
    data.waybill_number
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getLast30Days = (client) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const formattedDate = thirtyDaysAgo.toISOString().split("T")[0]; // Format date as YYYY-MM-DD

  const query = `
        SELECT cashflows.*, "User".username as created_by
        FROM cashflows 
        INNER JOIN "User" ON cashflows.created_by = "User".userid 
        WHERE cashflows.date >= '${formattedDate}' 
        ORDER BY cashflows.date ASC
    `;

  if (client) return client.query(query);
  return process.pool.query(query);
};
const getRange = (client, data) => {
     console.log("data", data)
  

  const query = `
        SELECT cc.*, uu.username as created_by
        FROM cashflows cc
        LEFT JOIN "User" uu ON cc.created_by = uu.userid 
        WHERE cc.customer_id=$1 AND cc.date BETWEEN $2 AND $3;
    `;
  const values = [ parseInt(data.customer, 10), data.startDate, data.endDate];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};


const delPaymentByLogId = (id, client) => {
  console.log( "id",id)
 const query = `DELETE FROM cashflows WHERE log_id = $1 RETURNING *`;
 const values = [id];

 if (client) return client.query(query, values);
 return process.pool.query(query, values);
};


module.exports = {
  insert,
  getLast30Days,
  getRange,
  delPaymentByLogId
};
