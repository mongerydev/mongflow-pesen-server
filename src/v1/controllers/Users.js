const httpStatus = require("http-status/lib");
const {
  findOne,
  insert,
  loginUser,
  del,
  update,
  _changePhoto,
  _changePassword,
  getAll,
  _changeUserType,
} = require("../services/Users");
const {
  passwordToHash,
  generateAccessToken,
  generateRefreshToken,
  passwordHashCompare,
} = require("../scripts/utils/helper");

const verify = async (req, res) => {
  const client = await process.pool.connect();
  try {
    const { rows } = await findOne(req.user.userid, client);

    console.log("rows here", rows, req.user.userid);
    if (!rows[0]) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    const user = { ...rows[0] };
    delete user.passwordhash;

    res.status(httpStatus.OK).send(user);
  } catch (err) {
    console.log(err);
  } finally {
    client.release();
  }
};

const create = async (req, res) => {
  insert({
    ...req.body,
    hashedPassword: await passwordToHash(req.body.Password),
  })
    .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
    .catch((e) => {
      if (e.constraint === "unique_username")
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ error: "Username already exists" });
      if (e.constraint === "unique_email")
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({ error: "Email already exists" });
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
    });
};

const login = async (req, res) => {
  try {
    const { Username, Password } = req.body;
    if (!Username || !Password) {
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Invalid input data. Username and Password are required.",
      });
    }

    const { rows } = await loginUser(Username);
    if (!rows[0]) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "User not found." });
    }
    console.log("rows[0] ın içinde şunlar var:", rows[0]);
    const hashedPassword = await passwordHashCompare(
      Password,
      rows[0].passwordhash
    );
    if (hashedPassword) {
      const user = { ...rows[0] };
      delete user.photo;
      delete user.passwordhash;
      user.tokens = {
        access_token: generateAccessToken(user),
        refresh_token: generateRefreshToken(user),
      };
      user.photo = rows[0].photo;
      return res.status(httpStatus.OK).send(user);
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .send({ error: "Incorrect password" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "Internal server error" });
  }
};

const put = (req, res) => {
  update({ userid: req.user.userid, ...req.body })
    .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

const remove = (req, res) => {
  del(req.user.userid)
    .then(({ rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      res.status(httpStatus.OK).send({ message: "User deleted successfully." });
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const changePhoto = (req, res) => {
  _changePhoto({ userid: req.user.userid, ...req.body })
    .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

const changePassword = (req, res) => {
  findOne(req.user.userid)
    .then(async ({ rows }) => {
      if (!rows[0])
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      const user = { ...rows[0] };
      const hashedPasswordCompare = await passwordHashCompare(
        req.body.oldPassword,
        user.passwordhash
      );

      if (hashedPasswordCompare) {
        if (req.body.newPassword !== req.body.newPasswordAgain)
          return res.status(httpStatus.BAD_REQUEST).send({
            error: "New password and new password must be the same again.",
          });

        const passwordhash = await passwordToHash(req.body.newPassword);

        try {
          await _changePassword({ userid: req.user.userid, passwordhash });
          return res
            .status(httpStatus.CREATED)
            .send({ message: "The password has been changed successfully." });
        } catch (e) {
          return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .send({ error: e });
        }
      }

      res
        .status(httpStatus.BAD_REQUEST)
        .send({ error: "Old password is wrong." });
    })
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

const get = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await getAll(req.user.userid, client);
    res.status(httpStatus.OK).send(
      rows.map((user) => ({
        userid: user.userid,
        username: user.username,
        email: user.email,
        usertype: user.usertype,
        fullname: user.fullname,
      }))
    );
  } catch (e) {
    console.error(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const changeUserType = (req, res) => {
  _changeUserType({ userid: req.params.userid, ...req.body })
    .then(({ rows }) => res.status(httpStatus.ACCEPTED).send(rows[0]))
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

module.exports = {
  verify,
  get,
  login,
  create,
  put,
  remove,
  changePhoto,
  changePassword,
  changeUserType,
};
