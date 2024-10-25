const currency = (client, defaultCurrency) => {
    return client.query('SELECT currency_id FROM Currency WHERE currency_code = $1', [defaultCurrency])
}

const getCurrency= ( currency_id, client)=>{
    return client.query('SELECT currency_code FROM currency WHERE currency_id = $1', [currency_id])

}

const insertCurrency = (client, defaultCurrency) => {
    return client.query('INSERT INTO Currency(currency_code) VALUES($1) RETURNING currency_id', [defaultCurrency])
}

const insertCurrencyId = (client, productId, currencyId, defaultPrice) => {
    return client.query('INSERT INTO ProductDefaultPrice(product_id, currency_id, default_price) VALUES($1, $2, $3)', [
        productId,
        currencyId,
        defaultPrice
    ])
}

const updateProductDefaultPrice = (client, default_price, currency_id, product_id) => {
    return client.query('UPDATE "productdefaultprice" SET default_price = $1, currency_id = $2 WHERE product_id = $3 RETURNING *', [
        default_price,
        currency_id,
        product_id
    ])
}

const delProductDefaultPrice = (client, product_id) => {
    return client.query('DELETE FROM "productdefaultprice" WHERE product_id = $1', [product_id])
}

const getAttribute = (client, name, productId) => {
    return client.query('SELECT attribute_id FROM attribute WHERE attribute_name = $1 AND product_id = $2', [name, productId])
}

const insertAttribute = (client, name, productId) => {
    return client.query('INSERT INTO attribute(attribute_name, product_id) VALUES($1, $2) RETURNING attribute_id', [name, productId])
}

const updateAttribute = (client, attribute_name, attribute_id) => {
    return client.query('UPDATE "attribute" SET attribute_name = $1 WHERE attribute_id = $2 RETURNING *', [attribute_name, attribute_id])
}

const delAttribute = (client, product_id, attribute_id) => {
    if (product_id) return client.query('DELETE FROM "attribute" WHERE product_id = $1', [product_id])
    return client.query('DELETE FROM "attribute" WHERE attribute_id = $1', [attribute_id])
}

const getValue = (client, value, product_id, attribute_id) => {
    return client.query('SELECT value_id FROM value WHERE value = $1 AND product_id = $2 AND attribute_id = $3', [value, product_id, attribute_id])
}

const insertValue = (client, name, productId, attributeId) => {
    return client.query('INSERT INTO value(product_id, attribute_id, value) VALUES($1, $2, $3) RETURNING value_id', [productId, attributeId, name])
}

const updateValue = (client, value, value_id) => {
    return client.query('UPDATE "value" SET value = $1 WHERE value_id = $2 RETURNING *', [value, value_id])
}

const delValue = (client, product_id, value_id) => {
    if (product_id) return client.query('DELETE FROM "value" WHERE product_id = $1', [product_id])
    return client.query('DELETE FROM "value" WHERE value_id = $1', [value_id])
}

const insertExtraPrice = (client, valueId, currencyId, extraPrice) => {
    return client.query('INSERT INTO AttributeValueExtraPrice(value_id, currency_id, extra_price) VALUES($1, $2, $3)', [
        valueId,
        currencyId,
        extraPrice
    ])
}

const updateExtraPrice = (client, extra_price, currency_id, value_id) => {
    return client.query('UPDATE "attributevalueextraprice" SET extra_price = $1, currency_id = $2 WHERE value_id = $3 RETURNING *', [
        extra_price,
        currency_id,
        value_id
    ])
}

const delExtraPrice = (client, value_id) => {
    return client.query('DELETE FROM "attributevalueextraprice" WHERE value_id = $1', [value_id])
}

const insert = (client, name, userid, type, hasAttributes) => {
  return client.query(
    'INSERT INTO product(product_name, userid, product_type, "hasAttributes") VALUES($1, $2, $3, $4) RETURNING product_id',
    [name, userid, type, hasAttributes]
  );
};

