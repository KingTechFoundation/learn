const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Assuming db.js is in the root directory

const authenticateDeviceSession = (req, res, next) => {
  const sessionId = req.headers['authorization']?.split(' ')[1]; // Extract JWT token from the Authorization header
  const deviceId = req.headers['user-agent']; // Extract device identifier (could be user-agent or custom ID)

  if (!sessionId) {
    return res.status(401).json({ message: 'Session not found.' });
  }

  // Validate JWT token
  jwt.verify(sessionId, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    const userId = decoded.id;

    // Query the session table to check if the session exists and is associated with the user
    const getSessionQuery =
      'SELECT * FROM user_sessions WHERE user_id = ? AND session_id = ?';
    db.query(getSessionQuery, [userId, sessionId], (err, results) => {
      if (err || results.length === 0) {
        return res
          .status(401)
          .json({ message: 'Session mismatch. Please log in again.' });
      }

      const storedDeviceId = results[0].device_id;

      // If device IDs don't match, invalidate session and force re-login
      if (storedDeviceId !== deviceId) {
        return res
          .status(401)
          .json({ message: 'Device mismatch. Please log in again.' });
      }

      req.user = decoded; // Attach user information to the request object for later use in route handler
      next();
    });
  });
};

module.exports = authenticateDeviceSession;
