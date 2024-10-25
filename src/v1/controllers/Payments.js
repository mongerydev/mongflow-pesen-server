const httpStatus = require("http-status/lib");
const {
  getOne,
  patchCustomer,
  getOneDetail,
} = require("../services/Customers");
const { insert, getLast30Days, getRange } = require("../services/Payments");
const { findOne } = require("../services/Users");

const create = async (req, res) => {
  const client = await process.pool.connect();
  const data = req.body;
  const userid = req.user.userid;
  console.log("reqbody", req.body);

  try {
    await client.query("BEGIN");

    const { rows: customer } = await getOne(data.customer_id, client);
    const currentBalance = customer[0].balance;
    const productSalesBalance = customer[0].product_sales_balance;
    const productPurchasesBalance = customer[0].product_purchases_balance;

    let calculatedBalance;
    let product_sales_balance = productSalesBalance;
    let product_purchases_balance = productPurchasesBalance;
    if (data.payoff) {
      calculatedBalance = currentBalance + parseFloat(data.payoff);
      product_purchases_balance =
        productPurchasesBalance + parseFloat(data.payoff);
    } else if (data.debt) {
      calculatedBalance = currentBalance - parseFloat(data.debt);
      product_sales_balance = productSalesBalance + parseFloat(data.debt);
    } else {
      throw new Error("Hata!");
    }
    const { rows: updatedCustomer, rowCount: updatedCustomerRowCount } =
      await patchCustomer(
        data.customer_id,
        {
          balance: calculatedBalance,
          product_purchases_balance: product_purchases_balance,
          product_sales_balance: product_sales_balance,
        },
        client
      );
    console.log("updatedCustomer", updatedCustomer[0]);
    if (!updatedCustomerRowCount) {
      throw new Error("Hata");
    }

    const params = {
      date: null,
      transaction: null,
      payment_type: null,
      customer_id: null,
      exchange_rate: null,
      payoff: null,
      debt: null,
      amount: null,
      account_id: null,
      order_id: null,
      log_id: null,
      created_by: null,
      details: null,
      waybill_number: null,
      ...data,
      balance: calculatedBalance,
    };

    const { rows: cashflows } = await insert(params, client);
    const { rows: customers } = await getOneDetail(data.customer_id, client);
    const { rows: users } = await findOne(userid, client);

    const username = users[0].username;
    global.socketio.emit("notification", {
      type: "add_cashflow",
      cashflow: { ...cashflows[0], created_by: username },
      userid,
    });
    global.socketio.emit("notification", {
      type: "update_customer",
      customer: customers[0],
      userid,
    });
    await client.query("COMMIT");

    // Send response
    res
      .status(httpStatus.CREATED)
      .send({
        payment: { ...cashflows[0], created_by: username },
        customer: customers[0],
      });
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const getLastMonth = async (req, res) => {
  const client = await process.pool.connect();
  getLast30Days(client)
    .then(async ({ rows }) => {
      await client.release();
      return res.status(httpStatus.OK).send(rows);
    })
    .catch(async (e) => {
      console.log(e);
      await client.release();
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const getDateRange = async (req, res) => {
  const client = await process.pool.connect();
  getRange(client, { ...req.query })
    .then(async ({ rows }) => {
      console.log("getDateRange", rows);
      await client.release();
      return res.status(httpStatus.OK).send(rows);
    })
    .catch(async (e) => {
      console.log(e);
      await client.release();
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

module.exports = {
  create,
  getLastMonth,
  getDateRange,
};
