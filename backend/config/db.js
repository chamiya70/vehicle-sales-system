const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;TrustServerCertificate=Yes;`;

const poolPromise = new sql.ConnectionPool({
  connectionString,
})
  .connect()
  .then((pool) => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch((err) => {
    console.error("Database Connection Failed:", err);
  });

module.exports = {
  sql,
  poolPromise,
};