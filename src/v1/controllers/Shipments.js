const httpStatus = require("http-status/lib");
const {
  insertForShipmentProducts,
  insertForShipmentGeneralDetails,
  _getOneShipment,
  _getShipments,
} = require("../services/Shipments");
const {
  getProductStatus,
  patchProductStatus,
  insertProductStatus,
  getOrderProducts,
  getProductStatusQuantity,
  patchSome,
  getAll,
  getOne,
  getOrderProduct,
  delProductStatus,
  shipOrderStock,
} = require("../services/Orders");
const { getOne: getCustomer, patchCustomer } = require("../services/Customers");
const { insert: insertPayment } = require("../services/Payments");

const createShipment = async (req, res) => {
  console.log("started");
  const client = await process.pool.connect();
  const userid = req.user.userid;

  try {
    await client.query("BEGIN");

    const { shipmentProducts, shipmentGeneralDetails } = req.body;

    const { rows: shipmentRows } = await insertForShipmentGeneralDetails(
      shipmentGeneralDetails,
      client
    );
    const shipmentId = shipmentRows[0].id;
    if (shipmentProducts && shipmentProducts.length) {
      for (const product of shipmentProducts) {
        console.log("product 36", product);
        const { production_quantity, shipped_quantity, orderproduct_id } =
          product;

          const { rows: approveOrderStock, rowCount: shipStockRowCount } = await shipOrderStock(
            orderproduct_id,
            client
          );
  
          if (!shipStockRowCount) {
            throw new Error("Hata!");
          }
  

        // get status sevk edildi and insert/update Sevk edildi

        // reduce shipped_quantity from Sevk Bekliyor status
        // then if Sevk Bekliyor status quantity ===0 then delete it
        const reduceStatusData = {
          orderproduct_id: orderproduct_id,
          statustype: "Sevk Bekliyor",
          quantity: parseFloat(shipped_quantity),
        };
        const {
          rows: reduceProductStatus,
          rowCount: reduceProductStatusRowCount,
        } = await getProductStatus(client, reduceStatusData);
        if (!reduceProductStatusRowCount) {
          throw new Error("Sevk Hatası!");
        }
        const reduceQuantity =
          reduceProductStatus[0].quantity - reduceStatusData.quantity;

        if (reduceQuantity === 0) {
          await delProductStatus(client, reduceProductStatus[0].id);
        } else {
          // reduce shipped_quantity from Sevk Bekliyor status
          await patchProductStatus(
            reduceProductStatus[0].id,
            { quantity: reduceQuantity },
            client
          );
        }
        const statusData = {
          orderproduct_id: orderproduct_id,
          statustype: "Sevk Edildi",
          quantity: parseFloat(shipped_quantity),
        };
        const { rows: productStatus, rowCount: productStatusRowCount } =
          await getProductStatus(client, statusData);
        let orderstatus_id;
        if (productStatusRowCount) {
          // update the status with inc
          const statusId = productStatus[0].id;
          const quantity = productStatus[0].quantity + shipped_quantity;
          const { rows } = await patchProductStatus(
            statusId,
            { quantity },
            client
          );
          orderstatus_id = rows[0].id;
        } else {
          // insert sttatus sevk edildi
          const { rows } = await insertProductStatus(client, statusData);
          orderstatus_id = rows[0].id;
        }
        await insertForShipmentProducts(
          { ...product, orderstatus_id, shipment_id: shipmentId },
          client
        );

        const { rows: orderRows, rowCount: orderRowCount } = await getOne(
          parseInt(product.order_id),
          client
        );

        if (!orderRowCount) {
          throw new Error("Error!");
        }

        const { rows: orderProductRows, rowCount: orderProductRowCount } =
          await getOrderProduct(parseInt(product.orderproduct_id), client);

        if (!orderProductRows?.length) {
          throw new Error("Error!");
        }

        const order = orderRows[0];
        const orderProduct = orderProductRows[0];

        const amount = orderProduct.unit_price * product.shipped_quantity;
        const amount_with_vat =
          amount + amount * orderProduct.vat_rate * orderProduct.vat_witholding_rate;

        const { rows: customer } = await getCustomer(order.customer_id, client);
        const currentBalance = customer[0].product_sales_balance ?? 0;
        // payoff
        let calculatedBalance = currentBalance - amount_with_vat;

        const { rows: updatedCustomer, rowCount: updatedCustomerRowCount } =
          await patchCustomer(
            order.customer_id,
            { product_sales_balance: calculatedBalance },
            client
          );
        console.log("updatedCustomer", updatedCustomer[0]);
        if (!updatedCustomerRowCount) {
          throw new Error("Hata");
        }
        // add waybill_id tp the table
        const params = {
          date: product.waybill_date,
          transaction: "Sevk",
          payment_type: null,
          customer_id: order.customer_id,
          exchange_rate: order.exchange_rate,
          payoff: amount_with_vat,
          debt: null,
          account_id: null,
          order_id: order.order_id,
          log_id: null,
          created_by: userid,
          details: product?.waybill_number
            ? `İrsaliye No: ${product?.waybill_number}`
            : "",
          balance: calculatedBalance,
          waybill_number: product.waybill_number,
        };

        const { rows: cashflows, rowCount: cashflowRowCount } =
          await insertPayment(params, client);

        if (!cashflowRowCount) {
          throw new Error("Error!");
        }
        global.socketio.emit("notification", {
          type: "add_cashflow",
          cashflow: cashflows[0],
          userid,
        });
      }
    }
    // bu genel sipariş durumu güncellemesi şöyle olacak
    // status Alındı ===0 && Sevk BEkliyor===(0 || undefined) && Üretiliyor === (0 || undefined)
    let orderUpdates = [];
    if (shipmentProducts && shipmentProducts.length) {
      for (const product of shipmentProducts) {
        const order_id = product.order_id;
        const { rows: orderdetail } = await getOne(order_id, client);
        const isproduction = orderdetail[0].isproduction;
        const { rows: orderProducts } = await getOrderProducts(
          client,
          order_id
        );
        const promises = orderProducts.map(async (item) => {
          const { rows: shippedTotal } = await getProductStatusQuantity(
            client,
            {
              orderproduct_id: item.id,
              statustype: "Sevk Edildi",
            }
          );
          const { rows: receivedTotal } = await getProductStatusQuantity(
            client,
            {
              orderproduct_id: item.id,
              statustype: "Alındı",
            }
          );
          const { rows: pendingTotal } = await getProductStatusQuantity(
            client,
            {
              orderproduct_id: item.id,
              statustype: "Sevk Bekliyor",
            }
          );
          const { rows: producingTotal } = await getProductStatusQuantity(
            client,
            {
              orderproduct_id: item.id,
              statustype: "Üretiliyor",
            }
          );

          console.log("shippedTotal", shippedTotal[0]);
          console.log("receivedTotal", receivedTotal[0]);
          console.log("pendingTotal", pendingTotal[0]);
          console.log("producingTotal", producingTotal[0]);
          console.log("isproduction", isproduction);

          return !isproduction
            ? shippedTotal[0].total_quantity === item.quantity
            : receivedTotal[0].total_quantity === 0 &&
                pendingTotal[0].total_quantity === null &&
                producingTotal[0].total_quantity === null;
        });

        const results = await Promise.all(promises);
        const isCompleted = results.every((result) => result === true);

        console.log("isCompleted", isCompleted);
        if (isCompleted) {
          const { rows } = await patchSome(
            {
              order_id,
              order_status: "Sevk Edildi",
            },
            client
          );
          orderUpdates.push(rows[0]);
        } else {
          const { rows } = await patchSome(
            { order_id, order_status: "Sevk Ediliyor" },
            client
          );
          orderUpdates.push(rows[0]);
        }
      }
    }

    for (const order of orderUpdates || []) {
      const { rows: orders } = await getOne(order.order_id, client);
      global.socketio.emit("notification", {
        type: "order_update",
        order: orders[0],
        userid,
      });
    }
    const { rows: allOrders } = await getAll(client);
    const { rows: shipments } = await _getOneShipment(
      shipmentRows[0].id,
      client
    );
    await client.query("COMMIT");

    global.socketio.emit("notification", {
      type: "add_shipment",
      shipment: shipments[0],
      userid,
    });

    console.log("Shipment successfully created");
    res
      .status(httpStatus.CREATED)
      .send({ orders: allOrders, shipment: shipments[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction failed, full rollback occurred:", err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const getShipments = async (req, res) => {

  const client = await process.pool.connect();
 
  try {
    const { rows } = await _getShipments( client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

module.exports = {
  createShipment,
  getShipments,
};
