module.exports = function (req, res, next) {
  //Taking token from header
  const privateHeader = req.header('x-person-header');
  //If token is not
  if (!privateHeader) res.status(401).json({ msg: 'Authorization denied' });

  //Verify Token
  if (privateHeader == 'secureAdminKey') {
    next();
  } else {
    res.status(401).json({ msg: 'Authorization denied' });
  }
};