const update = (client, data) => {
  return client.query(
    'UPDATE "product" SET product_name = $1, "hasAttributes"= $2 WHERE product_id = $3 RETURNING *',
    [data.product_name, data.hasAttributes, data.product_id]
  );
};

const getAll = () => {
  return process.pool.query(
    ` WITH AttributeValues AS (
        SELECT
            v.product_id,
            a.attribute_id,
            a.attribute_name,
            jsonb_agg(jsonb_build_object(
                'value_id', v.value_id,
                'value', v.value
            ) ORDER BY v.value_id) AS values
        FROM
            value AS v
        INNER JOIN
            attribute AS a ON v.attribute_id = a.attribute_id
        LEFT JOIN
            attributevalueextraprice AS avel ON v.value_id = avel.value_id
        GROUP BY
            v.product_id, a.attribute_id, a.attribute_name
    )
    SELECT
        p.product_id,
        p.product_name,
        p.product_type,
        p."hasAttributes",
        CASE
            WHEN p."hasAttributes" THEN
                jsonb_agg(jsonb_build_object(
                    'attribute_id', av.attribute_id,
                    'attribute_name', av.attribute_name,
                    'values', av.values
                ) ORDER BY av.attribute_id ASC)
            ELSE NULL
        END AS attributes
    FROM
        product AS p
    LEFT JOIN
        AttributeValues AS av ON p.product_id = av.product_id
    GROUP BY
        p.product_id, p.product_name, p.product_type, p."hasAttributes"
    ORDER BY
        p.product_id ASC;`
  );
};

const getOne = (client, product_id) => {
    return client.query(
      `WITH AttributeValues AS (
          SELECT
              v.product_id,
              a.attribute_id,
              a.attribute_name,
              jsonb_agg(
                  jsonb_build_object(
                      'value_id', v.value_id,
                      'value', v.value
                  ) ORDER BY v.value_id
              ) AS values
          FROM
              value AS v
          INNER JOIN
              attribute AS a ON v.attribute_id = a.attribute_id
          GROUP BY
              v.product_id, a.attribute_id, a.attribute_name
      )
      SELECT
          p.product_id,
          p.product_name,
          p.product_type,
          p."hasAttributes",
    
          CASE
              WHEN p."hasAttributes" THEN 
                  (SELECT jsonb_agg(
                      jsonb_build_object(
                          'attribute_id', av.attribute_id,
                          'attribute_name', av.attribute_name,
                          'values', av.values
                      ) ORDER BY av.attribute_id
                  ))
              ELSE NULL
          END AS attributes
      FROM
          product AS p
      LEFT JOIN
          AttributeValues AS av ON p.product_id = av.product_id
      WHERE
          p."hasAttributes" = TRUE
          AND p.product_id = $1  -- Use the product_id parameter
      GROUP BY
          p.product_id, p.product_name, p.product_type
      ORDER BY
          p.product_id ASC;
      `,
      [product_id]  // Bind product_id to the placeholder
    );
  };
  
const getName = (product_id, client) => {
  const query = "SELECT product_name FROM product WHERE product_id = $1";
  if (client) return client.query(query, [product_id]);
  return process.pool.query(query, [product_id]);
};

const del = (client, product_id) => {
     console.log("product_id",typeof product_id)
  return client.query(
    'DELETE FROM "product" WHERE product_id = $1 RETURNING "hasAttributes"',
    [product_id]
  );
};

module.exports = {
  getName,
  currency,
  getCurrency,
  insertCurrency,
  insertCurrencyId,
  getAttribute,
  insertAttribute,
  getValue,
  insertValue,
  insertExtraPrice,
  insert,
  getAll,
  getOne,
  update,
  updateProductDefaultPrice,
  updateAttribute,
  updateExtraPrice,
  updateValue,
  del,
  delProductDefaultPrice,
  delAttribute,
  delExtraPrice,
  delValue,
};
