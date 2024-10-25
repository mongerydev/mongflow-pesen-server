const httpStatus = require("http-status/lib");
const {
  insertForProcess,
  insertForOrder,
  createShift,
  getDayShiftsOrder,
  getDayShiftsProcess,
  getOrderShift,
  getProcessShift,
  getShift,
  getShiftDetail,
  getShiftOrdersById,
  getOrderShiftsById,
  getShiftProcessById,
  deleteShift,
} = require("../services/Shifts");

const {
  getStock,
  updateStock,
  insertStock,
} = require("../services/SecondQualityProductStocks");
const {
  getStock: getStockRecipe,
  updateStock: updateStockRecipe,
  insertStock: insertStockRecipe,
  delStock,
  delStockById,
  getStockByShiftId,
} = require("../services/RecipeMaterialStocks");

const {
  reduceStock,
  undoStockUpdateByLogId,
  insertStock: insertRawStock,
} = require("../services/RawMaterialStocks");
const { getProductionRecipe } = require("../services/Recipes");
const { getProductStatusById } = require("../services/Orders");

const create = async (req, res) => {
  const client = await process.pool.connect();
  try {
    await client.query("BEGIN");
    const {
      shift,
      date,
      orderproductions,
      materialproductions,
      secondqualityproduction,
      consumable_products,
      bunker_quantity,
    } = req.body;

    const shiftData = {
      shift,
      date,
      consumable_products,
      bunker_quantity,
    };

    const { rowCount: shiftRows } = await getShift({ date, shift }, client);
    const { rowCount: orderShiftRows } = await getOrderShift(
      { date, shift },
      client
    );
    const { rowCount: processShiftRows } = await getProcessShift(
      {
        date,
        shift,
      },
      client
    );

    if (orderShiftRows !== 0 || processShiftRows !== 0 || shiftRows !== 0) {
      await client.query("ROLLBACK");
      return res
        .status(httpStatus.FORBIDDEN)
        .send({ error: "Her vardiya 1 defa eklenebilir." });
    }

    const { rows: shifts, rowCount: shiftRowCount } = await createShift(
      shiftData,
      client
    );
    if (!shiftRowCount) {
      throw new Error("Hata");
    }
    const shift_id = shifts[0].id;

    if (secondqualityproduction) {
      // todo burada second quality prodcuts stok ekleme yapılacalk
      for (const [key, value] of Object.entries(secondqualityproduction)) {
        const product_id = parseInt(key);
        // insert stock
        const data = {
          product_id: product_id,
          price_usd: 0,
          price_tl: 0,
          quantity: parseInt(value),
          shift_id: shift_id,
        };
        const { rows, rowCount } = await insertStock(data, client);
        if (!rowCount) {
          throw new Error("Hata");
        }
      }
    }

    if (orderproductions?.length !== 0) {
      for (let production of orderproductions) {
        await insertForOrder({ ...production, shift_id, shift, date }, client);
      }
    }

    if (materialproductions?.length !== 0) {
      for (let production of materialproductions) {
        await insertForProcess(
          { ...production, shift_id, shift, date },
          client
        );
        await reduceStock(
          {
            product_id: parseInt(production.used_product),
            quantity: parseInt(production.usage_quantity),
            attributes: null,
          },
          client
        );

        //burada quantity sıfırsa silme işlemi yapılacak
        const product_id = parseInt(production.output_product);

        // later add this getShiftExpenseByDate to the cost
        calculateStockUnitCost =
          production.usedProductsCosts / parseFloat(production.output_quantity);

        console.log("calculateStockUnitCost", calculateStockUnitCost);
        const stockData = {
          product_id: product_id,
          quantity: parseInt(production.output_quantity),
          price_usd: calculateStockUnitCost,
          price_tl: 0,
          shift_id: shift_id,
        };

        const { rows } = await insertStockRecipe(stockData, client);
      }
    }

    const { rows: shiftDetail } = await getShiftDetail({ date }, client);
    const { rows: processShift } = await getDayShiftsProcess({ date }, client);
    const { rows: orderShift } = await getDayShiftsOrder({ date }, client);

    client.query("COMMIT");

    res
      .status(httpStatus.OK)
      .send({ shift: shiftDetail, processShift, orderShift });
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

const getDayShift = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const date = req.query?.date;
    if (!date) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "Tarih bulunamadı." });
    }
    const { rows: shiftDetail } = await getShiftDetail({ date }, client);
    const { rows: processShift } = await getDayShiftsProcess({ date }, client);
    const { rows: orderShift } = await getDayShiftsOrder({ date }, client);

    client.query("COMMIT");

    res
      .status(httpStatus.OK)
      .send({ shift: shiftDetail, processShift, orderShift });
  } catch (err) {
    client.query("ROLLBACK");
    console.log(err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};
const getOrderShiftsForProduction = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const production_recipe_id = req.params?.id;
    if (!production_recipe_id) {
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "Reçete bulunamadı." });
    }
    const { rows: orderShifts } = await getOrderShiftsById(
      { production_recipe_id },
      client
    );

    client.query("COMMIT");

    console.log("hey", orderShifts);
    res.status(httpStatus.OK).send(orderShifts);
  } catch (err) {
    client.query("ROLLBACK");
    console.log(err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const delShift = async (req, res) => {
  const client = await process.pool.connect();
  const shift_id = parseInt(req.params.id);

  try {
    await client.query("BEGIN");

    // siparişe üretim varsa geri al (for loop)
    // orderstatus kontrol et Üretiliyor ise geri al yoksa hata ver.

    const { rows: shiftOrders, rowCount: shiftOrdersCount } =
      await getShiftOrdersById(shift_id, client);

    if (shiftOrdersCount) {
      for (const item of shiftOrders) {
        const { production_recipe_id, quantity: production_quantity } = item;

        const { rows: productionRecipes, rowCount: productionRecipeCount } =
          await getProductionRecipe(production_recipe_id, client);

        if (!productionRecipeCount) {
          throw new Error("Hata");
        }
        const { orderstatus_id, product_id, attributes } = productionRecipes[0];

        const { rows: statusRows, rowCount: statusCount } =
          await getProductStatusById(orderstatus_id, client);

        if (!statusCount) {
          throw new Error("Hata!");
        }
        const { statustype, isshipped } = statusRows[0];
        if (statustype === "Üretildi") {
          throw new Error(
            "Hata! Vardiya Silmek için İlgili Üretimi Silmelisiniz."
          );
        }
        if (statustype !== "Üretiliyor") {
          throw new Error("Hata!");
        }
      }
    }

    // hammadde üretimi varsa geri al (for loop)
    // output_quantity stoktan geri alınca sıfırdan küçükse hata ver
    // used_products stoğa geri eklenecek.

    const { rows: shiftProcess, rowCount: shiftProcesssCount } =
      await getShiftProcessById(shift_id, client);
    shift_id, client;

    if (shiftProcesssCount) {
      const { used_products, output_product_id, output_quantity } =
        shiftProcess[0];

      const { rows, rowCount } = await getStockByShiftId(
        { shift_id, output_product_id },
        client
      );
      if (!rowCount) {
        throw new Error("Hata!");
      }
      const stockQuantity = rows[0].quantity;
      if (stockQuantity === output_quantity) {
        const { rowCount } = await delStockById(rows[0].id, client);
        if (!rowCount) {
          throw new Error("Hata");
        }
      }

      for (const item of used_products) {
        const { logproduct_id, production, product_id, log_id, price } = item;

        const { rows, rowCount } = await undoStockUpdateByLogId(
          { logproduct_id, quantity: production },
          client
        );

        if (!rowCount) {
          const data = {
            logproduct_id,
            quantity: production,
            product_id,
            log_id,
            price_usd: price,
            price_tl: 0,
            attributes: null,
          };
          const { rows, rowCount } = await insertRawStock(data, client);

          if (!rowCount) {
            throw new Error("Hata!");
          }
        }
      }
    }
    // vardiya sil shifts tablosundan

    const { rowCount } = await deleteShift(shift_id, client);

    if (!rowCount) {
      throw new Error("hata");
    }

    client.query("COMMIT");

    res.status(httpStatus.OK).send("well done");
  } catch (err) {
    client.query("ROLLBACK");
    console.log(err);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

module.exports = {
  create,
  getDayShift,
  getOrderShiftsForProduction,
  delShift,
};
