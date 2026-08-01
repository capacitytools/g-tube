const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// --- DATABASE MODELS ---
const VideoSchema = new mongoose.Schema({
    title: String,
    description: String,
    url: String,
    platform: String,
    category: String,
    thumbnail: String,
    embedUrl: String,
    videoId: String,
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: String
});

const Video = mongoose.model('Video', VideoSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// --- ROUTES ---

// 1. Get All Videos (For Homepage)
app.get('/api/videos', async (req, res) => {
    try {
        const { category } = req.query;
        const query = category && category !== 'All' ? { category } : {};
        const videos = await Video.find(query).sort({ createdAt: -1 });
        res.json(videos);    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// 2. Auto-Fetch Video Info (The Magic Link Feature)
app.get('/api/fetch-video-info', async (req, res) => {
    const url = req.query.url;
    let info = { url, platform: 'general', videoId: '', embedUrl: '', thumbnail: '', title: 'Video' };

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        info.platform = 'youtube';
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        info.videoId = match ? match[1] : '';
        info.embedUrl = `https://www.youtube.com/embed/${info.videoId}`;
        info.thumbnail = `https://img.youtube.com/vi/${info.videoId}/maxresdefault.jpg`;
    } 
    else if (url.includes('facebook.com') || url.includes('fb.watch')) {
        info.platform = 'facebook';
        info.embedUrl = url;
        info.thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png';
    }
    else if (url.includes('instagram.com')) {
        info.platform = 'instagram';
        const match = url.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
        if (match) {
            info.videoId = match[1];
        }
        info.embedUrl = url;
        info.thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png';
    }

    res.json(info);
});

// 3. Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(401).json({ message: 'Wrong username' });
        
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Wrong password' });
        
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Login error' });
    }});

// 4. Add Video (Admin Only)
app.post('/api/admin/videos', async (req, res) => {
    try {
        const { title, url, platform, category, thumbnail, embedUrl, videoId } = req.body;
        const newVideo = new Video({ title, url, platform, category, thumbnail, embedUrl, videoId });
        await newVideo.save();
        res.json({ message: 'Video added!', video: newVideo });
    } catch (error) {
        res.status(500).json({ message: 'Error adding video' });
    }
});

// 5. Update Video (Edit title/description)
app.put('/api/admin/videos/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { title, description, updatedAt: Date.now() },
            { new: true }
        );
        if (!video) return res.status(404).json({ message: 'Video not found' });
        res.json({ message: 'Video updated!', video });
    } catch (error) {
        res.status(500).json({ message: 'Error updating video' });
    }
});

// 6. Delete Video
app.delete('/api/admin/videos/:id', async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });
        res.json({ message: 'Video deleted!' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting video' });
    }
});

// Tell Vercel to run this app
module.exports = app;