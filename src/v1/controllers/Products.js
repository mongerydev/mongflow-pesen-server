const httpStatus = require("http-status/lib");
const {
  insert,
  getAll,
  currency,
  insertCurrency,
  insertCurrencyId,
  getAttribute,
  insertAttribute,
  insertValue,
  insertExtraPrice,
  del,
  delProductDefaultPrice,
  delAttribute,
  delExtraPrice,
  delValue,
  update,
  updateProductDefaultPrice,
  updateAttribute,
  updateValue,
  updateExtraPrice,
  getOne,
} = require("../services/Products");

const create = async (req, res) => {
  const userid = req.user.userid;
  const {
    productName,
    defaultPrice,
    defaultCurrency,
    attributes,
    type,
    hasAttributes,
  } = req.body;
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const product = {
      product_id: null,
      product_type: type,
      product_name: productName,
      default_price: defaultPrice,
      currency_code: defaultCurrency,
      hasAttributes: hasAttributes,
      attributes: [],
    };

    const { rows: currenyRows, rowCount: currencyRowCount } = await currency(
      client,
      product.currency_code
    );
    let currencyId;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        product.currency_code
      );
      currencyId = insertCurrencyRows[0].currency_id;
    } else currencyId = currenyRows[0].currency_id;

    const { rows: insertRows } = await insert(
      client,
      product.product_name,
      userid,
      product.product_type,
      product.hasAttributes
    );
    product.product_id = insertRows[0].product_id;

    await insertCurrencyId(
      client,
      product.product_id,
      currencyId,
      product.default_price
    );

    if (hasAttributes) {
      for (let attr of attributes) {
        const attribute = {
          attribute_id: null,
          attribute_name: attr.attribute_name,
          values: [],
          // packaging: attr.packaging,
        };

        const { rows: getAttributeRows, rowCount: getAttributeRowCount } =
          await getAttribute(
            client,
            attribute.attribute_name,
            product.product_id
          );
        if (!getAttributeRowCount) {
          console.log("attribute.attribute_name", attribute.attribute_name);
          if (attribute.attribute_name?.length !== 0) {
            const { rows: insertAttributeRows } = await insertAttribute(
              client,
              attribute.attribute_name,
              product.product_id
              // attribute.packaging
            );
            attribute.attribute_id = insertAttributeRows[0].attribute_id;
          }
        } else attribute.attribute_id = getAttributeRows[0].attribute_id;

        for (let val of attr.values) {
          console.log("val", val);
          if (val.value?.length !== 0) {
            const value = {
              value_id: null,
              value: val.value,
              extra_price: val.extra_price || "0",
            };

            const { rows: insertValueRows } = await insertValue(
              client,
              value.value,
              product.product_id,
              attribute.attribute_id
            );
            value.value_id = insertValueRows[0].value_id;
            await insertExtraPrice(
              client,
              value.value_id,
              currencyId,
              value.extra_price
            );

            attribute.values.push(value);
          }
        }

        product.attributes.push(attribute);
      }
    }

    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send(product);
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const get = async (req, res) => {
  const client = await process.pool.connect();

    try {
      const { rows } = await getAll(client);
      res.status(httpStatus.OK).send(rows);
    } catch (e) {
      console.error(e);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: "An error occurred." });
    } finally {
      client.release();
    }
};

