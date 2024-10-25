const moment = require("moment");
const httpStatus = require("http-status/lib");
const dayjs = require("dayjs");
const {
  _getExpenses,
  _getClasses,
  _getItems,
  _createItem,
  _createExpense,
  _updateExpense,
  checkExistingItem,
  _updateExpenseItemFrequency,
  getExpensesByItem,
  _patchExpense,
  _patchExpenseItem,
  _delExpense,
  _delExpenseItem,
  getExpenseById,
  getExpenseItemById,
  checkExistingClass,
  _editClass,
  _createClass,
  _delClass,
} = require("../services/Expenses");
const getExpenses = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await _getExpenses(client);
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

const getClasses = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await _getClasses(client);
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

const getItems = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { rows } = await _getItems(client);
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

const createItem = async (req, res) => {
  const existingItem = await checkExistingItem(req.body.name);
  if (existingItem) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ error: "errorexistingitem" });
  }
  _createItem({ ...req.body })
    .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
    .catch((e) => {
      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const createExpense = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const data = req.body;
    await client.query("BEGIN");
    let newExpense;
    let updatedExpense = null;
    const { rows: expenses } = await getExpensesByItem(data.item_id, client);

    if (data.is_fixed) {
      if (expenses.length === 0) {
        const { rows } = await _createExpense(data, client);
        newExpense = rows[0];
      } else {
        const isDatesOverLapped = expenses.find((ex) => {
          const recStartDate = new Date(
            dayjs(ex.start_date).format("YYYY-MM-DD")
          ).getTime();
          let recEndDate = null;
          if (ex.end_date) {
            recEndDate = new Date(
              dayjs(ex.end_date).format("YYYY-MM-DD")
            ).getTime();
          }

          const dataStartDate = new Date(data.start_date).getTime();
          const isOverlapping =
            (dataStartDate >= recStartDate && dataStartDate <= recEndDate) ||
            dataStartDate === recStartDate ||
            dataStartDate === recEndDate;

          return isOverlapping;
        });

        if (isDatesOverLapped) {
          throw new Error("overlapped_expense");
        }
        // Condition 2
        let latestEntry = expenses
          .filter((e) => e.item_id === parseInt(data.item_id))
          ?.reduce(
            (latest, entry) =>
              !latest ||
              dayjs(entry.start_date).format("YYYY-MM-DD") >
                dayjs(latest.start_date).format("YYYY-MM-DD")
                ? entry
                : latest,
            null
          );
        if (
          latestEntry &&
          latestEntry.end_date === null &&
          dayjs(data.start_date).format("YYYY-MM-DD") >
            dayjs(latestEntry.start_date).format("YYYY-MM-DD")
        ) {
          let start_date_minus_one = new Date(data.start_date);
          start_date_minus_one.setDate(start_date_minus_one.getDate() - 1);

          const isPatchData = { end_date: start_date_minus_one };
          const { rows: patchedExpenses } = await _patchExpense(
            latestEntry.id,
            isPatchData,
            client
          );
          updatedExpense = patchedExpenses[0];
          const { rows: rows } = await _createExpense(data, client);
          newExpense = rows[0];
        } else {
          let oldestEntry = expenses
            .filter((e) => e.item_id === parseInt(data.item_id))
            ?.reduce(
              (oldest, entry) =>
                !oldest ||
                dayjs(entry.start_date).format("YYYY-MM-DD") <
                  dayjs(oldest.start_date).format("YYYY-MM-DD")
                  ? entry
                  : oldest,
              null
            );
          if (
            oldestEntry &&
            dayjs(data.start_date).format("YYYY-MM-DD") <
              dayjs(oldestEntry.start_date).format("YYYY-MM-DD")
          ) {
            let newData = {
              ...data,
              end_date: new Date(oldestEntry.start_date),
            };
            newData.end_date.setDate(newData.end_date.getDate() - 1);

            const { rows: rows } = await _createExpense(newData, client);
            newExpense = rows[0];
          } else {
            throw new Error("no_conditions_met");
          }
        }
      }
    } else {
      if (expenses?.length) {
        const isDatesOverLapped = expenses.find((ex) => {
          const recStartDate = new Date(
            dayjs(ex.start_date).format("YYYY-MM-DD")
          ).getTime();
          const recEndDate = new Date(
            dayjs(ex.end_date).format("YYYY-MM-DD")
          ).getTime();

          const dataStartDate = new Date(data.start_date).getTime();
          const dataEndDate = new Date(data.end_date).getTime();

          console.log(
            ex.start_date,
            ex.end_date,
            data.start_date,
            data.end_date
          );
          // Check if either dataStartDate or dataEndDate is between or equal to recStartDate and recEndDate
          const isOverlapping =
            (dataStartDate >= recStartDate && dataStartDate <= recEndDate) ||
            (dataEndDate >= recStartDate && dataEndDate <= recEndDate) ||
            (dataStartDate <= recStartDate && dataEndDate >= recEndDate) ||
            dataStartDate === recStartDate ||
            dataEndDate === recEndDate ||
            dataStartDate === recEndDate ||
            dataEndDate === recStartDate;

          return isOverlapping;
        });

        if (isDatesOverLapped) {
          throw new Error("overlapped_expense");
        }
      }

      const { rows } = await _createExpense(data, client);
      newExpense = rows[0];
    }

    await client.query("COMMIT");
    res.status(httpStatus.OK).send({ newExpense, updatedExpense });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    if (err.message === "duplicate_expense")
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Zaten bu tarih başlangıcında gider eklenmiş.",
      });
    if (err.message === "overlapped_expense")
      return res.status(httpStatus.BAD_REQUEST).send({
        error:
          "Hata! Tarihler Çakışıyor, geçmiş gider tarihlerini kontrol edin.",
      });
    if (err.message === "no_conditions_met")
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Eksik Kontrol.",
      });
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    client.release();
  }
};

