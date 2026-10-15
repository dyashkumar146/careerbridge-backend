const express = require('express');
const router = express.Router();
const Post = require('./Post');

// 1. Saari posts fetch karne ke liye (GET /api/posts)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Posts fetch karne me error' });
  }
});

// 2. Nayi post create karne ke liye (POST /api/posts)
router.post('/', async (req, res) => {
  try {
    const { authorName, authorRole, authorEmail, content, mediaType, mediaUrl } = req.body;
    const newPost = new Post({
      authorName,
      authorRole,
      authorEmail,
      content,
      mediaType: mediaType || 'none',
      mediaUrl: mediaUrl || '',
      likes: [],
      comments: []
    });
    await newPost.save();
    res.status(201).json({ success: true, post: newPost });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Post save nahi ho saki' });
  }
});

// 3. Post like/unlike karne ke liye (PUT /api/posts/:id/like)
router.put('/:id/like', async (req, res) => {
  try {
    const { userEmail } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post nahi mili' });

    const alreadyLiked = post.likes.includes(userEmail);
    if (alreadyLiked) {
      post.likes = post.likes.filter((email) => email !== userEmail);
    } else {
      post.likes.push(userEmail);
    }
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Like update fail' });
  }
});

// 4. Comment add karne ke liye (POST /api/posts/:id/comment)
router.post('/:id/comment', async (req, res) => {
  try {
    const { userName, text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post nahi mili' });

    post.comments.push({ userName, text });
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Comment add nahi ho saka' });
  }
});

// 5. Post Delete karne ke liye (DELETE /api/posts/:id)
router.delete('/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ success: false, message: 'Post nahi mili' });
    res.json({ success: true, message: 'Post deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Post delete nahi ho saki' });
  }
});

// 6. Post Edit/Update karne ke liye (PUT /api/posts/:id)
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true }
    );
    if (!updatedPost) return res.status(404).json({ success: false, message: 'Post nahi mili' });
    res.json({ success: true, post: updatedPost });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Post update nahi ho saki' });
  }
});

module.exports = router;