const put = async (req, res) => {
  const data = { product_id: req.params.id, ...req.body };
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const product = {
      product_id: parseInt(data.product_id),
      product_name: data.productName,
      default_price: data.defaultPrice,
      currency_code: data.defaultCurrency,
      hasAttributes: data.hasAttributes,
      attributes: [],
    };

    const { rows: getOneRows } = await getOne(client, product.product_id);
    const oldProduct = getOneRows[0];

    await update(client, product);

    const { rows: currenyRows, rowCount: currencyRowCount } = await currency(
      client,
      product.currency_code
    );
    let currencyId;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        product.currency_code
      );
      currencyId = insertCurrencyRows[0].currency_id;
    } else currencyId = currenyRows[0].currency_id;
    await updateProductDefaultPrice(
      client,
      product.default_price,
      currencyId,
      product.product_id
    );

    if (oldProduct?.hasAttributes) {
      const deletedAttributes = oldProduct.attributes.filter((oldAttr) => {
        if (
          !data.attributes.find(
            (attr) => attr.attribute_id === oldAttr.attribute_id
          )
        )
          return oldAttr;
      });

      for (const attr of deletedAttributes) {
        const { rowCount: delAttributeRowCount } = await delAttribute(
          client,
          null,
          attr.attribute_id
        );
        if (!delAttributeRowCount) {
          client.release();
          return res
            .status(httpStatus.NOT_FOUND)
            .send({ message: "There is no such record." });
        }

        for (const val of attr.values) {
          const { rowCount: delValueRowCount, rows: delValueRows } =
            await delValue(client, null, val.value_id);
          if (!delValueRowCount) {
            client.release();
            return res
              .status(httpStatus.NOT_FOUND)
              .send({ message: "There is no such record." });
          }

          const { rowCount: delExtraPriceRowCount } = await delExtraPrice(
            client,
            val.value_id
          );
          if (!delExtraPriceRowCount) {
            client.release();
            return res
              .status(httpStatus.NOT_FOUND)
              .send({ message: "There is no such record." });
          }
        }
      }
    }
    if (product.hasAttributes) {
      const updatedAttributes = oldProduct?.attributes?.filter((oldAttr) => {
        if (
          data?.attributes?.find(
            (attr) => attr.attribute_id === oldAttr.attribute_id
          )
        )
          return oldAttr;
      });

       console.log("updatedAttributes",updatedAttributes)
      const oldValues = [];
      updatedAttributes?.forEach((updatedAttr) => {

        oldValues.push(...updatedAttr?.values);
      });

      const newValues = [];
      data.attributes.forEach((attr) => {
        newValues.push(...attr?.values);
      });

      const deletedValues = oldValues.filter((oldVal) => {
        if (!newValues.find((val) => val.value_id === oldVal.value_id) || newValues.find((val) => val.value_id === oldVal.value_id)?.value?.length===0 )
          return oldVal;
      });

      for (const val of deletedValues) {
        const { rowCount: delValueRowCount, rows: delValueRows } =
          await delValue(client, null, val.value_id);
        if (!delValueRowCount) {
          client.release();
          return res
            .status(httpStatus.NOT_FOUND)
            .send({ message: "There is no such record." });
        }

        const { rowCount: delExtraPriceRowCount } = await delExtraPrice(
          client,
          val.value_id
        );
        if (!delExtraPriceRowCount) {
          client.release();
          return res
            .status(httpStatus.NOT_FOUND)
            .send({ message: "There is no such record." });
        }
      }

      for (let attr of data.attributes) {
        // Use let instead of const to create a new binding for each iteration
        await client.query("BEGIN");
        try {
          const attribute = {
            attribute_id: attr?.attribute_id,
            attribute_name: attr?.attribute_name,
            values: [],
            // packaging: attr.packaging,
          };

          if (attribute.attribute_id) {
            if (attr.attribute_name?.length !== 0) {
               console.log("attr.attribute_name 309", attr.attribute_name)
              await updateAttribute(
                client,
                attr.attribute_name,
                attr.attribute_id
                // attr.packaging
              );
            }
          } else {
            const { rows: getAttributeRows, rowCount: getAttributeRowCount } =
              await getAttribute(
                client,
                attribute.attribute_name,
                product.product_id
              );
            if (!getAttributeRowCount) {
               console.log("attr.attribute_name 324", attr.attribute_name)
              if (attr.attribute_name?.length !== 0) {
                const { rows: insertAttributeRows } = await insertAttribute(
                  client,
                  attribute.attribute_name,
                  product.product_id
                  // attr.packaging
                );
                attribute.attribute_id = insertAttributeRows[0].attribute_id;
              }
            } else attribute.attribute_id = getAttributeRows[0].attribute_id;
          }

          for (let val of attr.values) {
            await client.query("BEGIN");
            try {
              const value = {
                value_id: val?.value_id,
                value: val.value,
                extra_price: val?.extra_price || "0",
              };

              if (value.value_id) {
                console.log("value.value 346", value.value)

                if (value.value?.length !== 0) {
                  await updateValue(client, value.value, value.value_id);
                  await updateExtraPrice(
                    client,
                    value.extra_price,
                    currencyId,
                    value.value_id
                  );
                }
              } else {
                if (value.value?.length !== 0) {
                   console.log("value.value 357", value.value)
                  const { rows: insertValueRows } = await insertValue(
                    client,
                    value.value,
                    product.product_id,
                    attribute.attribute_id
                  );
                  value.value_id = insertValueRows[0].value_id;
                  await insertExtraPrice(
                    client,
                    value.value_id,
                    currencyId,
                    value.extra_price
                  );
                }
              }

              attribute.values.push(value);
              await client.query("COMMIT");
            } catch (error) {
              await client.query("ROLLBACK");
              console.error("Transaction rolled back:", error);
              throw new Error("Error processing details");
            }
          }

          product.attributes.push(attribute);
        } catch (error) {
          await client.query("ROLLBACK");
          console.error("Transaction rolled back:", error);
          throw new Error("Error processing details");
        }
      }
    }

     console.log("prod", product)

    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send(product);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Transaction rolled back:", e);

    if (e.code === "P0001") {
      // Foreign key constraint violation error
      return res.status(httpStatus.BAD_REQUEST).send({
        error:e.message,
      });
    }

    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const remove = async (req, res) => {
  const product_id = req.params.id;
  const client = await process.pool.connect();

   console.log("deleted", product_id)
  try {
    await client.query("BEGIN");

    const { rowCount: delRowCount, rows: deletedProduct } = await del(
      client,
      parseInt(product_id)
    );

     console.log("deletedProduct", deletedProduct)
    if (!delRowCount) {
      client.release();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }


    const hasAttributes = deletedProduct[0].hasAttributes;
 console.log("hasAttributes", hasAttributes) 
    if (hasAttributes) {
      const { rowCount: delAttributeRowCount } = await delAttribute(
        client,
        product_id
      );
      if (!delAttributeRowCount) {
        client.release();
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      }

      const { rowCount: delValueRowCount, rows: delValueRows } = await delValue(
        client,
        product_id
      );
      if (!delValueRowCount) {
        client.release();
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      }

      for (let row of delValueRows) {
        const { rowCount: delExtraPriceRowCount } = await delExtraPrice(
          client,
          row.value_id
        );
        if (!delExtraPriceRowCount) {
          client.release();
          return res
            .status(httpStatus.NOT_FOUND)
            .send({ message: "There is no such record." });
        }
      }
    }

    await client.query("COMMIT");
    client.release();
    res
      .status(httpStatus.OK)
      .send({ message: "Product deleted successfully." });
  } catch (e) {
    client.release();
     console.log("eee", e)
     if (e.code === "23503" && e.constraint==="orderproducts_product_id_fkey") {
      // Foreign key constraint violation error
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Ürün kullanımda olduğu için silinemez.",
      });
    }
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

module.exports = {
  create,
  get,
  put,
  remove,
};
