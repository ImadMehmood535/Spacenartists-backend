const express = require("express");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const config = require("config");
// wekjfhkewjhkfjewhkh
const router = express.Router();
const connect = require("../../config/db");
const authAdmin = require("../../middleware/admin");
const privateHeader = require("../../middleware/privateHeader");
const userError = "Something went wrong. Please try again!";

//Validations Schema
const registerSchema = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().required(),
});
const loginSchema = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  password: Joi.string().min(6).required(),
});

//Register Admin
router.post("/sign-up", privateHeader, async (req, res) => {
  let { error } = registerSchema.validate(req.body);
  let admin = { email: req.body.email, password: null, role: req.body.role };
  if (!error) {
    try {
      connect.query(
        "SELECT * FROM admin WHERE email=?",
        req.body.email,
        async (error, result) => {
          if (!error && result.length < 1) {
            //Bcrypt password
            const salt = await bcrypt.genSalt();
            admin.password = await bcrypt.hash(req.body.password, salt);
            connect.query("INSERT INTO admin SET ?", admin, (error, result) => {
              if (!error && result.affectedRows > 0) {
                return res.status(200).send("Admin register successfully!");
              } else {
                return res.status(400).send("Email already exist!");
              }
            });
          } else {
            return res.status(400).send("Email already exist!");
          }
        }
      );
    } catch (error) {
      return res.status(500).send(userError);
    }
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Admin Login
router.post("/login", privateHeader, async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  const { email, password } = req.body;
  if (!error) {
    connect.query(
      "SELECT * FROM admin WHERE email=?",
      email,
      async (error, result) => {
        if (!error && result.length > 0) {
          const user = result;
          //Match the password before login
          const isMatch = await bcrypt.compare(password, user[0].password);
          if (!isMatch) {
            return res.status(400).send("Invalid Credentials");
          }

          //Return JwtToken
          const payload = {
            user: {
              id: user[0].id,
              password: user[0].password,
              role: user[0].role,
            },
          };

          jwt.sign(
            payload,
            config.get("jwtSecret"),
            { expiresIn: "10h" },
            (err, token) => {
              if (err) throw err;
              else {
                user[0].token = token;
                return res.send(user);
              }
            }
          );
        } else {
          console.log(error);
          return res.status(400).send("User not found");
        }
      }
    );
  } else {
    console.log(error);
    res.status(400).send(error.details[0].message);
  }
});

//Admin getAll
router.get("/all", async (req, res) => {
  const id = req.params.id;
  connect.query("SELECT * from users", (error, result) => {
    if (!error && result.length > 0) {
      let sql = "SELECT * FROM admin ORDER BY id DESC";
      connect.query(sql, id, (error, result) => {
        if (!error && result.length > 0) {
          return res.send(result);
        } else {
          return res.status(500).send(userError);
        }
      });
    }
  });
});

module.exports = router;
