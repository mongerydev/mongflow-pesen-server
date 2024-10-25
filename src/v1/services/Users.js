const findOne = (userid, client) => {
    const query=`SELECT * FROM "User" WHERE UserID = $1`;
    const values=[userid]
  
    if (client) return client.query(query, values);
    return process.pool.query(query, values);
}

const getAll = (userid) => {
    return process.pool.query('SELECT * FROM "User" WHERE userid <> $1 ORDER BY userid ASC', [userid])
}

const insert = (data) => {
    return process.pool.query('INSERT INTO "User" (Username, PasswordHash, Email, Usertype) VALUES ($1, $2, $3, $4) RETURNING UserID', [
        data.Username,
        data.hashedPassword,
        data.Email,
        "boss"
    ])
}

const loginUser = (username) => {
    return process.pool.query('SELECT * FROM "User" WHERE username = $1', [username])
}

const update = (data) => {
    return process.pool.query(
        'UPDATE "User" SET email = $1, company_name = $2, phone = $3, fullname = $4 WHERE UserID = $5 RETURNING email, company_name, phone, fullname',
        [data.email, data.company_name, data.phone, data.fullname, data.userid]
    )
}

const del = (userid) => {
    return process.pool.query('DELETE FROM "User" WHERE UserID = $1', [userid])
}

const _changePhoto = (data) => {
    return process.pool.query('UPDATE "User" SET photo = $1 WHERE UserID = $2 RETURNING photo', [data.photo, data.userid])
}

const _changePassword = (data) => {
    return process.pool.query('UPDATE "User" SET passwordhash = $1 WHERE UserID = $2', [data.passwordhash, data.userid])
}

const _changeUserType = (data) => {
    return process.pool.query('UPDATE "User" SET usertype = $1 WHERE UserID = $2 RETURNING usertype, userid', [data.usertype, data.userid])
}

module.exports = {
    findOne,
    getAll,
    insert,
    loginUser,
    update,
    del,
    _changePhoto,
    _changePassword,
    _changeUserType
}
