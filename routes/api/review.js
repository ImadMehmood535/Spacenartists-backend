const express = require("express");
const Joi = require("joi");
const router = express.Router();
const connect = require("../../config/db");
const auth = require("../../middleware/auth");
const authAdmin = require("../../middleware/admin");
const privateHeader = require("../../middleware/privateHeader");

const userError = "Something went wrong. Please try again!";

const serverUrl = "https://apiv1.spacenartists.com/";
// const serverUrl = 'http://localhost:5200/';

//Validations Schema
const reviewSchema = Joi.object({
  rating: Joi.number().required(),
  review: Joi.string().min(15).required(),
});
const guestReviewSchema = Joi.object({
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  rating: Joi.number().required(),
  review: Joi.string().min(15).required(),
});
const reviewPaginationSchema = Joi.object({
  page: Joi.number().required(),
  limit: Joi.number().required(),
});

//Add Review
router.post("/:id", auth, async (req, res) => {
  console.log("Coming");
  const userRevId = req.user.id;
  const id = req.params.id;
  const { rating, review } = req.body;
  const { error } = reviewSchema.validate(req.body);
  try {
    console.log("After");
    if (!error) {
      if (parseInt(userRevId) !== parseInt(id)) {
        connect.query("SELECT * FROM users WHERE id=?", id, (error, result) => {
          if (!error && result.length > 0) {
            let data = {
              recommended_to: id,
              recommended_by: userRevId,
              rating,
              review,
            };
            connect.query(
              "INSERT INTO recommended SET ?",
              data,
              (error, results) => {
                if (!error && results.affectedRows > 0) {
                  return res.send("Review added successfully!");
                } else {
                  return res.status(500).send(userError);
                }
              }
            );
          } else {
            res.status(400).send(userError);
          }
        });
      } else {
        res.status(403).send("You can not give the review to yourself!");
      }
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Add AS A Guest Review
router.post("/guest/:id", privateHeader, async (req, res) => {
  const id = req.params.id;
  const { firstName, lastName, email, rating, review } = req.body;
  const { error } = guestReviewSchema.validate(req.body);
  try {
    user = { firstName, lastName, email, role: "Guest" };
    if (!error) {
      connect.query(
        "SELECT * FROM users WHERE email=?",
        email,
        (error, result) => {
          if (!error && result.length > 0) {
            const user = result;
            let data = {
              recommended_to: id,
              recommended_by: user[0].id,
              rating,
              review,
            };
            connect.query(
              "INSERT INTO recommended SET ?",
              data,
              (error, results) => {
                if (!error && results.affectedRows > 0) {
                  return res.send("Review added successfully!");
                } else {
                  return res.status(500).send(userError);
                }
              }
            );
          } else {
            connect.query("INSERT INTO users SET ?", user, (error, results) => {
              if (!error && results.affectedRows > 0) {
                connect.query(
                  "SELECT * FROM users WHERE email=?",
                  email,
                  (error, result) => {
                    if (!error && result.length > 0) {
                      const user = result;
                      let data = {
                        recommended_to: id,
                        recommended_by: user[0].id,
                        rating,
                        review,
                      };
                      connect.query(
                        "INSERT INTO recommended SET ?",
                        data,
                        (error, results) => {
                          if (!error && results.affectedRows > 0) {
                            return res.send("Review added successfully!");
                          } else {
                            return res.status(500).send(userError);
                          }
                        }
                      );
                    } else {
                      res.status(400).send(error.sqlMessage);
                    }
                  }
                );
              } else {
                return res.status(500).send(error.sqlMessage);
              }
            });
          }
        }
      );
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Update Review
router.put("/:id", authAdmin, async (req, res) => {
  const id = req.params.id;
  const { rating, review } = req.body;
  const { error } = reviewSchema.validate(req.body);
  try {
    if (!error) {
      connect.query(
        "SELECT * FROM recommended WHERE id=?",
        id,
        (error, result) => {
          if (!error && result.length > 0) {
            const reviewData = result;
            let data = {
              recommended_to: reviewData[0].recommended_to,
              recommended_by: reviewData[0].recommended_by,
              rating,
              review,
            };
            connect.query(
              "UPDATE recommended SET ? WHERE id=?",
              [data, id],
              (error, results) => {
                if (!error && results.affectedRows > 0) {
                  return res.status(201).send("Review updated successfully!");
                } else {
                  return res.status(500).send(userError);
                }
              }
            );
          } else {
            res.status(400).send(userError);
          }
        }
      );
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Delete Review
router.delete("/:id", authAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query(
      "DELETE FROM recommended WHERE id=?",
      id,
      (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.status(204).send("Review deleted successfully!");
        } else {
          return res.status(500).send(userError);
        }
      }
    );
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Get All Review
router.get("/all", auth, async (req, res) => {
  try {
    connect.query("SELECT * FROM recommended", (error, result) => {
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

//Get All Review with Pagination
router.get("/pagination", privateHeader, async (req, res) => {
  let { error } = reviewPaginationSchema.validate(req.query);
  let { limit, page } = req.query;
  if (!error) {
    let numRows;
    let numPerPage = parseInt(limit);
    let pageStart = parseInt(page);
    let numPages;
    let skip = pageStart * numPerPage;
    // Here we compute the LIMIT parameter for MySQL query
    let limitStart = skip + "," + numPerPage;
    connect.query(
      "SELECT count(*) as numRows FROM recommended",
      (error, result) => {
        if (!error) {
          numRows = result[0].numRows;
          numPages = Math.ceil(numRows / numPerPage);
          connect.query(
            `SELECT r.*, u.firstName as recommendedToFirstName, u.lastName as recommendedToLastName, ur.firstName as recommendedByFirstName, ur.lastName as recommendedByLastName FROM recommended r JOIN users u JOIN users ur WHERE r.recommended_to=u.id AND r.recommended_by=ur.id ORDER BY r.id DESC LIMIT ${numPerPage} OFFSET ${pageStart}`,
            (error, result) => {
              if (!error) {
                let responsePayload = {
                  result: result,
                };
                if (pageStart <= numPages) {
                  responsePayload.pagination = {
                    current: pageStart,
                    perPage: numPerPage,
                    totalPage: numPages,
                    previous: pageStart > 0 ? true : false,
                    next: pageStart < numPages - 1 ? true : false,
                  };
                } else
                  responsePayload.pagination = {
                    err:
                      "queried page " +
                      pageStart +
                      " is >= to maximum page number " +
                      numPages,
                  };
                res.json(responsePayload);
              } else {
                res.status(400).send(error);
              }
            }
          );
        } else {
          res.status(400).send(error);
        }
      }
    );
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Get Review By user id
router.get("/all/:id", privateHeader, async (req, res) => {
  const id = req.params.id;
  try {
    let sql =
      "SELECT recommended.*,users.id as userId,users.firstName,users.lastName,users.profilePicture FROM recommended RIGHT JOIN users ON users.id=recommended.recommended_by WHERE recommended.recommended_to=? ORDER BY recommended.id DESC";
    connect.query(sql, id, (error, result) => {
      if (!error && result.length > 0) {
        let review = result;
        for (let i = 0; i < review.length; i++) {
          if (review[i].profilePicture)
            review[
              i
            ].profilePicture = `${serverUrl}uploads/${review[i].profilePicture}`;
        }
        res.send(review);
      } else {
        res.status(400).send("No review found");
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Get Review By Id
router.get("/:id", privateHeader, async (req, res) => {
  let id = req.params.id;
  try {
    connect.query(
      "SELECT * FROM recommended WHERE id=?",
      id,
      (error, result) => {
        if (!error && result.length > 0) {
          res.status(200).send(result);
        } else {
          res.status(400).send(userError);
        }
      }
    );
  } catch (error) {
    res.status(400).send(userError);
  }
});

module.exports = router;
