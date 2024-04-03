const mysql = require("mysql");

const connection = mysql.createConnection({
  password: "admin",
  database: "defaultdb",
  host: "db-mysql-nyc3-20784-do-user-15615777-0.c.db.ondigitalocean.com",
  user: "doadmin",
  port: "25060",
});

module.exports = connection;
