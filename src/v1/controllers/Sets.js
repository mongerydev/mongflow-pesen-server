const httpStatus = require('http-status/lib')
const { del, update, insert, getAll } = require('../services/Sets')

const create = async (req, res) => {
    insert({ ...req.body })
        .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
        .catch((e) => {
            console.log(e)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' })
        })
}

const get = (req, res) => {
    getAll()
        .then(({ rows }) => res.status(httpStatus.OK).send(rows))
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

const put = async (req, res) => {
    update({ set_id: req.params.id, ...req.body })
        .then(({ rows, rowCount }) => {
            if (!rowCount) return res.status(httpStatus.BAD_REQUEST).send({ error: 'There is no such record.' })
            res.status(httpStatus.OK).send(rows[0])
        })
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error onccurred.' }))
}

const remove = async (req, res) => {
    del({ set_id: req.params.id })
        .then(({ rowCount }) => {
            if (!rowCount) return res.status(httpStatus.BAD_REQUEST).send({ error: 'There is no such record.' })
            res.status(httpStatus.OK).send({ message: 'Successfully' })
        })
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error onccurred.' }))
}

module.exports = {
    create,
    get,
    put,
    remove
}
