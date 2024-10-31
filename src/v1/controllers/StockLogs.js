const httpStatus = require("http-status/lib");
const {
  insertCurrency,
  currency,
  getCurrency,
} = require("../services/Products");
const {
  getRangeLogs,
  insertLog,
  updateLog,
  delLog,
  getLog,
  updateLogApproval,
  getLogProducts,
  deleteAllLogProducts,
  insertLogProduct,
  getLogsNonApproved,
  _getUsageLogs,
  insertUsageLog,
} = require("../services/StockLogs");
const { findOne } = require("../services/Users");
const { getAttributeDetails } = require("../services/LastProductStocks");
const { getInterest } = require("../scripts/utils/helper");
const {
  getCustomerName,
  getOne: getCustomer,
  patchCustomer,
} = require("../services/Customers");
const {
  insert: insertPayment,
  delPaymentByLogId,
} = require("../services/Payments");
const {
  insertStock,
  getStockByLogId,
  delStock,
  reduceStockById,
  delStockById,
} = require("../services/Stocks");

const createLog = async (req, res) => {
  const client = await process.pool.connect();
  const { products, ...data } = req.body;
  console.log("reqbody", req.body);

  try {
    await client.query("BEGIN");
    // Insert log
    const { rows: stockLogs } = await insertLog(data, client);
    console.log("log", stockLogs[0]);
    // Insert log products
    const logProductsPromises = products.map(async (product, index) => {
      await client.query("BEGIN");

      const { rows: logProduct } = await insertLogProduct(
        {
          ...product,
          log_id: stockLogs[0]?.id,
        },
        client
      );
      return logProduct[0];
    });

    const logProducts = await Promise.all(logProductsPromises);

    await client.query("COMMIT");

    // Send response
    res.status(httpStatus.CREATED).send({
      logs: {
        ...stockLogs[0],
        companyname: (await getCustomerName(data.customer_id, client)).rows[0]
          .companyname,
        username: (await findOne(req.user.userid)).rows[0].username,
        products: logProducts,
      },
      stocks: null,
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

const putLog = async (req, res) => {
  client = await process.pool.connect(); // Acquire a database connection

  try {
    console.log(req.body);
    await client.query("BEGIN");
    if (!req.body) {
      console.log("no body length for putLog");
      // const result = await process.pool.query("SELECT * FROM rawmateriallogs");
      return res
        .status(httpStatus.NOT_MODIFIED)
        .send({ error: "Hata! Alım Güncellenemedi." });
    }

    const userid = req.user.userid;
    const id = req.params.id;
    const { products, ...data } = req.body;

    // const { rows } = await updateEachLog(parseInt(id), req.body);
    const { rows: stockLogs } = await updateLog(
      { ...data, id, userid },
      client
    );

    const { rows: deletedProducts, rowCount: delLogProductRowCount } =
      await deleteAllLogProducts({ log_id: id }, client);

    if (!delLogProductRowCount) {
      throw new Error("Hata");
    }

    // Insert log products
    const logProductsPromises = products.map(async (product, index) => {
      await client.query("BEGIN");

      const { rows: logProduct } = await insertLogProduct(
        {
          ...product,
          log_id: id,
        },
        client
      );

      const attributeDetails = await getAttributeDetails(
        logProduct[0].attributes,
        client
      );

      return { ...logProduct[0], attributeDetails };
    });

    const logProducts = await Promise.all(logProductsPromises);

    await client.query("COMMIT");

    res.status(httpStatus.CREATED).send({
      log: {
        ...stockLogs[0],
        companyname: (await getCustomerName(data.customer_id, client)).rows[0]
          .companyname,
        username: (await findOne(req.user.userid, client)).rows[0].username,
        products: logProducts,
      },
    });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: err.message });
  } finally {
    client.release();
  }
};

const getLogsByDate = async (req, res) => {
  const client = await process.pool.connect();
  const product_type = parseInt(req?.params?.product_type);

  console.log("getlogs bydate", req.query, product_type);
  try {
    const { rows } = await getRangeLogs({ ...req.query, product_type }, client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const approveLog = async (req, res) => {
  const client = await process.pool.connect();
  const id = req.params.id;
  console.log("id approve", id);

  try {
    await client.query("BEGIN");

    const { rows: log } = await getLog(id, client);
    console.log("log rows", log);
    if (!log || !log.length) {
      // Handle if no log is found
      console.log("Log not found");
      return res.status(httpStatus.NOT_FOUND).send({ error: "Log not found" });
    }

    const logData = log[0];

    if (logData.isapproved === true) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "Bu alım zaten onaylanmış." });
    }

    const { rows: products } = await getLogProducts(
      { log_id: logData.id },
      client
    );

    if (!products || !Array.isArray(products) || products?.length === 0) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "Ürün Bilgileri Girilmelidir." });
    }

    let stocks = [];
    for (const product of products) {
      console.log("product::", product);
      const maturity_date = logData.maturity_date;
      const interest_rate = logData.interest_rate;
      const payment_type = logData.payment_type;

      let price_with_vat = product.price_with_vat;
      if (payment_type === "Çek") {
        const interest_cost = getInterest(
          maturity_date,
          interest_rate,
          product.price
        );

        price_with_vat =
          interest_cost +
          interest_cost * logData.vat_rate * (1 - logData.vat_witholding_rate);
      }

      const stockData = {
        ...product,
        log_id: logData.id,
        logproduct_id: product.id,
      };
      const { rows: stock, rowCount: stockRowCount } = await insertStock(
        stockData,
        client
      );

      if (!stockRowCount) {
        throw new Error("Hata!");
      }
    }

    // add to cashflow
    const { rows: customer } = await getCustomer(logData.customer_id, client);
    const currentBalance = customer[0].balance;
    const productPurchasesBalance = customer[0].product_purchases_balance ?? 0;
    // debt
    const orderTotal = parseFloat(logData.total_price_with_vat);
    let calculatedBalance = currentBalance - orderTotal;
    let product_purchases_balance = productPurchasesBalance + orderTotal;

    console.log(
      "371",
      currentBalance,
      productPurchasesBalance,
      orderTotal,
      calculatedBalance,
      product_purchases_balance
    );
    const { rows: updatedCustomer, rowCount: updatedCustomerRowCount } =
      await patchCustomer(
        logData.customer_id,
        {
          balance: calculatedBalance,
          product_purchases_balance: product_purchases_balance,
        },
        client
      );
    console.log("updatedCustomer", updatedCustomer[0]);
    if (!updatedCustomerRowCount) {
      throw new Error("Hata");
    }

    const params = {
      date: logData.payment_date,
      transaction: "Alış",
      payment_type: null,
      customer_id: logData.customer_id,
      exchange_rate: logData.exchange_rate,
      payoff: null,
      debt: orderTotal,
      account_id: null,
      order_id: null,
      log_id: logData.id,
      created_by: req.user.userid,
      details: logData.waybill ? `Fatura No: ${logData.waybill}` : "",
      balance: calculatedBalance,
      waybill_number: null,
    };

    const { rows: cashflows, rowCount: cashflowRowCount } = await insertPayment(
      params,
      client
    );

    if (!cashflowRowCount) {
      throw new Error("Hata!");
    }

    const { rows: customers } = await getCustomer(logData.customer_id, client);

    global.socketio.emit("notification", {
      type: "update_customer",
      customer: customers[0],
      userid: req.user.userid,
    });
    global.socketio.emit("notification", {
      type: "add_cashflow",
      cashflow: cashflows[0],
      userid: req.user.userid,
    });

    const { rows: stockLogs } = await updateLogApproval(logData.id, client);

    const { rows: user } = await findOne(req.user.userid);
    const username = user[0].username;
    const customerResult = await getCustomerName(logData.customer_id, client);
    const companyname = customerResult.rows[0].companyname;

    await client.query("COMMIT");

    const logdata = {
      ...stockLogs[0],
      companyname,
      username,
    };
    global.socketio.emit("notification", {
      type: "edit_recipematerial_log",
      log: logdata,
      userid: req.user.userid,
    });
    global.socketio.emit("notification", {
      type: "add_recipematerial_stocks",
      stocks: stocks,
      userid: req.user.userid,
    });
    res.status(httpStatus.CREATED).send({
      log: logdata,
      stocks: stocks,
      customer: customers[0],
    });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const removeLog = async (req, res) => {
  const logid = parseInt(req.params.id);
  const userid = req.user.userid;
  const client = await process.pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: log } = await getLog(logid, client);
    console.log("log rows", log);
    if (!log || !log.length) {
      // Handle if no log is found
      console.log("Log not found");
      return res.status(httpStatus.NOT_FOUND).send({ error: "Log not found" });
    }

    const logData = log[0];

    if (logData?.isapproved) {
      const { rows: logProducts, rowCount } = await getLogProducts(
        { log_id: logid },
        client
      );
      if (rowCount) {
        for (const product of logProducts) {
          console.log("product", product);
          const { rows, rowCount } = await getStockByLogId(product.id, client);
          console.log("quantity", rowCount, rows[0]);
          if (rowCount === 0) {
            throw new Error("Hata!");
          } else {
            const currentStock = rows[0]?.quantity;

            if (currentStock === product.quantity) {
              const { rowCount } = await delStock(product.id, client);
              if (!rowCount) {
                console.log("430");
                throw new Error("Hata!");
              }
            } else {
              throw new Error("Hata! Kullanılan Alım Silinemez.");
            }
          }
        }

        //Undo customer balance
        const { rows: customer } = await getCustomer(
          logData.customer_id,
          client
        );
        const currentBalance = customer[0].balance;
        const productPurchasesBalance = customer[0].product_purchases_balance;
        // debt
        const orderTotal = parseFloat(logData.total_price_with_vat);
        let calculatedBalance = currentBalance + orderTotal;
        let product_purchases_balance = productPurchasesBalance - orderTotal;

        const { rows: updatedCustomer, rowCount: updatedCustomerRowCount } =
          await patchCustomer(
            logData.customer_id,
            {
              balance: calculatedBalance,
              product_purchases_balance: product_purchases_balance,
            },
            client
          );
        console.log("updatedCustomer", updatedCustomer[0]);
        if (!updatedCustomerRowCount) {
          console.log("489");

          throw new Error("Hata");
        }
      }
      const { rows: cashflows, rowCount: cashflowRowCount } =
        await delPaymentByLogId(logid, client);
      console.log(cashflowRowCount, cashflows, "cashflows");
      global.socketio.emit("notification", {
        type: "del_cashflow",
        cashflow: cashflows[0].id,
        userid,
      });
    }

    const delLogResult = await delLog(parseInt(req.params.id), client);
    const delLogProductsResult = await deleteAllLogProducts(
      { log_id: parseInt(req.params.id) },
      client
    );
    if (delLogResult.rowCount === 0 || delLogProductsResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(httpStatus.NOT_MODIFIED)
        .send({ error: "No rows were deleted" });
    }

    global.socketio.emit("notification", {
      type: "del_recipematerial_log",
      logid: logid,
      userid,
    });
    await client.query("COMMIT");
    return res
      .status(httpStatus.NO_CONTENT)
      .send({ status: httpStatus.OK, message: "Silme işlemi Başarılı!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: err.message });
  } finally {
    client.release(); // Release the client back to the pool
  }
};

const getNonApprovedLogs = async (req, res) => {
  console.log("getNonApprovedLogs block rendered");
  const client = await process.pool.connect();
  try {
    const { rows } = await getLogsNonApproved(client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};


const getUsageLogs = async (req, res) => {
  const client = await process.pool.connect();
  const product_type = parseInt(req?.params?.product_type);

  try {
    const { rows } = await _getUsageLogs(product_type , client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};
const createStockUsageLog = async (req, res) => {
  const client = await process.pool.connect();
  const params = req.body;
  const { id, quantity } = params;
  try {
    const { rows: usageLogs, rowCount: usageRowCount } = await insertUsageLog(
      params,
      client
    );
    if (!usageRowCount) {
      throw new Error("Hata!");
    }

    const { rows: reducedStock, rowCount: reducedRowCount } =
      await reduceStockById({ id, quantity }, client);
    if (!reducedRowCount) {
      throw new Error("negativeStockReduce!");
    }

    if (reducedStock[0].quantity === 0) {
      const { rowCount, rows } = await delStockById(id, client);
      if (!rowCount) {
        throw new Error("Hata!");
      }
    }

    res.status(httpStatus.OK).send({ ...usageLogs[0] });
  } catch (e) {
    await client.query("ROLLBACK");
    if (err.constraint === "negativeStockReduce") {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send("Hata! Yetersiz Stok Kullanımı.");
    }

    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send("An error occurred." );
  } finally {
    client.release();
  }
};

module.exports = {
  getLogsByDate,
  putLog,
  createLog,
  approveLog,
  removeLog,
  getNonApprovedLogs,
  getUsageLogs,
  createStockUsageLog,
};
