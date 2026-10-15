const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  role: { type: String, enum:['Student','Alumni','Admin'], default: 'Student' },
  targetRole:{type: String, default: ''},
  branch: { type: String, default: 'CSE' },
  graduationYear: { type: String, default: '2026' },
  college: { type: String, default: '' },
  cgpa: { type: String, default: '' },
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  skills: { type: String, default: '' },
  bio: { type: String, default: '' },
  projectTitle: { type: String, default: '' },
  projectTech: { type: String, default: '' },
  projectDesc: { type: String, default: '' },
  projectLink: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);