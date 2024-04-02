const express = require('express');
const Joi = require('joi');
const router = express.Router();
const connect = require('../../config/db');
const authAdmin = require('../../middleware/admin');
const privateHeader = require('../../middleware/privateHeader');
const userError = 'Something went wrong. Please try again!';

//Validations Schema
const categorySchema = Joi.object({
  category_name: Joi.string().required(),
  parent_id: Joi.string().empty(''),
});
const categoryPaginationSchema = Joi.object({
  page: Joi.number().required(),
  limit: Joi.number().required(),
});

//Add Category
router.post('/', authAdmin, async (req, res) => {
  const { category_name, parent_id } = req.body;
  const { error } = categorySchema.validate(req.body);
  let data = {
    category_name,
    parent_id,
  };
  try {
    if (!error) {
      connect.query('INSERT INTO category SET ?', data, (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.send('Category added successfully!');
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

//Update Category
router.put('/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  const { category_name, parent_id } = req.body;
  const { error } = categorySchema.validate(req.body);
  let data = {
    category_name,
    parent_id,
  };
  try {
    if (!error) {
      connect.query('UPDATE category SET ? WHERE id=?', [data, id], (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.status(201).send('Category updated successfully!');
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

//Delete Category
router.delete('/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('DELETE FROM category WHERE id=?', id, (error, results) => {
      if (!error && results.affectedRows > 0) {
        return res.status(204).json({ msg: 'Category deleted successfully!' });
      } else {
        return res.status(500).send(error.sqlMessage);
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Get All Category by Id
router.get('/single/:id', authAdmin, async (req, res) => {
  let id = req.params.id;
  try {
    connect.query('SELECT * FROM category WHERE id=?', id, (error, result) => {
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

//Get All Categories by Parent
router.get('/all', async (req, res) => {
  console.log("hi")
  try {
    connect.query('SELECT * FROM category WHERE parent_id=0', (error, result) => {
      if (!error && result.length > 0) {
        const reviewData = result;
        res.send(reviewData);
      } else {
        console.log(error)
        res.status(400).send(userError);
      }
    });
  } catch (error) {
    console.log(error)
    res.status(400).send(userError);
  }
});

//Get All Categories without Parent
router.get('/no-parent', privateHeader, async (req, res) => {
  try {
    connect.query('SELECT * FROM category WHERE parent_id!=0', (error, result) => {
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

//Get All Categories by Child to Parent ID
router.get('/child/:id', privateHeader, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('SELECT * FROM category WHERE id=?', id, (error, result) => {
      if (!error && result.length > 0) {
        connect.query('SELECT * FROM category WHERE parent_id=?', result[0].parent_id, (error, result) => {
          if (!error && result.length > 0) {
            const reviewData = result;
            res.send(reviewData);
          } else {
            res.status(400).send(userError);
          }
        });
      } else {
        res.status(400).send(userError);
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Get All Categories by Parent ID
router.get('/all/:id', privateHeader, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('SELECT * FROM category WHERE parent_id=?', id, (error, result) => {
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

//Get All Categories with Pagination
router.get('/pagination', privateHeader, async (req, res) => {
  let { error } = categoryPaginationSchema.validate(req.query);
  let { limit, page } = req.query;
  if (!error) {
    let numRows;
    let numPerPage = parseInt(limit);
    let pageStart = parseInt(page);
    let numPages;
    let skip = pageStart * numPerPage;
    // Here we compute the LIMIT parameter for MySQL query
    let limitStart = skip + ',' + numPerPage;
    connect.query('SELECT count(*) as numRows FROM category', (error, result) => {
      if (!error) {
        numRows = result[0].numRows;
        numPages = Math.ceil(numRows / numPerPage);
        connect.query('SELECT * FROM category ORDER BY parent_id ASC LIMIT ' + limitStart, (error, result) => {
          if (!error) {
            let responsePayload = {
              result: result,
            };
            if (pageStart < numPages) {
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

module.exports = router;
