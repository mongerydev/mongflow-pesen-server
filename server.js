require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const { Pool } = require('pg')
const cors = require('cors')
const app = express()
const crypto = require('crypto')

const whitelist = ['https://fuzun-adminto-client.onrender.com', 'http://localhost:5174']
const corsOptions = {
    // origin: function (origin, callback) {
    //     if (whitelist.indexOf(origin) !== -1 || !origin) {
    //         callback(null, true)
    //     } else {
    //         callback(new Error('Not allowed by CORS'))
    //     }
    // }
    origin: '*',
    methods: 'GET,PATCH,POST,DELETE,PUT',
    preflightContinue: false,
    optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET

// Register a new user
app.post('/user/register', async (req, res) => {
    try {
        const { Username, Password, Email, UserType } = req.body

        // Hash the password
        if (!Password) {
            return res.status(400).json({ error: 'Password not provided' })
        }
        const hashedPassword = await bcrypt.hash(Password, 10)

        const result = await pool.query('INSERT INTO "User" (Username, PasswordHash, Email, UserType) VALUES ($1, $2, $3, $4) RETURNING UserID', [
            Username,
            hashedPassword,
            Email,
            UserType
        ])

        res.status(201).json({ UserID: result.rows[0].UserID })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/user/login', async (req, res) => {
    try {
        const { Username, Password } = req.body

        if (!Username || !Password) {
            return res.status(400).json({ error: 'Username and Password are required' })
        }

        const user = await pool.query('SELECT userid, passwordhash FROM "User" WHERE username = $1', [Username])

        console.log('Query Result:', user.rows[0]) // Inspect full query result

        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' })
        }

        // Additional logging to inspect values
        console.log('Provided Password:', Password)
        console.log('Stored PasswordHash:', user.rows[0].passwordhash)

        if (await bcrypt.compare(Password, user.rows[0].passwordhash)) {
            const token = jwt.sign({ userid: user.rows[0].userid }, JWT_SECRET, { expiresIn: '1h' })
            res.json({ token, userid: user.rows[0].userid })
        } else {
            return res.status(401).json({ error: 'Incorrect password' })
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get a user by ID
app.get('/user/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT UserID, Username, Email, UserType, DateCreated, DateLastLogin FROM "User" WHERE UserID = $1', [
            req.params.id
        ])
        res.json(result.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update a user by ID
app.put('/user/:id', async (req, res) => {
    try {
        const { Username, Email, UserType } = req.body
        await pool.query('UPDATE "User" SET Username = $1, Email = $2, UserType = $3 WHERE UserID = $4', [Username, Email, UserType, req.params.id])
        res.json({ message: 'User updated successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Delete a user by ID
app.delete('/user/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM "User" WHERE UserID = $1', [req.params.id])
        res.json({ message: 'User deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Create a new proforma invoice
app.post('/invoice', async (req, res) => {
    try {
        const { UserID, CompanyName, CustomerName, Price, PaymentDate } = req.body

        const result = await pool.query(
            'INSERT INTO ProformaInvoice (UserID, CompanyName, CustomerName, Price, PaymentDate) VALUES ($1, $2, $3, $4, $5) RETURNING InvoiceID',
            [UserID, CompanyName, CustomerName, Price, PaymentDate]
        )

        res.status(201).json({ InvoiceID: result.rows[0].InvoiceID })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Get a proforma invoice by its ID
app.get('/invoice/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT InvoiceID, UserID, CompanyName, CustomerName, Price, PaymentDate, DateCreated FROM ProformaInvoice WHERE InvoiceID = $1',
            [req.params.id]
        )
        res.json(result.rows[0])
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update a proforma invoice by its ID
app.put('/invoice/:id', async (req, res) => {
    try {
        const { CompanyName, CustomerName, Price, PaymentDate } = req.body

        await pool.query('UPDATE ProformaInvoice SET CompanyName = $1, CustomerName = $2, Price = $3, PaymentDate = $4 WHERE InvoiceID = $5', [
            CompanyName,
            CustomerName,
            Price,
            PaymentDate,
            req.params.id
        ])

        res.json({ message: 'Invoice updated successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Delete a proforma invoice by its ID
app.delete('/invoice/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM ProformaInvoice WHERE InvoiceID = $1', [req.params.id])
        res.json({ message: 'Invoice deleted successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

const nodemailer = require('nodemailer')

// Config for nodemailer (this is a generic setup, adjust based on your email service)
const transporter = nodemailer.createTransport({
    service: 'your-email-service', // e.g., 'gmail'
    auth: {
        user: 'your-email@example.com',
        pass: 'your-email-password'
    }
})

// Handle request for password reset
app.post('/request-password-reset', async (req, res) => {
    try {
        const { Email } = req.body

        // Check if user exists with the provided email
        const user = await pool.query('SELECT UserID FROM "User" WHERE Email = $1', [Email])
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'No user found with the provided email.' })
        }

        // Generate a secure reset token and set its expiration time (e.g., 1 hour from now)
        const ResetToken = crypto.randomBytes(20).toString('hex')
        const DateExpired = new Date()
        DateExpired.setHours(DateExpired.getHours() + 1)

        // Save the reset token in the database
        await pool.query('INSERT INTO PasswordResetToken (UserID, ResetToken, DateExpired) VALUES ($1, $2, $3)', [
            user.rows[0].UserID,
            ResetToken,
            DateExpired
        ])

        // Send an email to the user with the reset link containing the token
        const resetLink = `https://your-frontend-url/reset-password?token=${ResetToken}`
        const mailOptions = {
            from: 'your-email@example.com',
            to: Email,
            subject: 'Password Reset Request',
            text: `You have requested to reset your password. Click on the link to reset: ${resetLink}`
        }
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error)
                return res.status(500).json({ error: 'Error sending reset email.' })
            }
            res.json({ message: 'Password reset email sent.' })
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Handle the actual password reset using the provided token
app.post('/reset-password', async (req, res) => {
    try {
        const { ResetToken, NewPassword } = req.body

        // Retrieve the token record from the database
        const tokenRecord = await pool.query('SELECT UserID, DateExpired FROM PasswordResetToken WHERE ResetToken = $1', [ResetToken])
        if (tokenRecord.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired reset token.' })
        }

        // Check if the token has expired
        const currentDate = new Date()
        if (currentDate > tokenRecord.rows[0].DateExpired) {
            return res.status(400).json({ error: 'The reset token has expired.' })
        }

        // Hash the new password and update the user's password in the database
        const hashedPassword = await bcrypt.hash(NewPassword, 10)
        await pool.query('UPDATE "User" SET PasswordHash = $1 WHERE UserID = $2', [hashedPassword, tokenRecord.rows[0].UserID])

        // Delete the token from the database to ensure it can't be used again
        await pool.query('DELETE FROM PasswordResetToken WHERE ResetToken = $1', [ResetToken])

        res.json({ message: 'Password reset successfully.' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

const SECRET_KEY = 'your_secret_key' // This should be a strong secret key, ideally stored in environment variables

// User login endpoint
app.post('/login', async (req, res) => {
    try {
        const { Username, Password } = req.body

        // Validate user credentials
        const user = await pool.query('SELECT userid, passwordhash FROM "User" WHERE username = $1', [Username])
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid username or password.' })
        }

        const validPassword = await bcrypt.compare(Password, user.rows[0].passwordhash)
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password.' })
        }

        // Generate JWT token
        const token = jwt.sign({ UserID: user.rows[0].UserID }, SECRET_KEY, { expiresIn: '1h' })

        // Save the token in the UserSession table with an expiry
        const DateExpired = new Date()
        DateExpired.setHours(DateExpired.getHours() + 1)
        await pool.query('INSERT INTO UserSession (UserID, SessionToken, DateExpired) VALUES ($1, $2, $3)', [user.rows[0].UserID, token, DateExpired])

        res.json({ token, userid: user.rows[0].userid }) // Send the token to the client
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ error: 'Token not provided.' })
    }

    jwt.verify(token, SECRET_KEY, async (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token.' })
        }

        // Check if token is in UserSession table and not expired
        const session = await pool.query('SELECT SessionID FROM UserSession WHERE SessionToken = $1 AND DateExpired > NOW()', [token])
        if (session.rows.length === 0) {
            return res.status(403).json({ error: 'Session expired or not found.' })
        }

        req.user = user // Set the user data on the request object
        next() // Continue to the next middleware or route handler
    })
}

// Sample authenticated route
app.get('/dashboard', authenticateToken, (req, res) => {
    // This route is protected. Only users with valid tokens can access it.
    // You can access the user data from req.user
    res.json({ message: `Welcome to the dashboard, User ID: ${req.user.UserID}` })
})

app.post('/user/logout', authenticateToken, async (req, res) => {
    try {
        // Remove the session from the UserSession table
        await pool.query('DELETE FROM UserSession WHERE SessionToken = $1', [req.headers['authorization'].split(' ')[1]])
        res.json({ message: 'Logged out successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/user/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body
        const user = await pool.query('SELECT UserID FROM "User" WHERE Email = $1', [email])
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' })
        }

        const resetToken = crypto.randomBytes(20).toString('hex')
        const dateExpired = new Date()
        dateExpired.setHours(dateExpired.getHours() + 1)

        await pool.query('INSERT INTO PasswordResetToken (UserID, ResetToken, DateExpired) VALUES ($1, $2, $3)', [
            user.rows[0].UserID,
            resetToken,
            dateExpired
        ])

        // Send the resetToken to the user's email. You'll need to implement this with nodemailer or another service.
        // ...

        res.json({ message: 'Password reset link sent to email' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/user/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body
        const tokenData = await pool.query('SELECT UserID FROM PasswordResetToken WHERE ResetToken = $1 AND DateExpired > NOW()', [resetToken])

        if (tokenData.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' })
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await pool.query('UPDATE "User" SET PasswordHash = $1 WHERE UserID = $2', [hashedPassword, tokenData.rows[0].UserID])

        // Optionally, remove the used token
        await pool.query('DELETE FROM PasswordResetToken WHERE ResetToken = $1', [resetToken])

        res.json({ message: 'Password reset successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/user/logout', authenticateToken, async (req, res) => {
    try {
        // Remove the session from the UserSession table
        await pool.query('DELETE FROM UserSession WHERE SessionToken = $1', [req.headers['authorization'].split(' ')[1]])
        res.json({ message: 'Logged out successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/invoice', authenticateToken, async (req, res) => {
    try {
        const { companyName, customerName, price, paymentDate } = req.body
        const userId = req.user.UserID // Assuming your JWT contains the UserID

        await pool.query('INSERT INTO ProformaInvoice (UserID, CompanyName, CustomerName, Price, PaymentDate) VALUES ($1, $2, $3, $4, $5)', [
            userId,
            companyName,
            customerName,
            price,
            paymentDate
        ])

        res.status(201).json({ message: 'Invoice created successfully' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Setting the server to listen on port 4001
app.listen(4001, () => {
    console.log('Server running on port 4001')
})

// Endpoint to save a product with its attributes, values, default price, and extra prices
app.post('/api/saveProduct', async (req, res) => {
    const { productName, defaultPrice, defaultCurrency, attributes, userid } = req.body
    console.log('backend Received userid:', userid)

    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        // Fetch currency_id for the given currency_code
        let currencyResult = await client.query('SELECT currency_id FROM Currency WHERE currency_code = $1', [defaultCurrency])
        let currencyId
        if (currencyResult.rowCount === 0) {
            // If currency code does not exist, insert it
            const insertCurrencyResult = await client.query('INSERT INTO Currency(currency_code) VALUES($1) RETURNING currency_id', [defaultCurrency])
            currencyId = insertCurrencyResult.rows[0].currency_id
        } else {
            currencyId = currencyResult.rows[0].currency_id
        }

        // Insert product
        const productResult = await client.query('INSERT INTO product(product_name, userid) VALUES($1, $2) RETURNING product_id', [
            productName,
            userid
        ])
        const productId = productResult.rows[0].product_id

        // Insert default price for the product using the fetched or inserted currencyId
        await client.query('INSERT INTO ProductDefaultPrice(product_id, currency_id, default_price) VALUES($1, $2, $3)', [
            productId,
            currencyId,
            defaultPrice
        ])

        for (let attr of attributes) {
            let attributeResult = await client.query('SELECT attribute_id FROM attribute WHERE attribute_name = $1 AND product_id = $2', [
                attr.name,
                productId
            ])
            let attributeId
            if (attributeResult.rowCount === 0) {
                attributeResult = await client.query('INSERT INTO attribute(attribute_name, product_id) VALUES($1, $2) RETURNING attribute_id', [
                    attr.name,
                    productId
                ])
                attributeId = attributeResult.rows[0].attribute_id
            } else {
                attributeId = attributeResult.rows[0].attribute_id
            }

            for (let value of attr.values) {
                if (value.name) {
                    // Only insert if name is not empty
                    const valueResult = await client.query(
                        'INSERT INTO value(product_id, attribute_id, value) VALUES($1, $2, $3) RETURNING value_id',
                        [productId, attributeId, value.name]
                    )
                    const valueId = valueResult.rows[0].value_id

                    // If extraPrice is empty or not provided, set it to 0
                    const extraPrice = value.extraPrice || '0'
                    await client.query('INSERT INTO AttributeValueExtraPrice(value_id, currency_id, extra_price) VALUES($1, $2, $3)', [
                        valueId,
                        currencyId,
                        extraPrice
                    ])
                }
            }
        }

        await client.query('COMMIT')
        res.status(200).json({ message: 'Product saved successfully' })
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Error saving product:', error)
        res.status(500).json({ error: 'Internal server error' })
    } finally {
        client.release()
    }
})

// Get products for a specific user
app.get('/api/getUserProducts', async (req, res) => {
    try {
        const { userid } = req.query
        if (!userid) {
            return res.status(400).json({ error: 'User ID is required.' })
        }

        const result = await pool.query('SELECT * FROM "product" WHERE userid = $1', [userid])
        res.status(200).json(result.rows)
    } catch (error) {
        console.error('Detailed error:', error)
        res.status(500).json({ error: error.message })
    }
})

// Create a new customer
app.post('/customer/add', async (req, res) => {
    try {
        const { userid, customername, companyname, email, phone, address } = req.body

        if (!userid || !customername || !email || !phone) {
            return res.status(400).json({ error: 'Required fields: userid, customername, email, phone' })
        }

        const result = await pool.query(
            'INSERT INTO "customer" (userid, customername, companyname, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING customerid',
            [userid, customername, companyname, email, phone, address]
        )

        res.status(201).json({ CustomerID: result.rows[0].customerid })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Fetch user's customers based on userid
app.get('/api/getUserCustomers', async (req, res) => {
    const { userid } = req.query
    if (!userid) {
        return res.status(400).json({ error: 'UserID is required' })
    }

    try {
        const result = await pool.query('SELECT * FROM "customer" WHERE userid = $1', [userid])
        res.status(200).json(result.rows)
    } catch (error) {
        console.error('Detailed error:', error)
        res.status(500).json({ error: error.message })
    }
})

// Fetch user's orders based on userid
app.get('/api/getUserOrders', async (req, res) => {
    console.log("API Endpoint '/api/getUserOrders' hit") // Log API invocation

    const { userid } = req.query
    console.log('Received userid:', userid) // Log received userid

    if (!userid) {
        console.log('Error: UserID not provided') // Log error for missing userid
        return res.status(400).json({ error: 'UserID is required' })
    }

    try {
        const result = await pool.query('SELECT * FROM "orders" WHERE userid = $1', [userid])

        console.log('Query result:', result.rows) // Log the query result
        res.status(200).json(result.rows)
    } catch (error) {
        console.error('Detailed error:', error) // Log detailed error
        res.status(500).json({ error: error.message })
    }
})

app.get('/api/getProductDetails', async (req, res) => {
    try {
        const productId = req.query.product_id

        // Fetch product details
        const product = await pool.query('SELECT * FROM "product" WHERE product_id = $1', [productId])

        // Fetch attributes and their associated values
        const attributesAndValuesQuery = await pool.query(
            `
            SELECT a.attribute_name, v.value, v.value_id
            FROM "attribute" a
            JOIN "value" v ON a.attribute_id = v.attribute_id
            WHERE a.product_id = $1
        `,
            [productId]
        )

        // Fetch the default product price
        const defaultPriceQuery = await pool.query(
            `
            SELECT p.default_price, c.currency_code
            FROM productdefaultprice p
            JOIN currency c ON p.currency_id = c.currency_id
            WHERE p.product_id = $1
            ORDER BY p.date_created DESC LIMIT 1

        `,
            [productId]
        )

        const attributesWithExtraPrice = []
        for (let row of attributesAndValuesQuery.rows) {
            const extraPriceQuery = await pool.query(
                `
                SELECT e.extra_price, c.currency_code
                FROM attributevalueextraprice e
                JOIN currency c ON e.currency_id = c.currency_id
                WHERE e.value_id = $1
                ORDER BY e.date_created DESC LIMIT 1

            `,
                [row.value_id]
            )

            const extraPriceData = extraPriceQuery.rows[0]
            attributesWithExtraPrice.push({
                attribute_name: row.attribute_name,
                value: row.value,
                extraPrice: extraPriceData ? extraPriceData.extra_price : null,
                currency_code: extraPriceData ? extraPriceData.currency_code : null
            })
        }

        // Combine all details into a single object
        const productDetails = {
            ...product.rows[0],
            default_price: defaultPriceQuery.rows[0].default_price,
            currency_code: defaultPriceQuery.rows[0].currency_code,
            attributes: attributesWithExtraPrice
        }

        res.status(200).json(productDetails)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

app.post('/api/saveOrdersTable', async (req, res) => {
    try {
        const {
            userid,
            customer_id,
            currency_id,
            order_status,
            order_date,
            order_number,
            product_name,
            quantity,
            price_per_quantity,
            subtotal,
            tax_rate,
            total_with_tax,
            order_details
        } = req.body

        // Enhanced Validation
        if (!userid) return res.status(400).json({ error: 'User ID is missing or invalid' })
        if (!customer_id) return res.status(400).json({ error: 'Customer ID is missing or invalid' })
        if (!currency_id) return res.status(400).json({ error: 'Currency ID is missing or invalid' })
        if (!order_status) return res.status(400).json({ error: 'Order status is required' })
        if (!order_number) return res.status(400).json({ error: 'Order number is required' })
        if (!product_name) return res.status(400).json({ error: 'Product name is required' })
        if (!quantity) return res.status(400).json({ error: 'Quantity is required' })
        if (!price_per_quantity) return res.status(400).json({ error: 'Price per quantity is required' })
        if (!subtotal) return res.status(400).json({ error: 'Subtotal is required' })
        if (!tax_rate) return res.status(400).json({ error: 'Tax rate is required' })
        if (!total_with_tax) return res.status(400).json({ error: 'Total with tax is required' })
        if (!order_details) return res.status(400).json({ error: 'Order details are required' })

        // Additional Validations (if needed, based on data types or constraints)
        if (typeof userid !== 'number') return res.status(400).json({ error: 'User ID must be a number' })
        // ... (similar validations for other fields)

        const result = await pool.query(
            `INSERT INTO orders (userid, customer_id, currency_id, order_status, order_date, order_number, 
                                 product_name, quantity, price_per_quantity, subtotal, tax_rate, 
                                 total_with_tax, order_details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING order_id`,
            [
                userid,
                customer_id,
                currency_id,
                order_status,
                order_date,
                order_number,
                product_name,
                quantity,
                price_per_quantity,
                subtotal,
                tax_rate,
                total_with_tax,
                order_details
            ]
        )

        res.status(201).json({ OrderID: result.rows[0].order_id })
    } catch (error) {
        console.error('Error processing /api/saveOrdersTable request:', error) // Server-side logging

        // Database Error Handling
        switch (error.code) {
            case '23505':
                res.status(409).json({ error: 'Order with this order_number already exists' })
                break
            case '23503':
                res.status(400).json({ error: 'Foreign key violation: Check your references for userid, customer_id, and currency_id' })
                break
            default:
                res.status(500).json({ error: 'An internal server error occurred. Please contact support.' })
        }
    }
})

app.put('/api/updateOrderStatus', async (req, res) => {
    const { order_id, order_status } = req.body

    // Basic validations
    if (!order_id) return res.status(400).json({ error: 'Order ID is required' })
    if (!order_status) return res.status(400).json({ error: 'Order status is required' })

    // Additional Validations based on data types or constraints
    if (typeof order_id !== 'number') return res.status(400).json({ error: 'Order ID must be a number' })
    if (typeof order_status !== 'string') return res.status(400).json({ error: 'Order status must be a string' })

    try {
        const result = await pool.query('UPDATE orders SET order_status = $1 WHERE order_id = $2 RETURNING order_id', [order_status, order_id])

        // Check if order ID exists and was updated
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No order found with the provided order ID' })
        }

        res.status(200).json({ message: 'Order status updated successfully', order_id: result.rows[0].order_id })
    } catch (error) {
        console.error('Error processing /api/updateOrderStatus request:', error) // Server-side logging

        // Database Error Handling
        switch (error.code) {
            case '23503':
                res.status(400).json({ error: 'Foreign key violation: Check your references for order_id' })
                break
            default:
                res.status(500).json({ error: 'An internal server error occurred. Please contact support.' })
        }
    }
})
