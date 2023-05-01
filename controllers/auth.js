const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const gravatar = require('gravatar');
const path = require('path');
const fs = require('fs/promises');
const { nanoid } = require('nanoid');

const { SECRET_KEY, BASE_URL } = process.env;

const { httpErrorFunc, ctrlWrapper, sendEmail } = require('../helpers');

const { User } = require('../models/user');

const avatarsDir = path.join(__dirname, '../', 'public', 'avatars');

const register = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user) return httpErrorFunc(409, 'Email already exists');

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);
  const verificationToken = nanoid();

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
    verificationToken,
  });

  const verifyEmail = {
    to: email,
    subject: 'Verify Email',
    html: `<a href="${BASE_URL}/api/auth/verify/${verificationToken}" target="_blank" title="Verify Email">Verify Email</a>`,
  };

  await sendEmail(verifyEmail);

  res.status(201).json({
    email: newUser.email,
  });
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) throw httpErrorFunc(404, 'User not found');

  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: '',
  });

  res.json({
    message: 'Verification successful',
  });
};

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw httpErrorFunc(404, 'User not found');
  if (user.verify)
    throw httpErrorFunc(404, 'Verification has already been passed');

  const verifyEmail = {
    to: email,
    subject: 'Verify Email',
    html: `<a href="${BASE_URL}/api/auth/verify/${user.verificationToken}" target="_blank" title="Verify Email">Verify Email</a>`,
  };

  await sendEmail(verifyEmail);

  res.json({
    message: 'Verification email sent',
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) return httpErrorFunc(401, 'Email or password invalid');

  if (!user.verify) return httpErrorFunc(404, 'Email not verified');

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) return httpErrorFunc(401, 'Invalid password');

  const payload = {
    id: user._id,
  };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '23h' });
  await User.findByIdAndUpdate(user._id, { token });

  res.json({
    token,
  });
};

const getCurrentUser = async (req, res) => {
  const { subscription, email } = req.user;

  res.json({ subscription, email });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: null });

  res.status(204);
};

const updateAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: TempUpload, originalname } = req.file;
  const fileName = `${_id}_${originalname}`;
  const resultUpload = path.join(avatarsDir, fileName);
  await fs.rename(TempUpload, resultUpload);
  const avatarURL = path.join('avatars', fileName);
  await User.findByIdAndUpdate(_id, { avatarURL });

  res.json({
    avatarURL,
  });
};

module.exports = {
  register: ctrlWrapper(register),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
  login: ctrlWrapper(login),
  getCurrentUser: ctrlWrapper(getCurrentUser),
  logout: ctrlWrapper(logout),
  updateAvatar: ctrlWrapper(updateAvatar),
};
