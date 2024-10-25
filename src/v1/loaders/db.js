const { Pool } = require('pg')

const connectDB = async () => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })

    console.log('DB Connection is successful...')

    process.pool = pool
}

module.exports = {
    connectDB
}
