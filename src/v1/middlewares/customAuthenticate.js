const httpStatus = require('http-status')

const customAuthenticate = (type) => {
    return (req, res, next) => {
        const type= req.user.usertype
        if (type === 'admin') if (req.user.usertype !== 'admin') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })
        if (type === 'boss') if (req.user.usertype !== 'boss') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })
        if (type === 'domestic_market_manager')
            if (req.user.usertype !== 'domestic_market_manager') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })
        if (type === 'foreign_market_manager')
            if (req.user.usertype !== 'foreign_market_manager') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })
        if (type === 'domestic_market_marketing')
            if (req.user.usertype !== 'domestic_market_marketing') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })
        if (type === 'foreign_market_marketing')
            if (req.user.usertype !== 'foreign_market_marketing') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })
        if (type === 'stock_manager')
            if (req.user.usertype !== 'stock_manager') return res.status(httpStatus.UNAUTHORIZED).send({ message: 'Unauthorized user' })

        next()
    }
}

module.exports = customAuthenticate
