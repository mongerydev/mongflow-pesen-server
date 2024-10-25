const httpStatus = require("http-status/lib");
const {
  insert,
  insertProductionRecipe,
  getAll,
  del,
  update,
  getOne,
  insertSpecialRecipe,
  getAllSpecialRecipes,
  delSpecialRecipe,
  getAllProductionRecipes,
  insertDetails,
  insertProductionDetails,
  delAllDetailsByRecipeId,
} = require("../services/Recipes");
const {
  getProductStocks,
  getStockByLogId,
  reduceStockByLogId,
  delStockById,
} = require("../services/RecipeMaterialStocks");
const {
  insertProductStatus,
  getOne: getOrder,
  reduceProductStatus,
  patchSome,
} = require("../services/Orders");
const { calculateAverageType } = require("../scripts/utils/helper");

const create = async (req, res) => {
  const client = await process.pool.connect();
  const { isSaved, saveRecipe, recipe_details, ...data } = req.body;
  console.log("req.body", req.body);
  try {
    await client.query("BEGIN");

    let savedRecipe = null;
    if (isSaved) {
      const { rows, rowCount } = await insertSpecialRecipe(saveRecipe, client);

      if (!rowCount) {
        throw new Error("Hata!");
      }
      savedRecipe = rows[0];
    }

    const { rows, rowCount } = await insert(data, client);
    if (!rowCount) {
      throw new Error("Hata!");
    }

    let details = [];
    if (recipe_details) {
      for (const item of recipe_details) {
        const { rows, rowCount } = await insertDetails(item, client);
        if (!rowCount) {
          throw new Error("Hata!");
        }
        details.push(rows[0]);
      }
    }

    await client.query("COMMIT");

    const recipe = { ...rows[0], recipe_details: details };
    global.socketio.emit("notification", {
      type: "add_recipe",
      recipe,
      userid: req.user.userid,
    });

    res.status(httpStatus.OK).send({
      recipe: recipe,
      savedRecipe: savedRecipe,
    });
  } catch (e) {
    console.log(e);
    client.query("ROLLBACK");

    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const createProductionRecipe = async (req, res) => {
  const client = await process.pool.connect();
  const { isSaved, saveRecipe, recipe_details, ...data } = req.body;
  console.log("production recipe to create:", req.body);
  try {
    await client.query("BEGIN");

    let savedRecipe = null;
    if (isSaved) {
      const { rows, rowCount } = await insertSpecialRecipe(saveRecipe, client);

      if (!rowCount) {
        throw new Error("Hata!");
      }
      savedRecipe = rows[0];
    }

    const statusData = {
      orderproduct_id: data.orderproduct_id,
      quantity: data.total_ton,
      statustype: data.statustype,
    };
    const { rows: orderStatus } = await insertProductStatus(client, statusData);
    console.log("orderStatus", orderStatus);
    const orderstatus_id = orderStatus[0]?.id;

    const reduceStatusData = {
      quantity: data.total_ton,
      statustype: "Alındı",
      orderproduct_id: data.orderproduct_id,
    };
    const { rowCount: reduceProductStatusCount } = await reduceProductStatus(
      client,
      reduceStatusData
    );
    if (!reduceProductStatusCount) {
      throw new Error("Hata!");
    }

    const { rows: productionRecipes } = await insertProductionRecipe(client, {
      ...data,
      orderstatus_id,
    });

    console.log("productionRecipe", productionRecipes);
    const details = productionRecipes[0].details;

    const keys = Object.keys(details);
    for (const key of keys) {
      const stockReduction = parseFloat(details[key]) * data.total_bunker;
      const id = parseInt(key, 10); // Assuming the key represents an ID
      console.log("id of material: ", id);

      const { rows: stocks } = await getStockByLogId(id, client);
      console.log("stocks", stocks);
      if (stocks.length === 1) {
        const stockQuantity = parseFloat(stocks[0].quantity);
        const updatedStock = stockQuantity - stockReduction;

        if (updatedStock < 0) {
          console.error(`Negative stock for ID ${id}`);
          throw new Error("Yetersiz Stok!");
        }
        const { rows: reduceStock, rowCount } = await reduceStockByLogId(
          client,
          {
            id,
            quantity: updatedStock,
          }
        );

        if (!rowCount) {
          throw new Error("Hata!");
        }

        if (reduceStock[0].quantity === 0) {
          const { rowCount } = await delStockById(reduceStock[0].id, client);
          if (!rowCount) {
            throw new Error("Hata!");
          }
        }

        console.log("reducestockbyId", reduceStock);
      } else throw new Error("Hata!");
    }

    let recipeDetails = [];
    if (recipe_details) {
      for (const item of recipe_details) {
        const { rows, rowCount } = await insertProductionDetails(item, client);
        if (!rowCount) {
          throw new Error("Hata!");
        }
        recipeDetails.push(rows[0]);
      }
    }

    const { rows: productStocks } = await getProductStocks(client);
    const { rows: orders } = await getOrder(data.order_id, client);
    const orderStatusNumber = calculateAverageType(orders[0]);
    const order_status =
      orderStatusNumber === 0
        ? "İş Alındı"
        : orderStatusNumber === 3
        ? "İş Tamamen Bitti"
        : "Hazırlıklar Başladı";

    const { rows: updatedOrders } = await patchSome(
      { order_id: data.order_id, order_status },
      client
    );

    const { rows: lastorders } = await getOrder(data.order_id, client);

    global.socketio.emit("notification", {
      type: "order_update",
      order: { ...lastorders[0], order_status },
      userid: req.user.userid,
    });
    global.socketio.emit("notification", {
      type: "add_all_recipematerial_stocks",
      stocks: productStocks,
      userid: req.user.userid,
    });

    global.socketio.emit("notification", {
      type: "add_productionrecipe",
      recipe: {
        ...productionRecipes[0],
        recipe_details: recipeDetails,
      },
      userid: req.user.userid,
    });

    if (savedRecipe) {
      global.socketio.emit("notification", {
        type: "save_recipe",
        recipe: savedRecipe,
        userid: req.user.userid,
      });
    }

    await client.query("COMMIT");
    res.status(httpStatus.ACCEPTED).send({
      stocks: productStocks,
      productionRecipe: {
        ...productionRecipes[0],
        recipe_details: recipeDetails,
      },
      order: { ...orders[0], order_status },
      savedRecipe: savedRecipe,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505" && e.constraint === "unique_recipe_name") {
      // Foreign key constraint violation error
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Farklı Reçete İsmi Giriniz.",
      });
    }
    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: e.message ?? "An error occurred." });
  } finally {
    client.release();
  }
};
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

