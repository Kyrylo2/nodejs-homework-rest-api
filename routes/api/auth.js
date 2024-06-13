const express = require('express');
const router = express.Router();
const ctrl = require('../..//controllers/auth');

const { schemas } = require('../..//models/user');
const { validateBody, authenticate, upload } = require('../../middlewares');

// sign up
router.post('/register', validateBody(schemas.registerSchema), ctrl.register);

// sign in
router.post('/login', validateBody(schemas.loginSchema), ctrl.login);

// current user
router.get('/current', authenticate, ctrl.getCurrentUser);

// logout
router.post('/logout', authenticate, ctrl.logout);

// avatar
router.patch(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  ctrl.updateAvatar
);

// varify
router.get('/verify/:verificationToken', ctrl.verifyEmail);
router.post(
  '/verify',
  validateBody(schemas.emailSchema, 404, 'missing required field email'),
  ctrl.resendVerifyEmail
);

module.exports = router;
