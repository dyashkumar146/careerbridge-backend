import express from 'express';
import User from '../models/User.js';
import Job from '../models/Job.js';
import { Notification, Message } from '../models/Notification.js';

const router = express.Router();

// --- JOBS & REFERRALS ---
router.post('/jobs', async (req, res) => {
  try {
    const newJob = await Job.create(req.body);
    res.status(201).json(newJob);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().populate('postedBy', 'name company jobRole');
    res.json(jobs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/jobs/:id/apply', async (req, res) => {
  const { studentId } = req.body;
  try {
    const job = await Job.findById(req.params.id);
    job.applicants.push({ student: studentId });
    await job.save();
    
    await Notification.create({
      recipient: job.postedBy,
      sender: studentId,
      type: 'job',
      message: 'A student applied/requested referral for your post.'
    });

    res.json({ message: "Applied successfully!" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- NETWORKING & CONNECTIONS ---
router.post('/connect/request', async (req, res) => {
  const { senderId, receiverId } = req.body;
  try {
    await User.findByIdAndUpdate(receiverId, { $addToSet: { connectionRequests: senderId } });
    await Notification.create({
      recipient: receiverId,
      sender: senderId,
      type: 'connection',
      message: 'Sent you a connection request.'
    });
    res.json({ message: "Connection request sent." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ADMIN CONTROL ---
router.get('/admin/stats', async (req, res) => {
  try {
    const students = await User.countDocuments({ role: 'student' });
    const alumni = await User.countDocuments({ role: 'alumni' });
    const jobs = await Job.countDocuments();
    res.json({ students, alumni, jobs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// --- GET ALL ALUMNI ---
router.get('/alumni', async (req, res) => {
  try {
    const alumniList = await User.find({ role: 'Alumni' }).select('-password');
    res.json({ success: true, alumni: alumniList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// --- NOTIFICATIONS ROUTE ---
// 1. Saare notifications fetch karna
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Naya job/internship post karte waqt notification create karna
router.post('/notifications', async (req, res) => {
  try {
    const { title, message } = req.body;
    const notif = await Notification.create({ title, message });
    res.status(201).json({ success: true, notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;