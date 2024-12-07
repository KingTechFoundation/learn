const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const verifyEmailTemplate = require('../templates/verifyEmailTemplate');
require('dotenv').config(); // Load environment variables
const jwt = require('jsonwebtoken'); // Import jwt

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

      // Successfully verified the email
      res.status(200).json({ message: 'Email verified successfully.' });

      // Redirect to the login page after verification
      res.redirect('/login');
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

        const resetUrl = `http://localhost:5000/api/users/reset-password/${resetToken}`;
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
          text: `Reset your password using this link: ${resetUrl}`,
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
      // Check if the user exists
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

        // Check if the user has verified their email
        if (!user.is_verified) {
          return res
            .status(403)
            .json({ message: 'Please verify your email before logging in.' });
        }

        // Validate the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res
            .status(401)
            .json({ message: 'Invalid email or password.' });
        }

        // Update the user's online status to true
        userController.updateOnlineStatus(user.user_id, true, (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: 'Error updating online status.' });
          }

          // Generate a JWT token
          const token = jwt.sign(
            { id: user.user_id, full_name: user.full_name, email: user.email },
            process.env.JWT_SECRET, // Secret key for JWT
            { expiresIn: '1h' } // Token expiration time
          );

          res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
              id: user.user_id,
              full_name: user.full_name,
              email: user.email,
            },
          });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  },

  getOnlineUsers: async (req, res) => {
    try {
      // Example: Fetch all users that are marked as online in the database or session
      const onlineUsers = await User.find({ is_online: true }); // Example query
      res.status(200).json(onlineUsers);
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  logout: (req, res) => {
    const userId = req.user.id; // Assuming user ID is in the JWT token

    userController.updateOnlineStatus(userId, false, (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: 'Error updating online status.' });
      }

      res.status(200).json({ message: 'Logout successful.' });
    });
  },
};

module.exports = userController;
