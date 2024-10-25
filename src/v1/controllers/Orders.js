const httpStatus = require("http-status/lib");
const {
  insert,
  getAll,
  update,
  del,
  updateStatus,
  _getOrderCounter,
  _insertOrderCounter,
  _updateOrderCounter,
  getOne,
  patchSome,
  getOrderProducts,
  updateProduct,
  insertProduct,
  insertProductStatus,
  delProduct,
  getExpenseCostOrder,
  patchProductStatus,
  getProductStatus,
  updateProductStatus,
  patchOrderProduct,
  updateProductStatusByProduct,
  insertOrderStock,
  getOrderStock,
  delOrderStocks,
  getOrderStockQuantity,
} = require("../services/Orders");
const { getOne: getCustomer, patchCustomer } = require("../services/Customers");

const {
  dateToIsoFormatWithTimezoneOffset,
  missingNumber,
  delInArray,
} = require("../scripts/utils/helper");
const { delAllOfOrder } = require("../services/Recipes");
const { insert: insertPayment } = require("../services/Payments");
const {
  reduceStockById,
  delStockById,
  reduceStockByLogId,
} = require("../services/Stocks");
const { getLog, getLogIdByProduct } = require("../services/StockLogs");

const get = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAll(client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e.message });
  } finally {
    client.release();
  }
};
const create = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { userid, usertype } = req.user;
    const { isproduction, products, ...data } = req.body;
    await client.query("BEGIN");
    const order_number = await _createOrderNumber(req.user, client);

    const userTypeToStatusMap = {
      admin: isproduction ? "11" : "111",
      boss: isproduction ? "22" : "222",
      stock_manager: isproduction ? "33" : "333",
      production_manager: isproduction ? "44" : "444",
      domestic_market_manager: isproduction ? "55" : "555",
      domestic_market_marketing: isproduction ? "66" : "666",
      foreign_market_manager: isproduction ? "77" : "777",
      foreign_market_marketing: isproduction ? "88" : "888",
    };

    const { rows: orderRows } = await insert(client, {
      userid: userid,
      ...data,
      isproduction,
      order_number,
      status: userTypeToStatusMap[usertype.toLowerCase()],
      approver_id:
        usertype === "admin" ||
        usertype === "stock_manager" ||
        usertype === "boss"
          ? userid
          : null,
    });

    const orderProducts = [];
    for (const product of products) {
      const { rows: orderProduct } = await insertProduct(client, {
        ...product,
        order_id: orderRows[0].order_id,
      });

      const statusData = [...product.orderStatus];
      statusData[0]["orderproduct_id"] = orderProduct[0].id;
      const { rows: productStatus } = await insertProductStatus(
        client,
        statusData[0]
      );
      orderProducts.push({
        ...orderProduct[0],
        orderStatus: statusData,
      });
    }

    const { rows: lastOrder } = await getOne(orderRows[0].order_id, client);

    global.socketio.emit("notification", {
      type: "order",
      order: lastOrder[0],
      userid,
    });
    await client.query("COMMIT");

    res.status(httpStatus.CREATED).send(lastOrder[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};
// const put = async (req, res) => {
//   const client = await process.pool.connect();

//   const { products, ...data } = req.body;
//   const order_id = parseInt(req.params.id);

//   try {
//     await client.query("BEGIN");
//     const { rows: orders, rowCount } = await update(client, {
//       order_id,
//       ...data,
//     });

//     if (!rowCount) {
//       throw new Error("Hata");
//     }
//     const { rows: orderProducts, rowCount: orderProductsCount } =
//       await getOrderProducts(client, order_id);

//     for (const product of products) {
//       console.log("ppp", product);
//       const currentOrderProduct = orderProducts?.find(
//         (op) => op.id === product?.id
//       );
//       const deletedOrderProduct = orderProducts?.find(
//         (op) => op.id !== product?.id
//       );
//       if (currentOrderProduct) {
//         // update yapılacak
//         const { rowCount } = await updateProduct(client, {
//           ...product,
//           order_id,
//         });

//         if (!rowCount) {
//           throw new Error("Hata");
//         }

//         const { rows: productStatus, rowCount: productStatusCount } =
//           await getProductStatus(client, {
//             orderproduct_id: product.id,
//             statustype: "Alındı",
//           });
//         if (!productStatusCount) {
//           throw new Error("Hata");
//         }

//         const updateStatusData = {
//           quantity: product.quantity,
//           statustype: "Alındı",
//           orderstatus_id: productStatus[0].id,
//         };
//         const { rowCount: statusCount } = await updateProductStatus(
//           client,
//           updateStatusData
//         );
//         if (!statusCount) {
//           throw new Error("Hata");
//         }
//       } else if (!product?.id) {
//         // insert yapılacak
//         const { rows, rowCount } = await insertProduct(client, {
//           ...product,
//           order_id,
//         });

//         if (!rowCount) {
//           throw new Error("Hata");
//         }

//         const statusData = [...product.orderStatus];
//         statusData[0]["orderproduct_id"] = rows[0].id;

//         const { rowCount: statusCount } = await insertProductStatus(
//           client,
//           statusData
//         );
//         if (!statusCount) {
//           throw new Error("Hata");
//         }
//       } else if (deletedOrderProduct) {
//         //delete yapılacak
//         await delProduct(client, product.id);
//       }
//     }

//     const { rows: oneOrders } = await getOne(orders[0].order_id, client);
//     const order = { ...oneOrders[0] };

//     global.socketio.emit("notification", {
//       type: "order_update",
//       order: order,
//       userid: req.user.userid,
//     });
//     await client.query("COMMIT");
//     console.log("order:", order);
//     res.status(httpStatus.CREATED).send(order);
//   } catch (e) {
//     console.log(e);
//     await client.query("ROLLBACK");
//     res
//       .status(httpStatus.INTERNAL_SERVER_ERROR)
//       .send({ error: "An error occurred." });
//   } finally {
//     client.release();
//   }
// };

const put = async (req, res) => {
  const client = await process.pool.connect();

  const userid = req.user.userid;
  const { products, ...data } = req.body;
  const order_id = parseInt(req.params.id);
  try {
    await client.query("BEGIN");
    console.log("products", products);
    const { rows: orders, rowCount } = await update(client, {
      ...data,
      order_id,
    });

    if (!rowCount) {
      throw new Error("Hata");
    }
    const { rows: orderProducts, rowCount: orderProductsCount } =
      await getOrderProducts(client, order_id);

    const newOrderProducts = [];
    if (orderProductsCount) {
      for (const product of orderProducts) {
        const currentOrderProduct = products?.find(
          (op) => op.id === product?.id
        );
        if (currentOrderProduct) {
          // update yapılacak
          const newProduct = products.find((p) => p.id === product.id);
          const { rows } = await updateProduct(client, {
            ...newProduct,
            order_id,
          });

          const isProductStatus =
            currentOrderProduct.orderStatus?.length === 1 &&
            currentOrderProduct.orderStatus[0].statustype === "Alındı";

          if (!isProductStatus) {
            throw new Error("Hata");
          }

          const productStatus = currentOrderProduct.orderStatus[0];
          console.log(productStatus, "productStatus");
          const statusData = {
            ...productStatus,
            quantity: newProduct.quantity,
          };
          const { rowCount } = await updateProductStatus(client, statusData);

          if (!rowCount) {
            throw new Error("Hata");
          }
          newOrderProducts.push(rows[0]);
        } else if (product?.id) {
          //delete yapılacak
          await delProduct(client, product.id);
        }
      }
    }

    for (const product of products) {
      if (!product?.id) {
        // insert yapılacak
        const { rows } = await insertProduct(client, { ...product, order_id });

        const statusData = product.orderStatus[0];
        statusData["orderproduct_id"] = rows[0].id;

        const { rows: productStatus } = await insertProductStatus(
          client,
          statusData
        );
        newOrderProducts.push({ ...rows[0], orderStatus: [productStatus[0]] });
      }
    }

    const { rows: updatedOrder } = await getOne(order_id, client);

    global.socketio.emit("notification", {
      type: "order_update",
      order: updatedOrder[0],
      userid,
    });
    await client.query("COMMIT");
    res.status(httpStatus.CREATED).send(updatedOrder[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};
const patch = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await update(client, {
      order_id: req.params.id,
      ...req.body,
    });

    const { rows: oneOrders } = await getOne(rows[0].order_id, client);
    const order = { ...oneOrders[0] };

    global.socketio.emit("notification", {
      type: "order_update",
      order,
      userid: req.user.userid,
    });

    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send(rows[0]);
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};
const updateSome = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const data = req.body;
    if (!data) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ error: "Eklenecek data yok" });
    }

    const order_id = req.params.id;
    await client.query("BEGIN");

    await patchSome({ order_id: parseInt(order_id), ...data }, client)
      .then(async ({ rows }) => {
        const { rows: orders } = await getOne(rows[0].order_id, client);

        global.socketio.emit("notification", {
          type: "order_update",
          order: orders[0],
          userid,
        });
        await client.query("COMMIT");

        return res.status(httpStatus.ACCEPTED).send(orders[0]);
      })
      .catch((e) => {
        console.log(e);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
      });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

