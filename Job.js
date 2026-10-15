import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['Job', 'Internship', 'Referral'], required: true },
  description: { type: String, required: true },
  skillsRequired: [{ type: String }],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicants: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Applied', 'Selected', 'Rejected', 'Referred'], default: 'Applied' },
    appliedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);