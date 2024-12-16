const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  // Check for the token in the Authorization header
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(403).json({ message: 'Authorization token is missing.' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    // Attach the user info to the request object
    req.user = user;
    next(); // Continue to the next middleware or route handler
  });
};

module.exports = authenticateJWT;
