const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  authorName: { type: String, required: true },
  authorRole: { type: String, default: 'Student' },
  authorEmail: { type: String, required: true },
  content: { type: String, required: true },
  mediaType: { 
    type: String, 
    enum: ['none', 'image', 'video', 'document'], 
    default: 'none' 
  },
  mediaUrl: { type: String, default: '' },
  likes: [{ type: String }], // Array of user emails who liked
  comments: [
    {
      userName: String,
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);