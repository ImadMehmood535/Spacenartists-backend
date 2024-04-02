const express = require("express");
const Joi = require("joi");

const router = express.Router();
const connect = require("../../config/db");
const auth = require("../../middleware/auth");
const authAdmin = require("../../middleware/admin");
const privateHeader = require("../../middleware/privateHeader");
const userError = "Something went wrong. Please try again!";

var telr = require("telr-nodejs")("WjvHt@5rVkM~trh6", "26107", {
  isTest: 1,
  currency: "AED",
});

//Validations Schema
const subscribeSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "ae"] } })
    .required(),
});

//Add Subscribe
router.post("/", async (req, res) => {
  const {
    email,
    phone,
    whatsapp,
    firstname,
    lastname,
    subscriptionDate,
    endDate,
    planDuration,
    planPrice,
    statusSubscribe,
  } = req.body;

  try {
    const myRnId = () => parseInt(Date.now() * Math.random());
    var transactionId = myRnId();
    let payment = {
      transactionId,
      email,
      phone,
      whatsapp,
      firstname,
      lastname,
      subscriptionDate,
      endDate,
      planDuration,
      planPrice,
      statusSubscribe,
    };
    telr.order(
      {
        orderId: myRnId(),
        amount: req.body.planPrice,
        returnUrl: "https://spacenartists.com/confirmsubscription",
        declineUrl: "http://localhost:3000/declinePayment",
        cancelUrl: "http://url-to-call-in-cancel-transaction.com",
        description: "User Subscriptions",
      },
      (err, response) => {
        console.log(response);
        connect.query(
          "INSERT INTO payments SET ?",
          payment,
          (error, results) => {
            if (!error && results.affectedRows > 0) {
              connect.query(
                `UPDATE users SET userStatus = '1' WHERE email = '${email}'`
              );
              return res.send(response);
            } else {
              console.log(error);
              return res.status(500).send(userError);
            }
          }
        );
      }
    );
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

// //Get All Subscribe

router.get("/all", async (req, res) => {
  try {
    connect.query("SELECT * FROM payments", (error, result) => {
      if (!error && result.length > 0) {
        const reviewData = result;
        res.send(reviewData);
      } else {
        res.status(400).send(userError);
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

router.post("/getPayments/:email", async (req, res) => {
  console.log(req.params.email);
  try {
    connect.query(
      `SELECT * FROM payments where email='${req.params.email}'`,
      (error, result) => {
        if (!error && result.length > 0) {
          verifySubscriptionOfUser(result);
          const reviewData = result;
          res.status(200).send(reviewData);
        } else {
          res.status(400).send(userError);
        }
      }
    );
  } catch (error) {
    res.status(400).send(userError);
  }
});

verifySubscriptionOfUser = (result) => {
  const checkStatusActive = result.map((result) => {
    const todayDate = new Date();
    var checkExpirtyDate = todayDate.toLocaleDateString();
    if (checkExpirtyDate === result["endDate"]) {
      connect.query(
        `UPDATE payments SET statusSubscribe = 'Expire' where email='${req.params.email}'`
      );
      connect.query(
        `UPDATE users SET userStatus = '0' where email='${req.params.email}`
      );
    }
  });
  return checkStatusActive;
};

module.exports = router;
