const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  //Taking token from header
  const token = req.headers['authorization'];
  //If token is not
  if (!token) res.status(401).json({ msg: 'Authorization denied. Please login first' });

  //Verify Token
  try {
    const decode = jwt.verify(token, config.get('jwtSecret'));
    req.user = decode.user;
    if (req.user.role === 'superAdmin') {
      next();
    } else {
      res.status(401).json({ msg: 'Authorization denied. You are not login as a Super Admin!' });
    }
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
