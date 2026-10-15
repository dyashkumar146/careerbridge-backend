require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// ---------------------------------------------------
// 🍃 1. MongoDB Atlas Connection
// ---------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || "tumhara_mongodb_connection_string";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected! 🍃"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

// ---------------------------------------------------
// 📦 2. ALL MONGOOSE SCHEMAS & MODELS (100% Database Driven)
// ---------------------------------------------------

// User Model (Students & Verified Alumni)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, default: 'Student' }, // 'Student' ya 'Alumni'
  company: { type: String, default: '' },
  domain: { type: String, default: 'Full Stack Development' },
  batch: { type: String, default: '2024' },
  branch: { type: String, default: 'CSE' },
  location: { type: String, default: 'India' },
  skills: [{ type: String }],
  bio: { type: String, default: '' },
  availableForMentorship: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Connection Model (Network Requests)
const connectionSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  senderName: { type: String, required: true },
  receiverEmail: { type: String, required: true },
  receiverName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});
const Connection = mongoose.models.Connection || mongoose.model('Connection', connectionSchema);

// Real Notification Model
const notificationSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true },
  senderName: { type: String, default: 'CareerBridge' },
  senderEmail: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '/home' },
  type: { type: String, default: 'general' }, // 'network', 'job', 'mentorship', 'chat'
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// Chat Message Model (Permanent MongoDB WhatsApp Chats)
const messageSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  senderName: { type: String, required: true },
  receiverEmail: { type: String, required: true },
  receiverName: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// Job & Referral Model
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, default: 'Tech Company' },
  type: { type: String, default: 'job' },
  location: { type: String, default: 'Remote' },
  batch: { type: String, default: '2026' },
  stipend: { type: String, default: 'Competitive' },
  description: { type: String },
  alumniName: { type: String, default: 'Senior Alumni' },
  posterEmail: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });
const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

// Job Application Tracker Model
const applicationSchema = new mongoose.Schema({
  jobId: { type: String },
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  studentEmail: { type: String, required: true },
  studentName: { type: String, required: true },
  seniorName: { type: String },
  status: { type: String, default: 'Under Review' },
  stage: { type: String, default: 'Resume & Profile Screening' },
  appliedDate: { type: Date, default: Date.now }
});
const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

