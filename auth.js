const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// MongoDB User Model (Direct access - kisi external file ki zarurat nahi)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Student' }, // 'Student' ya 'Alumni'
  company: { type: String, default: '' },
  domain: { type: String, default: 'Full Stack Development' },
  batch: { type: String, default: '2026' },
  branch: { type: String, default: 'CSE' },
  location: { type: String, default: 'India' },
  skills: { type: Array, default: [] },
  bio: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// 1. SIGNUP ROUTE (MongoDB Atlas me save karega)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, company, domain, batch, branch, skills } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email aur password zaruri hain!' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ye email pehle se registered hai!' });
    }

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password,
      role: role || 'Student',
      company: role === 'Alumni' ? (company || 'Tech Company') : '',
      domain: role === 'Alumni' ? (domain || 'Software Engineer') : (domain || 'Student Developer'),
      batch: batch || (role === 'Alumni' ? '2023' : '2026'),
      branch: branch || 'CSE',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : ['React', 'JavaScript'])
    });

    await newUser.save();

    res.json({
      success: true,
      message: 'Account successfully create ho gaya! 🚀',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        company: newUser.company,
        domain: newUser.domain,
        batch: newUser.batch,
        branch: newUser.branch
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. LOGIN ROUTE (MongoDB se verify karega)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email aur password dalein' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User nahi mila. Pehle Signup karein!' });
    }

    if (user.password !== password) {
      return res.status(400).json({ success: false, message: 'Password galat hai!' });
    }

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        domain: user.domain,
        batch: user.batch,
        branch: user.branch
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;