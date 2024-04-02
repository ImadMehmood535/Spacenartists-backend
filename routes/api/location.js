const express = require('express');
const Joi = require('joi');
const router = express.Router();
const connect = require('../../config/db');
const authAdmin = require('../../middleware/admin');
const privateHeader = require('../../middleware/privateHeader');
const userError = 'Something went wrong. Please try again!';



//Validations Schema
const countrySchema = Joi.object({
  name: Joi.string().required().min(3),
});
const citySchema = Joi.object({
  name: Joi.string().required(),
  country_id: Joi.string().empty(''),
});
const locationPaginationSchema = Joi.object({
  page: Joi.number().required(),
  limit: Joi.number().required(),
});

//Get All Country
router.get('/country', privateHeader, async (req, res) => {
  try {
    connect.query('SELECT * FROM country ORDER BY name ASC', (error, result) => {
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

//Get All Country with Pagination
router.get('/country/pagination', privateHeader, async (req, res) => {
  let { error } = locationPaginationSchema.validate(req.query);
  let { limit, page } = req.query;
  if (!error) {
    let numRows;
    let numPerPage = parseInt(limit);
    let pageStart = parseInt(page);
    let numPages;
    let skip = pageStart * numPerPage;
    // Here we compute the LIMIT parameter for MySQL query
    let limitStart = skip + ',' + numPerPage;
    connect.query('SELECT count(*) as numRows FROM country', (error, result) => {
      if (!error) {
        numRows = result[0].numRows;
        numPages = Math.ceil(numRows / numPerPage);
        connect.query(`SELECT * FROM country ORDER BY name ASC LIMIT ${numPerPage} OFFSET ${pageStart}`, (error, result) => {
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
                err: 'queried page ' + pageStart + ' is >= to maximum page number ' + numPages,
              };
            res.json(responsePayload);
          } else {
            res.status(400).send(error);
          }
        });
      } else {
        res.status(400).send(error);
      }
    });
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Get Country By Id
router.get('/country/:id', privateHeader, async (req, res) => {
  let id = req.params.id;
  try {
    connect.query('SELECT * FROM country WHERE id=?', id, (error, result) => {
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

//Add Country
router.post('/country', authAdmin, async (req, res) => {
  const { name } = req.body;
  const { error } = countrySchema.validate(req.body);
  let data = { name };
  try {
    if (!error) {
      connect.query('INSERT INTO country SET ?', data, (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.send('Country added successfully!');
        } else {
          return res.status(500).send(userError);
        }
      });
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Update Country
router.put('/country/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  const { error } = countrySchema.validate(req.body);
  let data = { name };
  try {
    if (!error) {
      connect.query('UPDATE country SET ? WHERE id=?', [data, id], (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.status(201).send('Country updated successfully!');
        } else {
          return res.status(500).send(userError);
        }
      });
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Delete Country
router.delete('/country/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('DELETE FROM country WHERE id=?', id, (error, results) => {
      if (!error && results.affectedRows > 0) {
        return res.status(204).send('Country deleted successfully!');
      } else {
        return res.status(500).send(userError);
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Get All City
router.get('/city', privateHeader, async (req, res) => {
  try {
    connect.query('SELECT * FROM city ORDER BY id ASC', (error, result) => {
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

//Get All Country with Pagination
router.get('/city/pagination', privateHeader, async (req, res) => {
  let { error } = locationPaginationSchema.validate(req.query);
  let { limit, page } = req.query;
  if (!error) {
    let numRows;
    let numPerPage = parseInt(limit);
    let pageStart = parseInt(page);
    let numPages;
    let skip = pageStart * numPerPage;
    // Here we compute the LIMIT parameter for MySQL query
    let limitStart = skip + ',' + numPerPage;
    connect.query('SELECT count(*) as numRows FROM city', (error, result) => {
      if (!error) {
        numRows = result[0].numRows;
        numPages = Math.ceil(numRows / numPerPage);
        connect.query(
          `SELECT city.*,country.name as countryName FROM city JOIN country ON city.country_id=country.id ORDER BY city.name ASC LIMIT ${numPerPage} OFFSET ${pageStart}`,
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
                  err: 'queried page ' + pageStart + ' is >= to maximum page number ' + numPages,
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
    });
  } else {
    res.status(400).send(error.details[0].message);
  }
});

//Get Country By Id
router.get('/city-id/:id', privateHeader, async (req, res) => {
  let id = req.params.id;
  try {
    connect.query('SELECT * FROM city WHERE id=?', id, (error, result) => {
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

//Get All City By Country Id
router.get('/city/:id', privateHeader, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('SELECT * FROM city WHERE country_id=?', id, (error, result) => {
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

//Add City
router.post('/city', authAdmin, async (req, res) => {
  const { name, country_id } = req.body;
  const { error } = citySchema.validate(req.body);
  let data = { name, country_id };
  try {
    if (!error) {
      connect.query('INSERT INTO city SET ?', data, (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.send('City added successfully!');
        } else {
          return res.status(500).send(userError);
        }
      });
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Update City
router.put('/city/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  const { name, country_id } = req.body;
  const { error } = citySchema.validate(req.body);
  let data = { name, country_id };
  try {
    if (!error) {
      connect.query('UPDATE city SET ? WHERE id=?', [data, id], (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.status(201).send('City updated successfully!');
        } else {
          return res.status(500).send(userError);
        }
      });
    } else {
      res.status(400).send(error.details[0].message);
    }
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Delete City
router.delete('/city/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('DELETE FROM city WHERE id=?', id, (error, results) => {
      if (!error && results.affectedRows > 0) {
        return res.status(204).send('City deleted successfully!');
      } else {
        return res.status(500).send(userError);
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

module.exports = router;
