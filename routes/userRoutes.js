const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// User signup route
router.post('/signup', userController.signup);

// Email verification route
router.get('/verify-email/:token', userController.verifyEmail);

// Request password reset route
router.post('/request-password-reset', userController.requestPasswordReset);

// Verify reset token route
router.get('/verify-reset-token/:token', userController.verifyResetToken);

// Reset password route
router.post('/reset-password/:token', userController.resetPassword);

// Login route
router.post('/login', userController.login);

module.exports = router;
