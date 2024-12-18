const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const verifyEmailTemplate = require('../templates/verifyEmailTemplate');
const resetPasswordEmailTemplate = require('../templates/resetPasswordEmailTemplate');
const authenticateDeviceSession = require('../middleware/authenticateDeviceSession');

require('dotenv').config();
const jwt = require('jsonwebtoken');
const authenticateJWT = require('../middleware/authenticateJWT');

const userController = {
  signup: async (req, res) => {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
      const userCheckQuery = 'SELECT * FROM users WHERE email = ?';
      db.query(userCheckQuery, [email], async (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
          return res
            .status(400)
            .json({ message: 'Email is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const insertUserQuery = `
          INSERT INTO users (full_name, email, password, verification_token) 
          VALUES (?, ?, ?, ?)
        `;
        db.query(
          insertUserQuery,
          [full_name, email, hashedPassword, verificationToken],
          (err, result) => {
            if (err) throw err;

            const transporter = nodemailer.createTransport({
              service: process.env.MAIL_SERVICE,
              auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
              },
            });

            const verificationUrl = `https://learn-y7lz.onrender.com/api/users/verify-email/${verificationToken}`;

            const mailOptions = {
              from: process.env.MAIL_USER,
              to: email,
              subject: 'Verify Your Email - CodeLearn',
              html: verifyEmailTemplate(verificationUrl, full_name),
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('Error sending email:', error);
                return res
                  .status(500)
                  .json({ message: 'Error sending verification email.' });
              }

              res.status(201).json({
                message:
                  'Signup successful. Please check your email to verify your account.',
              });
            });
          }
        );
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error.', error });
    }
  },

  // Email verification
  verifyEmail: (req, res) => {
    const { token } = req.params;

    const verifyQuery =
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE verification_token = ?';

    db.query(verifyQuery, [token], (err, result) => {
      if (err) {
        console.error('Error verifying email:', err);
        return res.status(500).json({ message: 'Server error.' });
      }

      if (result.affectedRows === 0) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }

      // Redirect to the login page on successful verification
      res.redirect('https://elearningplatiform.netlify.app/login');
    });
  },

  // Password reset (send token)
  requestPasswordReset: (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiration = new Date(Date.now() + 3600000); // 1 hour from now

    const updateResetTokenQuery = `
      UPDATE users 
      SET reset_token = ?, reset_token_expiration = ? 
      WHERE email = ? 
    `;

    db.query(
      updateResetTokenQuery,
      [resetToken, resetTokenExpiration, email],
      (err, result) => {
        if (err) {
          console.error('Error generating reset token:', err);
          return res.status(500).json({ message: 'Server error.' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Email not found.' });
        }

        const resetUrl = `https://elearningplatiform.netlify.app/reset-password/${resetToken}`;
        const transporter = nodemailer.createTransport({
          service: process.env.MAIL_SERVICE,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        });

        const mailOptions = {
          from: process.env.MAIL_USER,
          to: email,
          subject: 'Password Reset Request',
          html: resetPasswordEmailTemplate(resetUrl),
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending reset email:', error);
            return res
              .status(500)
              .json({ message: 'Error sending password reset email.' });
          }

          res
            .status(200)
            .json({ message: 'Password reset email sent successfully.' });
        });
      }
    );
  },

  verifyResetToken: (req, res) => {
    const { token } = req.params;

    const query = `
    SELECT * FROM users 
    WHERE reset_token = ? AND reset_token_expiration > NOW()
  `;

    db.query(query, [token], (err, results) => {
      if (err) {
        console.error('Error verifying token:', err);
        return res.status(500).json({ message: 'Server error.' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }

      res.status(200).json({ message: 'Token is valid.' });
    });
  },

  // Reset password
  resetPassword: (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    // Check if the reset token is valid and not expired
    const query = `
      SELECT * FROM users 
      WHERE reset_token = ? AND reset_token_expiration > NOW()
    `;

    db.query(query, [token], async (err, results) => {
      if (err) {
        console.error('Error verifying token:', err);
        return res.status(500).json({ message: 'Server error.' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updatePasswordQuery = `
        UPDATE users 
        SET password = ?, reset_token = NULL, reset_token_expiration = NULL 
        WHERE reset_token = ?
      `;

      db.query(updatePasswordQuery, [hashedPassword, token], (err, result) => {
        if (err) {
          console.error('Error updating password:', err);
          return res.status(500).json({ message: 'Server error.' });
        }

        res
          .status(200)
          .json({ message: 'Password has been successfully reset.' });
      });
    });
  },

  // **New Method to Update User's Online Status**
  updateOnlineStatus: (userId, status, callback) => {
    const query = `
    UPDATE users SET is_online = ?, last_online_at = NOW() WHERE user_id = ?
  `;
    db.query(query, [status, userId], (err, result) => {
      if (err) {
        console.error('Error updating online status:', err);
        return callback(err, null);
      }

      callback(null, result);
    });
  },

  // Login and generate JWT token

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    try {
      const findUserQuery = 'SELECT * FROM users WHERE email = ?';
      db.query(findUserQuery, [email], async (err, results) => {
        if (err) {
          console.error('Error fetching user:', err);
          return res.status(500).json({ message: 'Server error.' });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: 'User not found.' });
        }

        const user = results[0];

        if (!user.is_verified) {
          return res
            .status(403)
            .json({ message: 'Please verify your email before logging in.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res
            .status(401)
            .json({ message: 'Invalid email or password.' });
        }

        // Generate a unique session ID for the device (using user-agent as an example)
        const deviceId = req.headers['user-agent']; // You could generate a more unique identifier if needed
        const sessionId = jwt.sign(
          { id: user.user_id, deviceId },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Store session ID associated with the user and device in your session store (e.g., in a DB)
        const storeSessionQuery =
          'INSERT INTO user_sessions (user_id, session_id, device_id) VALUES (?, ?, ?)';
        db.query(
          storeSessionQuery,
          [user.user_id, sessionId, deviceId],
          (err) => {
            if (err) {
              console.error('Error storing session:', err);
              return res.status(500).json({ message: 'Server error.' });
            }

            res.status(200).json({
              message: 'Login successful.',
              token: sessionId,
              user: {
                id: user.user_id,
                full_name: user.full_name,
                email: user.email,
              },
            });
          }
        );
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  },

  getOnlineUsers: async (req, res) => {
    try {
      const query = 'SELECT * FROM users WHERE is_online = 1'; // Query to fetch online users
      db.query(query, (err, results) => {
        if (err) {
          console.error('Error fetching online users:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json(results); // Send the fetched results as the response
      });
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
  logout: [
    authenticateJWT,
    (req, res) => {
      if (!req.user || !req.user.id) {
        return res.status(400).json({ message: 'User not logged in' });
      }

      const userId = req.user.id;

      userController.updateOnlineStatus(userId, false, (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: 'Error updating online status.' });
        }

        res.status(200).json({ message: 'Logout successful.' });
      });
    },
  ],

  logout: [
    authenticateDeviceSession, // Ensure the session is valid and tied to the device
    (req, res) => {
      const userId = req.user.id;
      const sessionId = req.headers['authorization']?.split(' ')[1]; // Get session ID from Authorization header

      if (!userId || !sessionId) {
        return res
          .status(400)
          .json({ message: 'User not logged in or session invalid.' });
      }

      // Invalidate the session by deleting it from the session store
      const deleteSessionQuery =
        'DELETE FROM user_sessions WHERE user_id = ? AND session_id = ?';
      db.query(deleteSessionQuery, [userId, sessionId], (err) => {
        if (err) {
          console.error('Error deleting session:', err);
          return res.status(500).json({ message: 'Server error.' });
        }

        res.status(200).json({ message: 'Logout successful.' });
      });
    },
  ],
};

module.exports = userController;
