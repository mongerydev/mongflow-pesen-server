const httpStatus = require("http-status/lib");
const {
  getAll,
  del,
  _createManual,
  _getAllManual,
  _getOneManual,
  _delManual,
} = require("../services/Productions");
const {
  getOrderShiftsById,
  getShiftOrdersById,
} = require("../services/Shifts");
const {
  getProductionRecipe,
  updateProductionRecipeWastage,
  getProductionRecipeDetailsById,
  delProductionRecipe,
} = require("../services/Recipes");
const {
  getStock,
  updateStock,
  getAttributeDetails,
  getAllAttributeDetails,
  reduceStock,
} = require("../services/LastProductStocks");
const {
  updateProductStatus,
  getOne,
  getProductStatus,
  insertProductStatus,
  updateProductShipStatus,
  delProductStatus,
  getOrderStockQuantity,
  getOrderProduct,
  insertOrderStock,
  getOrderStockByProduction,
  delOrderStockByProductionId,
} = require("../services/Orders");
const { undoReduceStock } = require("../services/RecipeMaterialStocks");
const {
  insertStock,
  getStockByProductionId,
  delStockById,
} = require("../services/Stocks");
const get = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAll(client);
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

const remove = async (req, res) => {
  const client = await process.pool.connect();
  const production_recipe_id = req.params.id;

  try {
    // vardiya girilmişse hata ver
    await client.query("BEGIN");

    const { rowCount: shiftsRowCount } = await getOrderShiftsById(
      { production_recipe_id },
      client
    );

    if (shiftsRowCount) {
      throw new Error("Hata! Üretime ait vardiyalar mevcut.");
    }

    const { rows: recipeDetails, rowCount: recipeDetailsRowCount } =
      await getProductionRecipeDetailsById(production_recipe_id, client);

    if (!recipeDetailsRowCount) {
      throw new Error("Hata");
    }
    for (const item of recipeDetails) {
      const stockData = {
        product_id: item.product_id,
        attributes: null,
        quantity: item.quantity,
        logproduct_id: item.logproduct_id,
        log_id: item.log_id,
        price_tl: item.price_tl,
        price_usd: item.price_usd,
      };
      const { rowCount: stockUpdateRowCount } = await undoReduceStock(
        stockData,
        client
      );

      if (!stockUpdateRowCount) {
        const { rowCount: stockInsertRowCount } = await insertStock(
          stockData,
          client
        );

        if (!stockInsertRowCount) {
          throw new Error("Hata!");
        }
      }
    }

    const { rows: deleteProductionRecipe, rowCount: delProductionRecipeCount } =
      await delProductionRecipe(production_recipe_id, client);

    if (!delProductionRecipeCount) {
      throw new Error("Hata!");
    }
    const orderstatus_id = deleteProductionRecipe[0].orderstatus_id;
    const quantity = deleteProductionRecipe[0].total_ton;
    const orderproduct_id = deleteProductionRecipe[0].orderproduct_id;
    const order_id = deleteProductionRecipe[0].order_id;

    const { rowCount: delStatusCount } = await delProductStatus(
      client,
      orderstatus_id
    );

    if (!delStatusCount) {
      throw new Error("Hata!");
    }

    console.log("orderproduct_id", typeof orderproduct_id, orderproduct_id);

    const { rows: alindiStatus, rowCount: alindiRowCount } =
      await getProductStatus(client, { orderproduct_id, statustype: "Alındı" });

    if (!alindiRowCount) {
      throw new Error("Hata!");
    }
    const alindi_quantity = alindiStatus[0].quantity;
    const alindi_id = alindiStatus[0].id;

    const alindiData = {
      orderstatus_id: alindi_id,
      quantity: alindi_quantity + quantity,
      statustype: "Alındı",
    };

    const { rows: updateStatus, rowCount: updateStatusCount } =
      await updateProductStatus(client, alindiData);

    if (!updateStatusCount) {
      throw new Error("Hata!");
    }

    // düşen stokları geri alma
    // Reçeteyi silme
    // üretiliyor durumu silip quantity yi alındıya ekleme

    const { rows: orders } = await getOne(order_id, client);

    global.socketio.emit("notification", {
      type: "order_update",
      order: orders[0],
      userid: req.user.userid,
    });

    await client.query("COMMIT");

    res.status(httpStatus.OK).send({ order: orders[0] });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: err.message ?? "An error occurred." });
  } finally {
    client.release();
  }
};

