const insert = (data, client) => {
    const query = 'INSERT INTO set(set_name, products) VALUES($1, $2) RETURNING *'
    const values = [data.set_name, data.products]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const update = (data, client) => {
    const query = 'UPDATE set SET set_name = $1, products = $2 WHERE set_id = $3 RETURNING *'
    const values = [data.set_name, data.products, data.set_id]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const getAll = () => {
    return process.pool.query('SELECT * FROM set ORDER BY set_id ASC')
}

const getName = (data, client) => {
    const query = 'SELECT set_name FROM set WHERE set_id = $1'
    const values = [data.set_id]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const del = (data, client) => {
    const query = 'DELETE FROM set WHERE set_id = $1 RETURNING *'
    const values = [data.set_id]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

module.exports = {
    insert,
    update,
    getAll,
    getName,
    del
}
