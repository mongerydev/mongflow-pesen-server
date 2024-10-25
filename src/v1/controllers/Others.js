const httpStatus = require('http-status/lib')
const request = require('request')

const getExchangeRates = async (req, res) => {
    const tcmbURL = 'https://www.tcmb.gov.tr/kurlar/today.xml'
    request(tcmbURL, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            return res.status(httpStatus.OK).send(body)
        }

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error })
    })
}

module.exports = {
    getExchangeRates
}
