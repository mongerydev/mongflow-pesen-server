const httpStatus = require("http-status/lib");
const {
  insert,
  getAll,
  update,
  del,
  insertContact,
  getDateRangeContacts,
  updateContact,
  delContact,
} = require("../services/Customers");
const create = async (req, res) => {
  insert({ userid: req.user.userid, ...req.body })
    .then(({ rows }) => {
      global.socketio.emit("notification", {
        type: "add_customer",
        customer: rows[0],
        userid: req.user.userid,
      });
      res.status(httpStatus.CREATED).send(rows[0]);
    })
    .catch(() =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e.message })
    );
};

const createContact = async (req, res) => {
  try {
    insertContact({ ...req.body })
      .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
      .catch((e) =>
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e.message })
      );
  } catch (err) {
    console.log(err);
  }
};

const get = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAll(client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const getContacts = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getDateRangeContacts({ ...req.query }, client);
    res.status(httpStatus.OK).send(rows);
  } catch (e) {
    console.error(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const put = (req, res) => {
  update({ customerid: req.params.id, ...req.body })
    .then(({ rows }) => {
      global.socketio.emit("notification", {
        type: "update_customer",
        customer: rows[0],
        userid: req.user.userid,
      });
      res.status(httpStatus.OK).send(rows[0]);
    })
    .catch((err) => {
      console.log(err);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const putContact = (req, res) => {
  updateContact({ id: req.params.id, ...req.body })
    .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
    .catch((e) => {
      console.log(e);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: e.message });
    });
};
const remove = (req, res) => {
  del(req.params.id)
    .then(({ rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      res
        .status(httpStatus.OK)
        .send({ message: "Customer deleted successfully." });
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const removeContact = (req, res) => {
  delContact(req.params.id)
    .then(({ rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      res
        .status(httpStatus.OK)
        .send({ message: "Customer deleted successfully." });
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

module.exports = {
  create,
  get,
  put,
  remove,
  createContact,
  getContacts,
  putContact,
  removeContact,
};