const patchStatus = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const { rows, rowCount } = await updateStatus(
      {
        userid: req.user.userid,
        order_id: req.params.id,
        ...req.body,
      },
      client
    );

    if (!rowCount) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }
    const { rows: orders, rowCount: orderRowCount } = await getOne(
      rows[0].order_id,
      client
    );

    if (!orderRowCount) {
      throw new Error("Hata");
    }
    const order = {
      ...orders[0],
      approver: req.user.username,
    };

    global.socketio.emit("notification", {
      type: "order_update",
      order,
      userid: req.user.userid,
    });

    await client.query("COMMIT");
    res.status(httpStatus.OK).send(order);
  } catch {
    await client.query("ROLLBACK");
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const approveOrder = async (req, res) => {
  const client = await process.pool.connect();
  const userid = req.user.userid;
  const order_id = req.params.id;
  const { isproduction, status } = req.body;

  try {
    await client.query("BEGIN");

    let stockIds = [];

    const { rows, rowCount } = await updateStatus(
      {
        userid: req.user.userid,
        order_id: req.params.id,
        status,
      },
      client
    );

    if (!rowCount) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    let order = null;
    const { rows: getorders, rowCount: orderRowCount } = await getOne(
      order_id,
      client
    );
    if (!orderRowCount) {
      throw new Error("Hata");
    }

    order = { ...getorders[0] };

    console.log("order", order);
    if (!isproduction) {
      const { products } = req.body;


      for (const product of products) {
        const { id, quantity } = product; 
        console.log("id", product);

        const { rows: approveOrderStock, rowCount: approveRowCount } = await approveOrderStock(
          id,
          client
        );

        if (!approveRowCount) {
          throw new Error("Hata!");
        }

        const { rows: orderStocksQuantity, rowCount: orderStockRowCount } =
          await getOrderStockQuantity(client, id);
        console.log("orderStocks", orderStocksQuantity);

        if (!orderStockRowCount) {
          throw new Error("Stok Seçiniz!");
        }

        const totalSelectedStock = orderStocksQuantity[0].sum;

        if (totalSelectedStock === quantity) {
          const { rows: orderStocks, rowCount: orderStockRowCount } =
            await getOrderStock(client, id);
          if (!orderStockRowCount) {
            throw new Error("Stok Seçiniz!");
          }

          orderStocks.forEach(async (stock) => {
            const { rows: reducedStocks, rowCount } = await reduceStockByLogId(
              { logproduct_id: stock.logproduct_id, quantity },
              client
            );

            if (!rowCount) {
              throw new Error("Eksik Stok!");
            }

            stockIds.push(reducedStocks[0].id);
            if (reducedStocks[0].quantity === 0) {
              await delStockById(reducedStocks[0].id, client);
            }
            const log_id = reducedStocks[0].log_id;

            const customer_id = order.customer_id;
            //burada stok borcu düşecek
            const totalPrice = reducedStocks[0].price * quantity;

            const { rows: customer } = await getCustomer(customer_id, client);
            const productSalesBalance = customer[0].product_sales_balance;

            // payoff
            let calculatedBalance = productSalesBalance + totalPrice;

            const { rows: updatedCustomer, rowCount: updatedCustomerRowCount } =
              await patchCustomer(
                customer_id,
                { product_sales_balance: calculatedBalance },
                client
              );

            if (!updatedCustomerRowCount) {
              throw new Error("Hata!");
            }
          });

          const { rowCount: updateProductStatus } =
            await updateProductStatusByProduct(client, {
              orderproduct_id: id,
              statustype: "Sevk Bekliyor",
            });

          if (!updateProductStatus) {
            throw new Error("Hata");
          }
        }else{
          throw new Error("Hata");

        }
      }

      const {
        customer_id,
        total_with_tax,
        // exchange_rate,
        order_date,
        invoice_date,
        order_number,
      } = order;

      const { rows: customer, rowCount: customerRowCount } = await getCustomer(
        customer_id,
        client
      );
      if (!customerRowCount) {
        throw new Error("Hata!");
      }
      const currentBalance = customer[0]?.balance;

      const orderTotal = parseFloat(total_with_tax);
      const calculatedBalance = parseFloat(currentBalance + orderTotal);

      console.log("orderTotal in approve cash", orderTotal, typeof orderTotal);
      console.log(
        "calculatedBalance in approve cash",
        calculatedBalance,
        typeof calculatedBalance
      );

      await patchCustomer(customer_id, { balance: calculatedBalance }, client);

      const params = {
        date: invoice_date ?? order_date,
        transaction: "Satış",
        customer_id,
        exchange_rate: 1,
        payoff: orderTotal,
        created_by: userid,
        details: order_number ? `Sipariş No: ${order_number}` : "",
        balance: calculatedBalance,
        order_id,
      };

      const { rows: cashflows, rowCount: cashflowRowCount } =
        await insertPayment(params, client);

      if (!cashflowRowCount) {
        throw new Error("Hata!");
      }

      const { rows: rowOrders, rowCount: roworderRowCount } = await getOne(
        order_id,
        client
      );
      if (!roworderRowCount) {
        throw new Error("Hata!");
      }
      order = { ...rowOrders[0] };
      global.socketio.emit("notification", {
        type: "add_cashflow",
        cashflow: cashflows[0],
        userid: req.user.userid,
      });

      global.socketio.emit("notification", {
        type: "order_approve",
        order: order,
        userid: req.user.userid,
      });
    }

    await client.query("COMMIT");
    res.status(httpStatus.OK).send({ order, stockIds });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const remove = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    await delAllOfOrder(req.params.id, client);

    const { rows } = await getOne(req.params.id, client);
    if (rows.length === 0) throw "There is no such record.";

    const today = dateToIsoFormatWithTimezoneOffset(new Date());
    const _today = new Date(today);
    const date = `${_today.getFullYear()}${String(
      _today.getMonth() + 1
    ).padStart(2, "0")}${String(_today.getDate()).padStart(2, "0")}`;

    const orderDate = String(rows[0].order_number.split("-")[0]);
    const orderCounter = parseInt(rows[0].order_number.split("-")[2]);
    const orderSuffix = String(rows[0].order_number.split("-")[3]);
    if (
      today ===
      dateToIsoFormatWithTimezoneOffset(
        new Date(
          `${orderDate.slice(0, 4)}-${orderDate.slice(4, 6)}-${orderDate.slice(
            6
          )}`
        )
      )
    ) {
      const { rows: orderCounterRows } = await _getOrderCounter(
        { suffix: orderSuffix },
        client
      );
      const counter = delInArray(orderCounterRows[0].counter, orderCounter);
      await _updateOrderCounter({ counter, date, suffix: orderSuffix }, client);
    }

    const { rowCount } = await del(req.params.id, client);

    if (!rowCount) {
      throw new Error("Hata");
    }
    await client.query("COMMIT");
    global.socketio.emit("notification", {
      type: "order_del",
      orderid: req.params.id,
      userid: req.user.userid,
    });

    res.status(httpStatus.OK).send({ message: "Order deleted successfully." });
  } catch (e) {
    await client.query("ROLLBACK");
    console.log(e);
    if (e === "There is no such record.")
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ error: "There is no such record." });
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const createOrderNumber = async (req, res) => {
  const client = await process.pool.connect();
  const { usertype } = req.user;

  try {
    await client.query("BEGIN");
    const today = dateToIsoFormatWithTimezoneOffset(new Date());
    const _today = new Date(today);
    const date = `${_today.getFullYear()}${String(
      _today.getMonth() + 1
    ).padStart(2, "0")}${String(_today.getDate()).padStart(2, "0")}`;

    const suffix =
      usertype === "domestic_market_manager" ||
      usertype === "domestic_market_marketing"
        ? "A"
        : usertype === "foreign_market_manager" ||
          usertype === "foreign_market_marketing"
        ? "B"
        : "C";

    let orderCounter = 10;
    const { rows: orderCounterRows } = await _getOrderCounter(
      { suffix },
      client
    );
    if (orderCounterRows.length === 0)
      await _insertOrderCounter({
        suffix,
        date: today,
        counter: [orderCounter],
      });
    else {
      const { counter, date: _date } = orderCounterRows[0];
      const newCounter = [];
      if (dateToIsoFormatWithTimezoneOffset(new Date(_date)) === today) {
        newCounter.push(...counter);
        const miss = missingNumber(newCounter);
        newCounter.length > 0 &&
          (orderCounter = miss ?? newCounter[newCounter.length - 1] + 1);
      }
      newCounter.push(orderCounter);
      await _updateOrderCounter({ suffix, date: today, counter: newCounter });
    }
    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send({
      order_number: `${date}-MONG-${orderCounter
        .toString()
        .padStart(3, "0")}-${suffix}`,
    });
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const _createOrderNumber = async (usertype, client) => {
  const today = dateToIsoFormatWithTimezoneOffset(new Date());
  const _today = new Date(today);
  const date = `${_today.getFullYear()}${String(_today.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(_today.getDate()).padStart(2, "0")}`;

  const suffix =
    usertype === "domestic_market_manager" ||
    usertype === "domestic_market_marketing"
      ? "A"
      : usertype === "foreign_market_manager" ||
        usertype === "foreign_market_marketing"
      ? "B"
      : "C";

  let orderCounter = 10;
  const { rows: orderCounterRows } = await _getOrderCounter({ suffix }, client);
  if (orderCounterRows.length === 0)
    await _insertOrderCounter({
      suffix,
      date: today,
      counter: [orderCounter],
    });
  else {
    const { counter, date: _date } = orderCounterRows[0];
    const newCounter = [];
    if (dateToIsoFormatWithTimezoneOffset(new Date(_date)) === today) {
      newCounter.push(...counter);
      const miss = missingNumber(newCounter);
      newCounter.length > 0 &&
        (orderCounter = miss ?? newCounter[newCounter.length - 1] + 1);
    }
    newCounter.push(orderCounter);
    await _updateOrderCounter({ suffix, date: today, counter: newCounter });
  }
  return `${date}-MONG-${orderCounter.toString().padStart(3, "0")}-${suffix}`;
};
const delOrderNumber = async (req, res) => {
  const client = await process.pool.connect();
  const { order_number } = req.params;

  try {
    await client.query("BEGIN");
    const orderCounter = parseInt(order_number.split("-")[2]);
    const orderSuffix = String(order_number.split("-")[3]);

    const { rows: orderCounterRows } = await _getOrderCounter(
      { suffix: orderSuffix },
      client
    );
    const { counter, date } = orderCounterRows[0];

    const newCounter = delInArray(counter, orderCounter);
    await _updateOrderCounter({
      suffix: orderSuffix,
      date,
      counter: newCounter,
    });

    await client.query("COMMIT");
    client.release();
    res
      .status(httpStatus.OK)
      .send({ message: "Order Number deleted successfully." });
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const getOrderExpenseCost = async (req, res) => {
  const client = await process.pool.connect();
  const order_id = parseInt(req.params.id);
  try {
    await client.query("BEGIN");

    const { rows } = await getExpenseCostOrder(order_id, client);
    console.log(rows);
    await client.query("COMMIT");
    res.status(httpStatus.CREATED).send(rows);
  } catch (e) {
    await client.query("ROLLBACK");

    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};
const getOrderStocks = async (req, res) => {
  const client = await process.pool.connect();
  const orderproduct_id = parseInt(req.params.id);
  console.log("get ordersStocks", orderproduct_id);
  try {
    await client.query("BEGIN");

    const { rows } = await getOrderStock(client, orderproduct_id);
    console.log(rows);
    await client.query("COMMIT");
    res.status(httpStatus.CREATED).send(rows);
  } catch (e) {
    await client.query("ROLLBACK");

    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};
const createOrderStock = async (req, res) => {
  const client = await process.pool.connect();
  const order_id = parseInt(req.params.id);
  const orderStocks = req.body;

  try {
    await client.query("BEGIN");

    for (const stock of orderStocks) {
      const { rows, rowCount } = await insertOrderStock(stock, client);

      if (!rowCount) {
        throw new Error("Hata!");
      }
    }

    await client.query("COMMIT");
    res.status(httpStatus.CREATED).send({ data: "success" });
  } catch (e) {
    await client.query("ROLLBACK");

    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};
const updateOrderStock = async (req, res) => {
  const client = await process.pool.connect();
  const orderproduct_id = parseInt(req.params.id);
  const orderStocks = req.body;
  console.log("updateOrderStocks");
  try {
    await client.query("BEGIN");

    const { rowCount: deleteRowCount } = await delOrderStocks(
      client,
      orderproduct_id
    );

    if (!deleteRowCount) {
      throw new Error("Hata!");
    }

    for (const stock of orderStocks) {
      const { rows, rowCount } = await insertOrderStock(stock, client);

      if (!rowCount) {
        throw new Error("Hata!");
      }
    }

    await client.query("COMMIT");
    res.status(httpStatus.OK).send({ data: "success" });
  } catch (e) {
    await client.query("ROLLBACK");

    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

module.exports = {
  create,
  get,
  put,
  patch,
  patchStatus,
  remove,
  createOrderNumber,
  delOrderNumber,
  updateSome,
  getOrderExpenseCost,
  approveOrder,
  createOrderStock,
  getOrderStocks,
  updateOrderStock,
};
