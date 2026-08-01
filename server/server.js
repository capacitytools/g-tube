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

// 1. Get All Videos
app.get('/api/videos', async (req, res) => {
    try {
        const { category } = req.query;
        const query = category && category !== 'All' ? { category } : {};
        const videos = await Video.find(query).sort({ createdAt: -1 });
        res.json(videos);    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// 2. Auto-Fetch Video Info (IMPROVED - with Instagram oEmbed)
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
        // Try to extract video ID for thumbnail
        const match = url.match(/facebook\.com\/(?:[^/]+\/)*(?:videos|permalink|photos)\/[^/]+\/(\d+)/);
        if (match) {
            // Facebook doesn't provide easy thumbnails, use placeholder
            info.thumbnail = 'https://www.facebook.com/images/fb_icon_325x325.png';
        } else {
            info.thumbnail = 'https://www.facebook.com/images/fb_icon_325x325.png';
        }
        info.title = 'Facebook Video';
    }
    else if (url.includes('instagram.com')) {
        info.platform = 'instagram';
        const match = url.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
        if (match) {
            info.videoId = match[1];
            // Use Instagram oEmbed to get thumbnail
            try {
                const oembedUrl = `https://www.instagram.com/oembed?url=${encodeURIComponent(url)}`;
                const response = await fetch(oembedUrl);
                const data = await response.json();
                if (data.thumbnail_url) {
                    info.thumbnail = data.thumbnail_url;
                }
                if (data.title) {
                    info.title = data.title;
                }
            } catch (e) {
                // Fallback if oEmbed fails
                info.thumbnail = `https://www.instagram.com/p/${info.videoId}/media/?size=l`;
            }        }
        info.embedUrl = url;
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
    }
});

// 4. Add Video (Admin Only)
app.post('/api/admin/videos', async (req, res) => {
    try {
        const { title, url, platform, category, thumbnail, embedUrl, videoId, description } = req.body;
        const newVideo = new Video({ title, url, platform, category, thumbnail, embedUrl, videoId, description });
        await newVideo.save();
        res.json({ message: 'Video added!', video: newVideo });
    } catch (error) {
        res.status(500).json({ message: 'Error adding video' });
    }
});

// 5. Update Video
app.put('/api/admin/videos/:id', async (req, res) => {
    try {
        const { title, description, thumbnail } = req.body;
        const video = await Video.findByIdAndUpdate(
            req.params.id,
            { title, description, thumbnail, updatedAt: Date.now() },
            { new: true }
        );
        if (!video) return res.status(404).json({ message: 'Video not found' });
        res.json({ message: 'Video updated!', video });
    } catch (error) {
        res.status(500).json({ message: 'Error updating video' });
    }});

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

module.exports = app;