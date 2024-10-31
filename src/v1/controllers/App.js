const httpStatus = require("http-status/lib");
const { _getApp } = require("../services/App");

const getApp = async (req, res) => {
  const client = await process.pool.connect();
  try {
    const { rows } = await _getApp(client);

    if (!rows[0]) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    const appData = { ...rows[0] };
   

    res.status(httpStatus.OK).send(appData);
  } catch (err) {
    console.log(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getApp,
};
