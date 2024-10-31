const getAll = () => {
    return process.pool.query(
        `
            SELECT pro.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
            FROM productions pro
            LEFT JOIN "User" u ON u.userid = pro.constituent
            LEFT JOIN "User" u2 ON u2.userid = pro.last_edited_by
            LEFT JOIN product p ON p.product_id = pro.product_id
            ORDER BY pro.date ASC
        `
    )
}

const del = (id) => {
    return process.pool.query('DELETE FROM productions WHERE production_id = $1', [id])
}


const _getAllManual = (client) => {
    return client.query(
        `
            SELECT pro.*, p.product_name, p."hasAttributes", u.username as created_by,
            CASE
            WHEN p."hasAttributes" = true THEN 
              (SELECT jsonb_object_agg(attr.attribute_name, val.value)
               FROM jsonb_each_text(pro.attributes::jsonb) AS attr_val(key, value)
               JOIN attribute AS attr ON attr.attribute_id = attr_val.key::int
               JOIN value AS val ON val.value_id = attr_val.value::int
               ) 
            ELSE 
              NULL
            END AS attributedetails
            FROM manualproductions pro
            LEFT JOIN "User" u ON u.userid = pro.created_by
            LEFT JOIN product p ON p.product_id = pro.product_id
            ORDER BY pro.date ASC
        `
    );
}
const _getOneManual = (client, id) => {
    return client.query(
        `
            SELECT pro.*, p.product_name, p."hasAttributes", u.username as created_by,
            CASE
            WHEN p."hasAttributes" = true THEN 
              (SELECT jsonb_object_agg(attr.attribute_name, val.value)
               FROM jsonb_each_text(pro.attributes::jsonb) AS attr_val(key, value)
               JOIN attribute AS attr ON attr.attribute_id = attr_val.key::int
               JOIN value AS val ON val.value_id = attr_val.value::int
               ) 
            ELSE 
              NULL
            END AS attributedetails
            FROM manualproductions pro
            LEFT JOIN "User" u ON u.userid = pro.created_by
            LEFT JOIN product p ON p.product_id = pro.product_id
            WHERE pro.id=$1
            ORDER BY pro.date ASC
        `,
        [id]);
}

const _createManual = (client, data) => {
    return client.query(
      `INSERT INTO manualproductions (
        "date", production_number, "cost", primary_rate, secondary_rate, 
        quantity, product_id, "attributes", production_type,
          orderproduct_id, details, created_by
      )  
      VALUES (
          $1, $2, $3, $4, $5, 
          $6, $7, $8, $9, $10, $11, $12
      ) 
      RETURNING *`,
      [
        data.date,
        data.production_number,
        data.cost,
        data.primary_rate,
        data.secondary_rate,
        data.quantity,
        data.product_id,
        data.attributes,
        data.production_type,
        data.orderproduct_id,
        data.details,
        data.created_by
      ]
    );
  };

  const _delManual = (client, id) => {
    return client.query('DELETE FROM manualproductions WHERE id = $1', [id])
}



module.exports = {
    getAll,
    del,
    _createManual,
    _getAllManual,
    _getOneManual,
    _delManual
}
