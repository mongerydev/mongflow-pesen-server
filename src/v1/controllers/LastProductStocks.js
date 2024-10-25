const httpStatus = require("http-status/lib");
const {
  insertLog,
  getStock,
  getRangeLogs,
  update,
  delStock,
  delWarehouse,
  updateStock,
  insertStock,
  insertWarehouseStock,
  updateWarehouseStock,
  getWarehouseStock,
  getAllWarehouse,
  getAllAttributeDetails,
  getProductStocks,
  getAttributeDetails,
  undoStockUpdate,
  undoWarehouseStockUpdate,
  getLog,
  delLog,
  getAllStockCodes,
} = require("../services/LastProductStocks");
const {
  getName,
  currency,
  insertCurrency,
  getCurrency,
} = require("../services/Products");
const { getOne, getCustomerName } = require("../services/Customers");
const { findOne } = require("../services/Users");

const create = async (req, res) => {
  const client = await process.pool.connect();
  const data = req.body;

  try {
    await client.query("BEGIN");
    const { rows: currencyRows, rowCount: currencyRowCount } = await currency(
      client,
      data.currency
    );
    let currency_id;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        data.currency
      );
      currency_id = insertCurrencyRows[0].currency_id;
    } else currency_id = currencyRows[0].currency_id;

    data["currency_id"] = currency_id;

    await insertLog(data, client)
      .then(async ({ rows: stockLogs }) => {
        const attributedetails = await getAttributeDetails(
          data.attributes,
          client
        );

        const { rows: stock } = await getStock(data, client);

        let stockResult;
        if (stock[0]) {
          // burada update stock
          const { rows: stocks } = await updateStock(data, client);
          stockResult = { ...stocks[0], attributedetails: attributedetails };
        } else {
          // burada insert stock
          const { rows: stocks } = await insertStock(data, client);
          stockResult = stocks;
          stockResult = { ...stocks[0], attributedetails: attributedetails };
        }

        // const { rows: warehouseRows } = await getWarehouseStock(data, client);

        // let warehouseResult;
        // if (warehouseRows[0]) {
        //   warehouseResult = await updateWarehouseStock(
        //     {
        //       id: warehouseRows[0].id,
        //       price: data.price,
        //       quantity: data.quantity,
        //     },
        //     client
        //   );
        // } else {
        //   warehouseResult = await insertWarehouseStock(data, client);
        // }
        const { rows: productRows } = await getName(data.product_id, client);
        // global.socketio.emit("notification", {
        //   type: "stock",
        //   stock: {
        //     ...stockLogs[0],
        //     product_name: productRows[0].product_name,
        //     constituent_username: req.user.username,
        //     last_edited_by_username: req.user.username,
        //   },
        //   userid: req.user.userid,
        // });

        const { rows: user } = await findOne(req.user.userid);
        const username = user[0].username;
        const customerResult = await getCustomerName(data.customer_id, client);
        const companyname = customerResult.rows[0].companyname;
        const product_name = productRows[0].product_name;

        const { rows: currency } = await getCurrency(
          stockLogs[0].currency_id,
          client
        );
        const currency_code = currency[0].currency_code;

        res.status(httpStatus.CREATED).send({
          logs: {
            ...stockLogs[0],
            companyname,
            attributedetails,
            product_name,
            username,
            currency_code,
          },
          stocks: { ...stockResult, product_name },
          // warehouseStocks: {
          //   ...warehouseResult?.rows[0],
          //   attributedetails,
          //   product_name,
          // },
        });
      })
      .catch(async (e) => {
        await client.query("ROLLBACK");
        if (e.constraint === "unique_stock_date")
          return res.status(httpStatus.BAD_REQUEST).send({
            error:
              "A registration has already been created for the selected product today.",
          });

        console.log(e);
        res
          .status(httpStatus.INTERNAL_SERVER_ERROR)
          .send({ error: "An error occurred." });
      });

    await client.query("COMMIT");
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    -res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const getAllWarehouseStock = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAllWarehouse(client);
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
const getStockCodes = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAllStockCodes(client);
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

const getAllProductStocks = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getProductStocks(client);
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

const getLogsByDate = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getRangeLogs({ ...req.query }, client);
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

const put = (req, res) => {
  update({ stock_id: req.params.id, userid: req.user.userid, ...req.body })
    .then(({ rows, rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.FORBIDDEN)
          .send({ message: "There is no such record." });
      res.status(httpStatus.CREATED).send(rows[0]);
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const remove = async (req, res) => {
  const client = await process.pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: log } = await getLog(req.params.id, client);

    if (!log || !log.length) {
      // Handle if no log is found
      return res.status(httpStatus.NOT_FOUND).send({ error: "Log not found" });
    }

    const logData = log[0];

    const delLogResult = await delLog(req.params.id, client);
    if (delLogResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(httpStatus.NOT_MODIFIED)
        .send({ error: "No rows were deleted" });
    }

    const stockUpdateResult = await undoStockUpdate(logData, client);
    if (stockUpdateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res
        .status(httpStatus.NOT_MODIFIED)
        .send({ error: "Stock update was not successful" });
    } else {
      if (stockUpdateResult.rows[0].quantity === 0) {
        const { rowCount } = await delStock(
          stockUpdateResult.rows[0].id,
          client
        );
        if (!rowCount) {
          await client.query("ROLLBACK");
          return res
            .status(httpStatus.NOT_MODIFIED)
            .send({ error: "Stock delete was not successful" });
        }
      }
    }

    // const warehouseStockUpdateResult = await undoWarehouseStockUpdate(
    //   logData,
    //   client
    // );
    // if (warehouseStockUpdateResult.rowCount === 0) {
    //   await client.query("ROLLBACK");
    //   return res
    //     .status(httpStatus.NOT_MODIFIED)
    //     .send({ error: "Warehouse stock update was not successful" });
    // } else {
    //   if (warehouseStockUpdateResult.rows[0].quantity === 0) {
    //     const { rowCount } = await delWarehouse(
    //       warehouseStockUpdateResult.rows[0].id,
    //       client
    //     );
    //     if (!rowCount) {
    //       await client.query("ROLLBACK");
    //       return res
    //         .status(httpStatus.NOT_MODIFIED)
    //         .send({ error: "Warehouse Stock delete was not successful" });
    //     }
    //   }
    // }

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
module.exports = {
  create,
  getLogsByDate,
  getAllWarehouseStock,
  put,
  remove,
  getAllProductStocks,
  getStockCodes,
};