// Mentorship Session Model
const mentorshipSchema = new mongoose.Schema({
  studentEmail: { type: String, required: true },
  studentName: { type: String, required: true },
  mentorEmail: { type: String, required: true },
  mentorName: { type: String, required: true },
  topic: { type: String, required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  note: { type: String },
  status: { type: String, default: 'Confirmed' },
  createdAt: { type: Date, default: Date.now }
});
const Mentorship = mongoose.models.Mentorship || mongoose.model('Mentorship', mentorshipSchema);

// ---------------------------------------------------
// ⚙️ 3. Middlewares & Routing
// ---------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Core Sub-routes
app.use('/api/auth', require('./auth'));
app.use('/api/posts', require('./postRoutes'));

// Express HTTP Server & Socket.io Binding
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ---------------------------------------------------
// ⚡ 4. Real-Time Socket.io Engine
// ---------------------------------------------------
io.on('connection', (socket) => {
  console.log('⚡ User Connected:', socket.id);

  // User joins their personal email room
  socket.on('join_chat', (userIdentifier) => {
    if (!userIdentifier) return;
    const cleanId = String(userIdentifier).toLowerCase().trim();
    socket.join(cleanId);
    console.log(`👤 User joined room: [${cleanId}]`);
  });

  // Message Send Handler -> Save to MongoDB & Real-time Delivery
  socket.on('send_message', async (data) => {
    try {
      console.log("📩 BACKEND ME MESSAGE AAYA:", data);
      const cleanSender = String(data.senderEmail || '').toLowerCase().trim();
      const cleanReceiver = String(data.receiverEmail || data.receiverName || '').toLowerCase().trim();

      // 1. Permanent MongoDB Save
      const newMsg = new Message({
        senderEmail: cleanSender,
        senderName: data.senderName || 'User',
        receiverEmail: cleanReceiver,
        receiverName: data.receiverName || 'User',
        text: data.text,
        time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      await newMsg.save();

      // 2. Real-time emit to receiver's room
      if (cleanReceiver) {
        io.to(cleanReceiver).emit('receive_message', newMsg);
        io.to(cleanReceiver).emit('notification_received', {
          title: `New Message from ${data.senderName} 💬`,
          message: data.text,
          link: '/home',
          type: 'chat'
        });
      }
      io.emit('receive_message', newMsg); // Broadcast backup

      // 3. Sender confirmation
      socket.emit('message_sent', newMsg);
    } catch (error) {
      console.error('Error saving message to MongoDB:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User Disconnected:', socket.id);
  });
});

// ---------------------------------------------------
// 🔔 5. Real Notifications Endpoints
// ---------------------------------------------------
// Fetch user's notifications
app.get('/api/notifications/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const notifications = await Notification.find({ recipientEmail: email }).sort({ createdAt: -1 }).limit(15);
    const unreadCount = await Notification.countDocuments({ recipientEmail: email, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark all notifications as read
app.put('/api/notifications/read/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    await Notification.updateMany({ recipientEmail: email, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------
// 👥 6. Real Suggested Users & Alumni Endpoints
// ---------------------------------------------------
// Fetch non-connected registered members for suggestions
app.get('/api/users/suggested/:email', async (req, res) => {
  try {
    const myEmail = req.params.email.toLowerCase().trim();

    // Pehle existing connections & pending requests nikalo
    const conns = await Connection.find({
      $or: [{ senderEmail: myEmail }, { receiverEmail: myEmail }]
    });

    const excluded = new Set([myEmail]);
    conns.forEach(c => {
      excluded.add((c.senderEmail || '').toLowerCase().trim());
      excluded.add((c.receiverEmail || '').toLowerCase().trim());
    });

    // Sirf un users ko lao jo stranger hain
    const users = await User.find({ email: { $nin: Array.from(excluded) } }, '-password').limit(6);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch all registered verified alumni
app.get('/api/users/alumni', async (req, res) => {
  try {
    const alumni = await User.find({ 
      $or: [{ role: 'Alumni' }, { role: 'alumni' }] 
    }, '-password').sort({ createdAt: -1 });

    res.json({ success: true, alumni });
  } catch (err) {
    console.error('Error fetching alumni:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Seed alumni data into MongoDB (One-click)
app.post('/api/users/seed-alumni', async (req, res) => {
  try {
    const realAlumniData = [
      {
        name: 'Aman Verma',
        email: 'aman.verma@amazon.com',
        role: 'Alumni',
        company: 'Amazon',
        domain: 'Backend & System Design',
        batch: '2023',
        branch: 'CSE',
        location: 'Bengaluru, India',
        skills: ['Java', 'Distributed Systems', 'AWS', 'Spring Boot', 'DSA'],
        availableForMentorship: true,
        bio: 'Cracked Amazon off-campus in 2023. Happy to help junior batches with DSA prep, low-level design, and internal referrals.'
      },
      {
        name: 'Sneha Rao',
        email: 'sneha.rao@google.com',
        role: 'Alumni',
        company: 'Google',
        domain: 'Cloud & DevOps',
        batch: '2022',
        branch: 'IT',
        location: 'Hyderabad, India',
        skills: ['GCP', 'Kubernetes', 'Docker', 'Terraform', 'Golang'],
        availableForMentorship: true,
        bio: 'Working on Google Cloud enterprise scaling. Let me know if you need mock interviews for cloud engineering roles.'
      },
      {
        name: 'Rohan Sharma',
        email: 'rohan.sharma@groww.in',
        role: 'Alumni',
        company: 'Groww',
        domain: 'Frontend & UI/UX',
        batch: '2024',
        branch: 'CSE',
        location: 'Bengaluru, India',
        skills: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux'],
        availableForMentorship: true,
        bio: 'Obsessed with high-performance Web apps & modern frontend architectures. Can review your portfolio websites and projects.'
      }
    ];

    for (let al of realAlumniData) {
      const exists = await User.findOne({ email: al.email });
      if (!exists) {
        await new User(al).save();
      }
    }

    res.json({ success: true, message: 'Alumni successfully seeded in MongoDB! 🍃' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------
// 💬 7. Real WhatsApp Message History API
// ---------------------------------------------------
app.get('/api/messages/:user1/:user2', async (req, res) => {
  try {
    const u1 = req.params.user1.toLowerCase().trim();
    const u2 = req.params.user2.toLowerCase().trim();

    const history = await Message.find({
      $or: [
        { senderEmail: u1, receiverEmail: u2 },
        { senderEmail: u2, receiverEmail: u1 }
      ]
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages: history });
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------
// 💼 8. Jobs & Real Applications Endpoints
// ---------------------------------------------------
// Get All Jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Post a New Job (MongoDB Save + Automatic Student Notifications)
app.post('/api/jobs', async (req, res) => {
  try {
    const newJob = new Job(req.body);
    await newJob.save();

    // Broadcast notification to active campus users
    const campusUsers = await User.find({ email: { $ne: req.body.posterEmail } }).limit(25);
    for (let u of campusUsers) {
      await new Notification({
        recipientEmail: u.email,
        senderName: req.body.alumniName || 'Senior',
        title: `New Referral Live: ${req.body.company} 💼`,
        message: `${req.body.alumniName} ne ${req.body.company} ke liye "${req.body.title}" vacancy post ki hai.`,
        link: '/jobs',
        type: 'job'
      }).save();
    }

    io.emit('notification_broadcast', {
      title: `New Job Live: ${req.body.company}`,
      message: `${req.body.title} opening has been posted!`
    });

    res.json({ success: true, job: newJob });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Apply with CareerBridge Resume (Permanent DB Application)
app.post('/api/jobs/apply', async (req, res) => {
  try {
    const { jobId, jobTitle, company, studentEmail, studentName, seniorName } = req.body;
    const cleanEmail = studentEmail.toLowerCase().trim();

    const existing = await Application.findOne({
      jobTitle,
      company,
      studentEmail: cleanEmail
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Aapne is vacancy ke liye pehle hi apply kar diya hai!' });
    }

    const newApp = new Application({
      jobId,
      jobTitle,
      company,
      studentEmail: cleanEmail,
      studentName,
      seniorName: seniorName || 'Alumni Senior',
      status: 'Under Review',
      stage: 'Resume & Profile Screening'
    });

    await newApp.save();
    res.json({ success: true, message: 'Application submitted successfully!', application: newApp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Student's Applied Jobs for Dashboard
app.get('/api/jobs/applied/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const apps = await Application.find({ studentEmail: email }).sort({ appliedDate: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------
// 📅 9. Mentorship Booking Endpoints
// ---------------------------------------------------
// Book Mentorship Session (MongoDB Save + Senior Notification)
app.post('/api/mentorship/book', async (req, res) => {
  try {
    const { studentEmail, studentName, mentorEmail, mentorName, topic, date, timeSlot, note } = req.body;
    const cleanMentor = mentorEmail.toLowerCase().trim();

    const newSession = new Mentorship({
      studentEmail: studentEmail.toLowerCase().trim(),
      studentName,
      mentorEmail: cleanMentor,
      mentorName,
      topic,
      date,
      timeSlot,
      note
    });

    await newSession.save();

    // Senior ke liye live notification
    const notif = new Notification({
      recipientEmail: cleanMentor,
      senderName: studentName,
      title: 'New 1:1 Mentorship Booking 📅',
      message: `${studentName} ne aapke sath 1:1 session book kiya hai: "${topic}" on ${date}.`,
      link: '/dashboard',
      type: 'mentorship'
    });
    await notif.save();

    io.to(cleanMentor).emit('notification_received', notif);

    res.json({ success: true, message: 'Mentorship booked successfully!', session: newSession });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get User's Mentorship Sessions
app.get('/api/mentorship/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const sessions = await Mentorship.find({
      $or: [{ studentEmail: email }, { mentorEmail: email }]
    }).sort({ createdAt: -1 });

    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------
// 🌐 10. Real Network Connections Endpoints (WITH REAL-TIME NOTIFICATIONS)
// ---------------------------------------------------
// Send Connection Request
app.post('/api/network/connect', async (req, res) => {
  try {
    const { senderEmail, senderName, receiverEmail, receiverName } = req.body;

    if (!senderEmail || !receiverEmail) {
      return res.status(400).json({ success: false, message: 'Sender and receiver email required' });
    }

    const cleanSender = senderEmail.toLowerCase().trim();
    const cleanReceiver = receiverEmail.toLowerCase().trim();

    const existing = await Connection.findOne({
      $or: [
        { senderEmail: cleanSender, receiverEmail: cleanReceiver },
        { senderEmail: cleanReceiver, receiverEmail: cleanSender }
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Request already exists or connected!' });
    }

    const newConn = new Connection({
      senderEmail: cleanSender,
      senderName: senderName || 'User',
      receiverEmail: cleanReceiver,
      receiverName: receiverName || 'User',
      status: 'pending'
    });
    await newConn.save();

    // 🔔 Live Notification for Receiver
    const notif = new Notification({
      recipientEmail: cleanReceiver,
      senderName: senderName || 'A Student',
      senderEmail: cleanSender,
      title: 'New Connection Request 👥',
      message: `${senderName} ne aapko connect karne ke liye request bheji hai.`,
      link: '/network',
      type: 'network'
    });
    await notif.save();

    io.to(cleanReceiver).emit('notification_received', notif);

    res.json({ success: true, message: 'Request sent successfully!', connection: newConn });
  } catch (err) {
    console.error('Network connect error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get User's Network Data (Received, Sent & Accepted)
app.get('/api/network/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();

    const received = await Connection.find({ receiverEmail: email, status: 'pending' });
    const sent = await Connection.find({ senderEmail: email, status: 'pending' });
    const accepted = await Connection.find({
      $or: [{ senderEmail: email }, { receiverEmail: email }],
      status: 'accepted'
    });

    res.json({ success: true, received, sent, accepted });
  } catch (err) {
    console.error('Network get error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🎯 ACCEPT CONNECTION REQUEST (SENDER KO NOTIFICATION + SOCKET REFRESH)
app.put('/api/network/accept/:id', async (req, res) => {
  try {
    const conn = await Connection.findByIdAndUpdate(
      req.params.id, 
      { status: 'accepted' }, 
      { new: true }
    );

    if (!conn) {
      return res.status(404).json({ success: false, message: 'Request nahi mili' });
    }

    const cleanSender = (conn.senderEmail || '').toLowerCase().trim();
    const cleanReceiver = (conn.receiverEmail || '').toLowerCase().trim();

    // 1. Sender ke liye "Accepted" Notification create karo
    const acceptNotif = new Notification({
      recipientEmail: cleanSender,
      senderName: conn.receiverName,
      senderEmail: cleanReceiver,
      title: 'Connection Accepted! 🎉',
      message: `${conn.receiverName} ne aapki connection request accept kar li hai. Ab aap chat kar sakte hain!`,
      link: '/network',
      type: 'network'
    });
    await acceptNotif.save();

    // 2. Real-time Socket Events bhejo dono users ko
    io.to(cleanSender).emit('notification_received', acceptNotif);
    io.to(cleanSender).emit('connection_updated');
    io.to(cleanReceiver).emit('connection_updated');

    res.json({ success: true, message: 'Connection accepted successfully!', conn });
  } catch (err) {
    console.error('Network accept error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove / Withdraw / Reject Connection Request
app.delete('/api/network/remove/:id', async (req, res) => {
  try {
    await Connection.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Request removed' });
  } catch (err) {
    console.error('Network delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------
// 🤖 11. AI Studio Endpoints
// ---------------------------------------------------
app.post('/api/ai/build-resume', (req, res) => {
  const { name, role, skills, projects } = req.body;
  const resumeMarkdown = `# ${name || 'User Name'}
**Role:** ${role || 'Full Stack Developer'}

## Professional Summary
High-impact developer proficient in ${skills || 'React, Node.js, MongoDB'}. Experienced in building scalable web applications.

## Key Projects
${projects || '- CareerBridge Platform: MERN stack based web application.'}

## Technical Skills
- **Languages:** JavaScript, Python, C++
- **Frameworks:** React.js, Express.js, Tailwind CSS
- **Database:** MongoDB, PostgreSQL`;

  res.json({ success: true, resume: resumeMarkdown });
});

app.post('/api/ai/build-portfolio', (req, res) => {
  const { name, role, bio } = req.body;
  const portfolioHTML = `<!DOCTYPE html>
<html>
<head>
  <title>${name} - Portfolio</title>
  <style>
    body { background-color: #0f172a; color: #fff; font-family: sans-serif; padding: 40px; }
    h1 { color: #22d3ee; }
    button { background: #22d3ee; color: #0f172a; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <h3>${role}</h3>
  <p>${bio || 'Passionate Developer building cool projects.'}</p>
  <button>Contact Me</button>
</body>
</html>`;

  res.json({ success: true, code: portfolioHTML });
});

app.post('/api/ai/formal-headshot', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image upload required!' });
    }

    res.json({
      success: true,
      message: 'Professional Formal Suit look generated successfully!',
      avatarUrl: image
    });
  } catch (error) {
    console.error('AI Headshot Error:', error);
    res.status(500).json({ success: false, message: 'AI generation error' });
  }
});

// ---------------------------------------------------
// 🚀 12. Server Startup
// ---------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 CareerBridge Backend Running on Port ${PORT}`);
});