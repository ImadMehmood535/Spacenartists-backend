const express = require('express');
const Joi = require('joi');

const router = express.Router();
const connect = require('../../config/db');
const auth = require('../../middleware/auth');
const authAdmin = require('../../middleware/admin');
const privateHeader = require('../../middleware/privateHeader');
const userError = 'Something went wrong. Please try again!';

//Validations Schema
const subscribeSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'ae'] } })
    .required(),
});

//Add Subscribe
router.post('/', privateHeader, async (req, res) => {
  const email = req.body.email;
  const { error } = subscribeSchema.validate(req.body);
  let data = {
    email,
  };
  try {
    if (!error) {
      connect.query('INSERT INTO subscribe SET ?', data, (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.send('You has been successfully subscribe!');
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

//Update Subscribe
router.put('/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  const { email } = req.body;
  const { error } = subscribeSchema.validate(req.body);
  let data = {
    email,
  };
  try {
    if (!error) {
      connect.query('UPDATE subscribe SET ? WHERE id=?', [data, id], (error, results) => {
        if (!error && results.affectedRows > 0) {
          return res.send('Subscription has been updated!');
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

//Delete Subscribe
router.delete('/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    connect.query('DELETE FROM subscribe WHERE id=?', id, (error, results) => {
      if (!error && results.affectedRows > 0) {
        return res.send('Subscription have been deleted!');
      } else {
        return res.status(500).send(userError);
      }
    });
  } catch (error) {
    res.status(400).send(userError);
  }
});

//Get All Subscribe
router.get('/all', auth, async (req, res) => {
  try {
    connect.query('SELECT * FROM subscribe', (error, result) => {
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

module.exports = router;
