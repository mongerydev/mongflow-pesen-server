const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const http = require("http");
const cron = require("node-cron");

const app = express();
const server = http.createServer(app);

require("./config")();
require("./loaders")(server);
const {
  UserRoutes,
  CustomerRoutes,
  ShiftRoutes,
  ProductRoutes,
  LastProductStockRoutes,
  RecipeMaterialsRoutes,
  RawMaterialsRoutes,
  RecipeRoutes,
  OrderRoutes,
  StockRoutes,
  StockLogRoutes,
  OtherRoutes,
  ProductionRoutes,
  SetRoutes,
  ExpensesRoutes,
  ShipmentRoutes,
  ConsumablesRoutes,
  SecondQualityProductsRoutes,
  PaymentRoutes,
  AppRoutes
} = require("./api-routes");

const port = process.env.APP_PORT || 4000;
app.set("port", port);
app.use(express.json({ limit: "2mb" }));
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: "GET,PATCH,POST,DELETE,PUT",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// bu sql deki clone_latest_expenses_row() fonksiyonu
// CREATE OR REPLACE FUNCTION clone_latest_expenses_row() RETURNS void AS $$BEGIN INSERT INTO expenses (saved_expenses, monthly_expenses, daily_expenses, hourly_expenses, monthly_cost, daily_cost, hourly_cost, date) SELECT saved_expenses,monthly_expenses, daily_expenses, hourly_expenses, monthly_cost, daily_cost, hourly_cost, NOW() AS date FROM expenses ORDER BY date DESC LIMIT 1;END; $$ LANGUAGE plpgsql;
// cron.schedule(
//   "57 9 5 2 *",
//   // "01 00 1 * *",
//   () => {
//     process.pool
//       .connect()
//       .then((client) => {
//         return client
//           .query("SELECT clone_latest_expenses_row()")
//           .then(() => {
//             console.log("Row cloned successfully on the second day at 09:48");
//             client.release(); // Release the client back to the pool
//           })
//           .catch((err) => {
//             console.error("Error cloning row on the second day at 09:48:", err);
//             client.release(); // Release the client back to the pool in case of an error
//           });
//       })
//       .catch((err) => {
//         console.error("Error connecting to the database:", err);
//       });
//   },
//   {
//     scheduled: true,
//     timezone: "Europe/Istanbul", // Set your timezone to Europe/Istanbul or 'EET'
//   }
// );

server.listen(port, () => {
  console.log(`The server is running on port ${port}...`);
  app.use("/user", UserRoutes);
  app.use("/customer", CustomerRoutes);
  app.use("/shift", ShiftRoutes);
  app.use("/shift/process", ShiftRoutes);
  app.use("/product", ProductRoutes);
  app.use("/recipe", RecipeRoutes);
  app.use("/stock/rawmaterial", RawMaterialsRoutes);
  app.use("/stock/recipematerial", RecipeMaterialsRoutes);
  app.use("/stock/consumable", ConsumablesRoutes);
  app.use("/stock/secondqualityproduct", SecondQualityProductsRoutes);
  app.use("/set", SetRoutes);
  app.use("/order", OrderRoutes);
  app.use("/stock", StockRoutes);
  app.use("/stocklog", StockLogRoutes);
  app.use("/stock/lastproduct", LastProductStockRoutes);
  app.use("/production", ProductionRoutes);
  app.use("/other", OtherRoutes);
  app.use("/expenses", ExpensesRoutes);
  app.use("/shipment", ShipmentRoutes);
  app.use("/payment", PaymentRoutes);
  app.use("/app", AppRoutes);

});
