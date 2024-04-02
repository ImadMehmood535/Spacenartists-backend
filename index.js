const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const mysql = require("mysql");

const connection = mysql.createConnection({
  password: "AVNS_tKMBCKzlQwNcULMdXXa",
  database: "defaultdb",
  host: "db-mysql-nyc3-20784-do-user-15615777-0.c.db.ondigitalocean.com",
  user: "doadmin",
  port: "25060"
});

const app = express();
app.use(cors());
app.use(express.static(__dirname + "/public"));
const baseUrl = "/v1/api/";

//PORT
const PORT = process.env.PORT || 5200;

// create application/json parser
const jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(urlencodedParser);
app.use(jsonParser);

//Database Connection
connection.connect(function (err) {
  if (err) {
    console.log(err);
    console.error("Database Not Connected");
  } else {
    console.log("Database Connected");
  }
});

//Server Dev
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
  });
}

//All Routers Call
app.use(`${baseUrl}`, require("./routes/api/auth"));
app.use(`${baseUrl}admin`, require("./routes/api/admin"));
app.use(`${baseUrl}category`, require("./routes/api/category"));
app.use(`${baseUrl}subscribe`, require("./routes/api/subscribe"));
app.use(`${baseUrl}review`, require("./routes/api/review"));
app.use(`${baseUrl}`, require("./routes/api/location"));
app.use(`${baseUrl}payments`, require("./routes/api/payments"));

app.get("/", (req, res) => {
  res.status(200).send("Server Working");
});

app.listen(PORT, () =>
  console.log(`App listing to the port http://localhost:${PORT}`)
);

module.exports = PORT;
