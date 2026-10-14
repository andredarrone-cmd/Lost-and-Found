const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const itemModel = require('../models/itemModel');

async function register(req, res) {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ message: 'All fields are required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await userModel.findByEmail(normalizedEmail);
    if (existing) return res.status(409).json({ message: 'An account with that email already exists.' });

    const password_hash = await bcrypt.hash(password, 12);
    const user = await userModel.createUser({ full_name: full_name.trim(), email: normalizedEmail, password_hash, role: 'student' });
    req.session.user = user;
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await userModel.findByEmail(email.trim().toLowerCase());
    if (!user || user.status !== 'active') return res.status(401).json({ message: 'Invalid credentials or inactive account.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });
    delete user.password_hash;
    req.session.user = user;
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed.' });
  }
}

function logout(req, res) {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Logout failed.' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
}

async function me(req, res) {
  if (!req.session.user) return res.status(401).json({ message: 'Not logged in.' });
  const user = await userModel.findById(req.session.user.id);
  const notifications = await itemModel.getNotifications(req.session.user.id);
  res.json({ user, notifications });
}

async function profile(req, res) {
  try {
    const { full_name, email } = req.body;
    if (!full_name || !email) return res.status(400).json({ message: 'Name and email are required.' });
    const existing = await userModel.findByEmail(email.trim().toLowerCase());
    if (existing && existing.id !== req.session.user.id) return res.status(409).json({ message: 'Email is already used.' });
    const user = await userModel.updateProfile(req.session.user.id, full_name.trim(), email.trim().toLowerCase());
    req.session.user = { ...req.session.user, ...user };
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Profile update failed.' });
  }
}

module.exports = { register, login, logout, me, profile };
