const httpStatus = require("http-status/lib");
const {
  getStock,
  updateEachStock,
  delStock,
  getProductStocks,
  getAllWarehouse,
  reduceStock,
  reduceWarehouseStock,
  getStockById,
  getAllStockCodes,
  reduceStockById,
} = require("../services/Stocks");
const { patchOrderProduct } = require("../services/Orders");
const { getProductionRecipe } = require("../services/Recipes");

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


const updateStocks = async (req, res) => {
  const order_id = req.params.id;

  try {
    const result = await updateEachStock(order_id);
    res.status(httpStatus.ACCEPTED).send(result.rows);
  } catch (err) {
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
};

const updateStocksInProduction = async (req, res) => {
  const recipe_id = req.params.id;
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: productionRecipe } = await getProductionRecipe(
      recipe_id,
      client
    );

    const details = productionRecipe[0].details;

    for (const recipe of details) {
      const keys = Object.keys(recipe.details);
      for (const key of keys) {
        const stockReduction = parseFloat(recipe.details[key]);
        const id = parseInt(key, 10); // Assuming the key represents an ID
        console.log("id of material: ", id);

        const { rows: stocks } = await getStockById(client, id);

        if (rows.length === 1) {
          const stockQuantity = parseFloat(stocks[0].quantity);
          const updatedStock = stockQuantity - stockReduction;

          if (updatedStock < 0) {
            console.error(`Negative stock for ID ${id}`);
            await client.query("ROLLBACK");
            throw new Error("Yetersiz Stok!");
          }
          await reduceStockById(client, { id, quantity: updatedStock });
        }
      }
    }

    const { rows: stocks } = await getProductStocks(client);

    res.status(httpStatus.ACCEPTED).send(stocks);
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: err.message });
  } finally {
    client.release();
  }
};

const getAllWarehouseStock = async (req, res) => {
  const client = await process.pool.connect();
  const product_type= req?.params?.product_type;


  try {
    const { rows } = await getAllWarehouse(client, product_type);
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
  const product_type= req?.params?.product_type;

   console.log("prod type", product_type)

  try {
    const { rows } = await getProductStocks(client, product_type);
     console.log("rowss", rows)
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
const reduceStocks = async (req, res) => {
  const client = await process.pool.connect();
  const stocksData = req.body?.stocks;
  const warehouseStocksData = req.body?.warehouseStocks;
  try {
    await client.query("BEGIN");
    for (const key of Object.keys(warehouseStocksData)) {
      const id = warehouseStocksData[key].id;
      const quantity = warehouseStocksData[key].quantity;

      console.log("id, quantity::", id, "-", quantity);
      const { rows: reducedwarehouseStocks } = await reduceWarehouseStock({
        id,
        quantity,
      });
      console.log("reducedwarehouseStocks::", reducedwarehouseStocks);

      const log_id = reducedwarehouseStocks[0].log_id;
      const orderproduct_id = parseInt(key);

      //set log_id of orderproducts
      await patchOrderProduct(orderproduct_id, { log_id }, client);

      // reducedwarehouseStocks burdan log_id çekip iliglii orderproductsa ekleyeceğim
      if (reducedwarehouseStocks[0].quantity === 0) {
        await delWarehouse(reducedwarehouseStocks.rows[0].id, client);
      }
    }
    for (const product of stocksData) {
      // orderproducts log_id set
      const stockReduction = product.quantity;

      console.log("prod::", product);
      const { rows: stocks } = await getStock(product, client);
      if (stocks?.length === 0) {
        throw new Error(`Stok Hatası! Stokları kontrol edin.`);
      }
      const currentStock = stocks[0]?.quantity;

      if (currentStock < stockReduction) {
        throw new Error(
          `Hata, Yetersiz stok! ${stocks[0].product_name}: ${currentStock} ton `
        );
      }

      const { rows: reducedStocks, rowCount: reducedStocksCount } =
        await reduceStock(product, client);

      if (reducedStocksCount === 0) {
        throw new Error("Hata, stok güncellenemedi!");
      }

      if (reducedStocks[0].quantity === 0) {
        const { rowCount } = await delStock(reducedStocks[0].id, client);
        if (!rowCount) {
          await client.query("ROLLBACK");
          return res
            .status(httpStatus.NOT_MODIFIED)
            .send({ error: "An error occured." });
        }
      }
    }

    const { rows: productStocks } = await getProductStocks(client);
    const { rows: warehouseStocks } = await getAllWarehouse(client);
    await client.query("COMMIT");
    return res.status(httpStatus.OK).send({ productStocks, warehouseStocks });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occured." });
  } finally {
    client.release();
  }
};

module.exports = {
  updateStocks,
  getAllProductStocks,
  getAllWarehouseStock,
  updateStocksInProduction,
  reduceStocks,
  getStockCodes
};