const getProductionRecipes = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAllProductionRecipes(client);
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

const put = async (req, res) => {
  const id = req.params?.id;
  const client = await process.pool.connect();
  const { isSaved, saveRecipe, recipe_details, ...data } = req.body;
  console.log("reqbody put", req.body);
  try {
    await client.query("BEGIN");

    let savedRecipe = null;
    if (isSaved) {
      const { rows, rowCount } = await insertSpecialRecipe(saveRecipe, client);

      if (!rowCount) {
        throw new Error("Hata!");
      }
      savedRecipe = rows[0];
    }

    const { rows: delRows, rowCount: delRowCount } =
      await delAllDetailsByRecipeId(data.recipe_id, client);
    if (!delRowCount) {
      throw new Error("Hata!");
    }
    let details = [];
    if (recipe_details) {
      for (const item of recipe_details) {
        const { rows, rowCount } = await insertDetails(item, client);
        if (!rowCount) {
          throw new Error("Hata!");
        }
        details.push(rows[0]);
      }
    }

    const { rows, rowCount } = await update({ ...data, id }, client);
    if (!rowCount) {
      throw new Error("Hata!");
    }
    await client.query("COMMIT");

    const recipe = { ...rows[0], recipe_details: details };
    global.socketio.emit("notification", {
      type: "edit_recipe",
      recipe,
      userid: req.user.userid,
    });

    if (savedRecipe) {
      global.socketio.emit("notification", {
        type: "save_recipe",
        recipe: savedRecipe,
        userid: req.user.userid,
      });
    }
    res.status(httpStatus.OK).send({
      recipe: recipe,
      savedRecipe: savedRecipe,
    });
  } catch (e) {
    console.log(e);
    client.query("ROLLBACK");

    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const remove = async (req, res) => {};

const createSpecialRecipe = async (req, res) => {
  try {
    insertSpecialRecipe(req.body)
      .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
      .catch((e) => {
        console.log(e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
      });
  } catch (e) {
    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const getSpecialRecipes = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAllSpecialRecipes(client);
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

const removeSpecialRecipe = async (req, res) => {
  const id = req.params.id;
  delSpecialRecipe(id)
    .then(({ rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      res.status(httpStatus.OK).send({ message: "User deleted successfully." });
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

module.exports = {
  create,
  get,
  put,
  remove,
  getSpecialRecipes,
  createSpecialRecipe,
  removeSpecialRecipe,
  createProductionRecipe,
  getProductionRecipes,
};