const updateExpense = async (req, res) => {
  _updateExpense(req.body)
    .then(({ rows }) => {
      return res.status(httpStatus.OK).send(rows[0]);
    })
    .catch((e) => {
      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const updateExpenseItemFrequency = async (req, res) => {
  _updateExpenseItemFrequency(req.body)
    .then(({ rows }) => {
      return res.status(httpStatus.OK).send(rows[0]);
    })
    .catch((e) => {
      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const patchExpenseItem = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    const { id, ...data } = req.body;
    const userid = req.user.userid;
    console.log("req.body", req.body);
    let updatedExpense;
    let updatedExpenseItem;
    let newExpense;

    const { rows: expensesByItem } = await getExpensesByItem(id, client);

    // if(expensesByItem.length){
    const { rows: expensesItems } = await getExpenseItemById(id, client);
    const expenseItem = expensesItems[0];
    console.log("expenseItem", expenseItem);

    const latestExpense = expensesByItem?.reduce(
      (latest, entry) =>
        !latest ||
        dayjs(entry.start_date).format("YYYY-MM-DD") >
          dayjs(latest.start_date).format("YYYY-MM-DD")
          ? entry
          : latest,
      null
    );
    if (expenseItem?.is_fixed && data.is_fixed === false) {
      //sabit to değişken
      if (expensesByItem.length) {
        const todayDate = dayjs(new Date()).format("YYYY-MM-DD");
        if (latestExpense.end_date === null) {
          const patchExpenseData = {
            end_date: todayDate,
          };
          const { rows } = await _patchExpense(
            latestExpense.id,
            patchExpenseData,
            client
          );
          updatedExpense = rows[0];
        } else {
          console.log("else 301 latestExpense.end_date is not null ");
        }

        const { rows } = await _patchExpenseItem(id, data, client);
        updatedExpenseItem = rows[0];
        console.log("303 rows", rows);
      } else {
        const { rows } = await _patchExpenseItem(id, data, client);
        updatedExpenseItem = rows[0];
        console.log("307 rows", rows);
      }
    } else if (data.is_fixed && !expenseItem?.is_fixed) {
      // değişken to sabit
      if (expensesByItem.length) {
        const start_date = new Date(latestExpense.end_date);
        start_date.setDate(start_date.getDate() + 1);

        const expenseData = {
          ...data,
          start_date: start_date,
          end_date: null,
          item_id: id,
          daily_usd_amount: data.amount / data.frequency / data.usd_rate,
          created_by: userid,
        };
        const { rows } = await _createExpense(expenseData, client);
        newExpense = rows[0];

        const { amount, usd_rate, ...expenseItemData } = data;
        const { rows: expenseItems } = await _patchExpenseItem(
          id,
          expenseItemData,
          client
        );
        updatedExpenseItem = expenseItems[0];
      } else {
        const { rows } = await _patchExpenseItem(id, data, client);
        updatedExpenseItem = rows[0];
        console.log("326 rows", rows);
      }
    } else {
      const { rows } = await _patchExpenseItem(id, data, client);
      updatedExpenseItem = rows[0];
      console.log("332 rows", rows);
    }

    // }else{
    //   const { rows } = await _patchExpenseItem(id, data, client);
    //   updatedExpenseItem = rows[0];
    //   console.log("332 rows", rows);
    // }

    await client.query("COMMIT");
    res
      .status(httpStatus.OK)
      .send({ updatedExpenseItem, updatedExpense, newExpense });
  } catch (error) {
    console.error(error);
    if (client) {
      await client.query("ROLLBACK");
    }
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    if (client) {
      client.release();
    }
  }
};
const patchExpense = async (req, res) => {
  const client = await process.pool.connect();

  try {
    const { id, ...data } = req.body;
    let updatedExpense;

    const { rows: expensesByItem } = await getExpensesByItem(
      data.item_id,
      client
    );
    const { rows: expenses } = await getExpenseById(id, client);
    const expense = expenses[0];

    if (expense.is_fixed) {
      if (!data.is_fixed) {
        //sabit to değişken
        if (expensesByItem.length) {
        } else {
          const { rows } = await _patchExpense(id, data, client);

          updatedExpense = rows[0];
        }
      } else {
      }
    } else {
      if (data.is_fixed) {
        // değişken to sabit
      } else {
      }
    }

    await client.query("BEGIN");
    const { rows } = await _patchExpense(id, data, client);
    await client.query("COMMIT");
    res.status(httpStatus.OK).send(rows[0]);
  } catch (error) {
    console.error(error);
    if (client) {
      await client.query("ROLLBACK");
    }
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const delExpenseItem = async (req, res) => {
  const id = req.params.id;
  const client = await process.pool.connect();

  try {
    client.query("BEGIN");
    const { rows } = await _delExpenseItem(id, client);
    client.query("COMMIT");

    return res.status(httpStatus.OK).send(rows[0]);
  } catch (e) {
    console.error(e);
    if (e.code === "23503" && e.constraint === "expenses_item_id_fkey") {
      // Foreign key constraint violation error
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Bu gider kalemine ait geçmiş giderler bulunmaktadır.",
      });
    } else {
      // Other errors
      client.query("ROLLBACK");

      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
};
const delExpense = async (req, res) => {
  const id = req.params.id;
  const client = await process.pool.connect();

  try {
    let updatedExpense;
    client.query("BEGIN");
    const { rows: expenses } = await getExpenseById(id, client);
    const expense = expenses[0];

    const { rows: expensesByItem } = await getExpensesByItem(
      expense.item_id,
      client
    );

    if (
      expense.is_fixed &&
      expense.end_date === null &&
      expensesByItem.length > 1
    ) {
      const latestExpense = expensesByItem
        .filter((eb) => eb.id !== expense.id)
        .reduce(
          (latest, entry) =>
            !latest ||
            dayjs(entry.start_date).format("YYYY-MM-DD") >
              dayjs(latest.start_date).format("YYYY-MM-DD")
              ? entry
              : latest,
          null
        );
      const { rows } = await _patchExpense(
        latestExpense.id,
        { end_date: null },
        client
      );
      updatedExpense = rows[0];
    }
    const { rows } = await _delExpense(id, client);
    console.log("468 rows", rows);
    client.query("COMMIT");
    return res.status(httpStatus.OK).send({ updatedExpense, deleted: rows[0] });
  } catch (e) {
    console.error(e);
    if (client) {
      client.query("ROLLBACK");
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getSummary = async (req, res) => {
  const client = await process.pool.connect();

  try {
    client.query("BEGIN");

    const { rows: expenses } = await _getExpenses(client);
    client.query("COMMIT");
    const yearlyExpenses = {};

    expenses.forEach((expense) => {
      const startDate = moment(expense.start_date);
      const endDate = moment(expense.end_date ?? new Date());

      for (
        let m = moment(startDate);
        m.isSameOrBefore(endDate);
        m.add(1, "days")
      ) {
        const year = m.format("YYYY");
        const month = m.format("MM");

        if (!yearlyExpenses[year]) {
          yearlyExpenses[year] = {};
        }
        if (!yearlyExpenses[year][month]) {
          yearlyExpenses[year][month] = 0;
        }

        yearlyExpenses[year][month] += expense.daily_usd_amount;
      }
    });

    return res.status(httpStatus.OK).send(yearlyExpenses);
  } catch (err) {
    console.error(err);
    if (client) {
      client.query("ROLLBACK");
    }
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const createClass = async (req, res) => {
  const data = req.body;
  console.log("data offf");
  const existingClass = await checkExistingClass(data.name);
  if (existingClass) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ error: "errorexistingclass" });
  }
  _createClass({ ...data })
    .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
    .catch((e) => {
      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};
const editClass = async (req, res) => {
  const data = req.body;
  const existingClass = await checkExistingClass(data.name);
  if (existingClass) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ error: "errorexistingclass" });
  }
  _editClass({ ...data })
    .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
    .catch((e) => {
      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const delClass = async (req, res) => {
  const id = req.params.id;
  const client = await process.pool.connect();

  try {
    client.query("BEGIN");
    const { rows, rowCount } = await _delClass(id, client);
    client.query("COMMIT");

    if (!rowCount) {
      await client.query("ROLLBACK");

      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Kategori bulunamadı.",
      });
    }

    return res.status(httpStatus.OK).send({ id: rows[0].id });
  } catch (e) {
    console.error(e);
    await client.query("ROLLBACK");
    if (e.code === "23503" && e.constraint === "prodcostitems_class_fkey") {
      // Foreign key constraint violation error
      return res.status(httpStatus.BAD_REQUEST).send({
        error: "Hata! Bu kategoriye ait gider kalemleri bulunmaktadır.",
      });
    } else {
      // Other errors

      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
};
module.exports = {
  getClasses,
  getExpenses,
  getItems,
  createItem,
  createExpense,
  updateExpense,
  updateExpenseItemFrequency,
  patchExpense,
  patchExpenseItem,
  delExpense,
  delExpenseItem,
  getSummary,
  createClass,
  editClass,
  delClass,
};