const complete = async (req, res) => {
  const client = await process.pool.connect();
  try {
    const production_recipe_id = req.params?.id;
    console.log("production_recipe_id::", production_recipe_id);
    await client.query("BEGIN");

    const { rows: orderShifts } = await getOrderShiftsById(
      { production_recipe_id },
      client
    );

    const { rows: productionRecipes } = await getProductionRecipe(
      production_recipe_id,
      client
    );

    const foundRecipe = productionRecipes[0];
    const totalProduction = orderShifts?.reduce((acc, item) => {
      return acc + item.quantity;
    }, 0);

    if (
      totalProduction === 0 ||
      totalProduction === undefined ||
      totalProduction === null
    ) {
      throw new Error("Vardiya hatası!");
    }

    // addLastPrductStock with totalProduction
    const stockData = {
      product_id: foundRecipe.product_id,
      attributes: foundRecipe.attributes,
      quantity: totalProduction,
      price_usd: foundRecipe.total_bunker_cost / totalProduction,
      production_recipe_id: production_recipe_id,
    };
    const attributedetails = await getAttributeDetails(
      foundRecipe.attributes,
      client
    );
    x;

    // burada insert stock
    const { rows: stocks } = await insertStock(stockData, client);
    stockResult = stocks;
    stockResult = { ...stocks[0], attributedetails: attributedetails };

    // update orderstatus to üretildi with quantity of totalProduction
    const orderstatus_id = foundRecipe.orderstatus_id;

    const statusData = {
      orderstatus_id: orderstatus_id,
      quantity: totalProduction / 1000, // convert to ton
      statustype: "Üretildi",
    };
    const { rowCount: productStatusRowCount } = await updateProductStatus(
      client,
      statusData
    );
    if (!productStatusRowCount) {
      throw new Error("An error occurred.");
    }
    // update productionrecipes with wastage percentage
    const totalWastageAmount = foundRecipe?.total_ton * 1000 - totalProduction;
    const totalWastagePercentage = (totalWastageAmount * 100) / totalProduction;

    const wastageData = {
      wastage_percentage: totalWastagePercentage,
      production_recipe_id,
    };
    const { rows: productionRecipe, rowCount: productionRecipeRowCount } =
      await updateProductionRecipeWastage(wastageData, client);

    if (!productionRecipeRowCount) {
      throw new Error("An error occurred.");
    }

    const { rows: orders } = await getOne(foundRecipe.order_id, client);

    const result = {
      stock: stockResult,
      productionrecipe: productionRecipe[0],
      order: orders[0],
    };

    global.socketio.emit("notification", {
      type: "lastproduct_stock",
      stock: {
        stockResult,
      },
    });

    global.socketio.emit("notification", {
      type: "order_update",
      order: orders[0],
      userid: req.user.userid,
    });

    console.log("result", result);
    await client.query("COMMIT");
    res.status(httpStatus.CREATED).send(result);
  } catch (e) {
    console.log(e);
    await client.query("ROLLBACK");
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const ship = async (req, res) => {
  const client = await process.pool.connect();
  try {
    const data = req.body;
    await client.query("BEGIN");

    const attributedetails = await getAttributeDetails(data.attributes, client);

    const { rows: stocks, rowCount: reduceStockRowCount } = await reduceStock(
      { ...data, quantity: data.quantity * 1000 }, // convert to kg
      client
    );

    if (reduceStockRowCount === 0) {
      throw new Error("Stok Hatası!");
    }
    stockResult = { ...stocks[0], attributedetails: attributedetails };

    statusData = {
      orderproduct_id: data.orderproduct_id,
      statustype: "Sevk Bekliyor",
      quantity: data.quantity,
    };
    const { rowCount: statusRowCount, rows: productStatusRows } =
      await getProductStatus(client, statusData);

    // Insert Sevk Bekliyor status
    if (statusRowCount === 0) {
      //insert
      const { rowCount: statusRowCount } = await insertProductStatus(
        client,
        statusData
      );

      if (!statusRowCount) {
        throw new Error("Hata!");
      }
    } else {
      //update
      const { rowCount: statusRowCount } = await updateProductStatus(client, {
        ...statusData,
        quantity: statusData.quantity + productStatusRows[0].quantity,
        orderstatus_id: productStatusRows[0].id, //here
      });
      if (!statusRowCount) {
        throw new Error("Hata!");
      }
    }
    // update Üretildi status row isshipped col as true
    const { rowCount: updateStatusRowCount } = await updateProductShipStatus(
      client,
      {
        orderstatus_id: data.orderstatus_id,
        isshipped: true,
      }
    );
    if (!updateStatusRowCount) {
      throw new Error("Hata!");
    }

    const { rows: orderRows } = await getOne(data.order_id, client);

    const result = { stock: stockResult, order: orderRows[0] };
    await client.query("COMMIT");
    res.status(httpStatus.CREATED).send(result);
  } catch (e) {
    console.log(e);
    await client.query("ROLLBACK");
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const createManual = async (req, res) => {
  const data = req.body;
  const client = await process.pool.connect();
  const user_id = req.user.userid;
  const { production_type, ...params } = req.body;

  console.log("req.body manprod", req.body);

  try {
    await client.query("BEGIN");

    const { rows, rowCount } = await _createManual(client, {
      ...data,
      created_by: user_id,
    });

    if (!rowCount) {
      throw new Error("Hata");
    }

    const production_id = rows[0].id;

    if (production_type === "order") {
      console.log("inside if");
      // eğer orderstocks ta ordproduct_id ye ait quantity
      // orderproduct quantity i aşacaksa
      // hata döndür.

      const { rows } = await getOrderStockQuantity(
        client,
        params.orderproduct_id
      );

      const totalQuantity = (rows[0]?.sum ?? 0) + params.quantity;

      const { rows: orderProduct, rowCount: orderProductCount } =
        await getOrderProduct(params.orderproduct_id, client);

      if (!orderProductCount) {
        throw new Error("Hata!");
      }
      const orderProductQuantity = orderProduct[0].quantity;

      if (totalQuantity > orderProductQuantity) {
        throw new Error("exceededSelectedStock!");
      }
      const data = {
        production_id,
        ...params,
        orderproduction_id: production_id,
        orderproduct_id: params.orderproduct_id,
        quantity: params.quantity,
        price: params.cost,
        price_primary: params.cost,
        price_secondary: params.cost * params.secondary_rate,
        logproduct_id: 0,
      };

      const { rows: orderStock, rowCount: orderStockCount } =
        await insertOrderStock(data, client);

      if (!orderStockCount) {
        throw new Error("Hata!");
      }

      const { rows: stockRows, rowCount: stockCount } = await insertStock(
        data,
        client
      );
      console.log("rows of insert stock", stockRows);
      if (!stockCount) {
        throw new Error("Hata!");
      }
    } else {
      console.log("inside else");
      const data = {
        production_id,
        ...params,
        price: params.cost,
        price_primary: params.cost,
        price_secondary: params.cost * params.secondary_rate,
      };

      const { rows: stockRows, rowCount: stockCount } = await insertStock(
        data,
        client
      );
      console.log("rows of insert stock", stockRows);
      if (!stockCount) {
        throw new Error("Hata!");
      }
    }

    // eğer production_type order ise orderstoğa ekle direkt
    // stock ise de stoğa ekle production_id ile beraber

    //manualproduction, orderstocks, productstocks tabloları değişti.

    await client.query("COMMIT");

    res.status(httpStatus.CREATED).send({ stock: rows[0] });
  } catch (err) {
    console.log("error", err);
    await client.query("ROLLBACK");
    if (err.constraint === "exceededSelectedStock") {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send("Hata! Fazla Stok Seçildi.");
    }

    res.status(httpStatus.INTERNAL_SERVER_ERROR).send("An error occurred.");
  } finally {
    client.release();
  }
};
const putManual = async (req, res) => {
  const data = req.body;
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};
const deleteManual = async (req, res) => {
  const id = parseInt(req.params.id);
  const client = await process.pool.connect();
  console.log("del manual id", id);

  try {
    await client.query("BEGIN");

    const { rows, rowCount } = await _getOneManual(client, id);

    if (!rowCount) {
      throw new Error("Hata");
    }

    const production_type = rows[0].production_type;
    const productionQuantity = rows[0].quantity;

    if (production_type === "order") {
      // orderstockta kontrol et approved olmuş muönce
      // önce orderstocks taki satırı sil
      const { rows, rowCount } = await getOrderStockByProduction(client, id);

      if (!rowCount) {
        throw new Error("Hata!");
      }

      const isApproved = rows[0].isapproved;

      if (isApproved) {
        throw new Error("usedOrderProductionStock");
      } else {
        const { rowCount: orderStockCount } = await delOrderStockByProductionId(
          client,
          id
        );

        if (!orderStockCount) {
          throw new Error("Hata!");
        }
        const { rows: productionStocks, rowCount: productionStocksRowCount } =
          await getStockByProductionId(client, id);

        if (!productionStocksRowCount) {
          throw new Error("Hata!");
        }

        const stockQuantity = productionStocks[0].quantity;
        const stockId = productionStocks[0].id;

        if (stockQuantity !== productionQuantity) {
          throw new Error("usedProductionStock");
        }
        const { rowCount: delStockRow } = await delStockById(stockId, client);

        if (!delStockRow) {
          throw new Error("Hata!");
        }
        const { rows, rowCount } = await _delManual(client, id);

        if (!rowCount ) {
          throw new Error("Hata!");
        }
      }
    } else {
      // stockta kontrol et quantity kullanılmış mı
      const { rows, rowCount } = await getStockByProductionId(client, id);

      if (!rowCount) {
        throw new Error("Hata!");
      }

      const stockQuantity = rows[0].quantity;
      const stockId = rows[0].id;

      if (stockQuantity !== productionQuantity) {
        throw new Error("usedProductionStock");
      }
      const { rowCount: delStockRow } = await delStockById(stockId, client);
      const { rowCount: delProductionRow } = await _delManual(client, id);

      if (!delStockRow || !delProductionRow) {
        throw new Error("Hata!");
      }
    }
    await client.query("COMMIT");

    res.status(httpStatus.OK).send({ message: "success" });

  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    if (err.constraint === "usedProductionStock") {
      return res
        .status(httpStatus.BAD_REQUEST).contentType("text/plain")
        .send("Hata! Silmek istediğiniz üretim stoğu kullanılmış.");
    }
    if (err.constraint === "usedOrderProductionStock") {
      return res
        .status(httpStatus.BAD_REQUEST).contentType("text/plain")
        .send("Hata! Silmek istediğiniz sipariş üretimi onaylanmış.");
    }

    res.status(httpStatus.INTERNAL_SERVER_ERROR).contentType("text/plain").send("An error occurred.");
  } finally {
    client.release();
  }
};
const getManual = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    const { rows } = await _getAllManual(client);
    await client.query("COMMIT");

    res.status(httpStatus.OK).send(rows);
  } catch {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

module.exports = {
  get,
  remove,
  complete,
  ship,
  createManual,
  putManual,
  deleteManual,
  getManual,
};
