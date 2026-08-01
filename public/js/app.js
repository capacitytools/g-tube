const API_URL = window.location.origin;
let adminToken = localStorage.getItem('adminToken');

// Load videos when page opens
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    checkAdminStatus();
});

// 1. Load and Display Videos
async function loadVideos() {
    const mainContent = document.getElementById('mainContent');
    try {
        const res = await fetch(`${API_URL}/api/videos`);
        const videos = await res.json();
        
        if (videos.length === 0) {
            mainContent.innerHTML = '<div class="loading">No videos yet. Check back soon!</div>';
            return;
        }

        mainContent.innerHTML = videos.map(video => `
            <div class="video-card" onclick='openVideo(${JSON.stringify(video)})'>
                <img src="${video.thumbnail || 'https://via.placeholder.com/300x169'}" class="thumbnail" alt="${video.title}">
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">
                        <span>${video.platform.toUpperCase()}</span>
                        <span>${video.category}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        mainContent.innerHTML = '<div class="loading">Error loading videos.</div>';
    }
}

// 2. Play Video in Modal (Embedded!)
function openVideo(video) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('playerContainer');
    const details = document.getElementById('videoDetails');

    let embedHtml = '';
    if (video.platform === 'youtube') {
        embedHtml = `<iframe src="${video.embedUrl}" allowfullscreen></iframe>`;
    } else if (video.platform === 'facebook') {
        embedHtml = `<iframe src="${video.embedUrl}" allowfullscreen></iframe>`;
    } else if (video.platform === 'instagram') {        embedHtml = `<iframe src="https://www.instagram.com/p/${video.videoId}/embed" allowfullscreen></iframe>`;
    }

    player.innerHTML = `<div class="video-player">${embedHtml}</div>`;
    details.innerHTML = `<h2>${video.title}</h2><p style="color:#aaa; margin-top:5px;">${video.category}</p>`;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('videoModal').classList.remove('active');
    document.getElementById('playerContainer').innerHTML = ''; // Stop video
}

// 3. Navigation Switching
function showPage(page) {
    const mainContent = document.getElementById('mainContent');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (page === 'home') {
        loadVideos();
    } else if (page === 'gchat') {
        mainContent.innerHTML = '<div class="loading">💬 G-Chat is coming soon!</div>';
    } else if (page === 'rewards') {
        mainContent.innerHTML = '<div class="loading">🎁 Daily AI Quiz coming soon!</div>';
    } else if (page === 'admin') {
        if (adminToken) {
            renderAdminPanel();
        } else {
            renderLoginScreen();
        }
    }
}

// 4. Admin Login Screen
function renderLoginScreen() {
    document.getElementById('mainContent').innerHTML = `
        <div class="login-container">
            <h2 style="margin-bottom:20px;">Admin Login</h2>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="loginUser">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="loginPass">
            </div>
            <button class="btn" onclick="doLogin()">Login</button>
        </div>
    `;}

async function doLogin() {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    
    const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (data.token) {
        adminToken = data.token;
        localStorage.setItem('adminToken', token);
        renderAdminPanel();
    } else {
        alert(data.message);
    }
}

// 5. Admin Dashboard (The "Paste Link" Magic)
function renderAdminPanel() {
    document.getElementById('mainContent').innerHTML = `
        <div class="admin-container">
            <h2 style="margin-bottom:20px;">Add New Video</h2>
            <div class="form-group">
                <label>Paste Video Link (YouTube, FB, Insta)</label>
                <input type="url" id="videoLink" placeholder="https://...">
            </div>
            <div class="form-group">
                <label>Category</label>
                <select id="videoCategory">
                    <option value="Tech">Tech</option>
                    <option value="Health">Health</option>
                    <option value="Business">Business</option>
                    <option value="Relationship">Relationship</option>
                    <option value="GeneralVideos">General</option>
                </select>
            </div>
            <button class="btn" onclick="addVideo()">✨ Auto-Add Video</button>
            <button class="btn" style="background:#333; margin-top:10px;" onclick="logout()">Logout</button>
        </div>
    `;
}

async function addVideo() {
    const url = document.getElementById('videoLink').value;
    const category = document.getElementById('videoCategory').value;    if (!url) return alert('Please paste a link!');

    // Step 1: Fetch info from our backend
    const infoRes = await fetch(`${API_URL}/api/fetch-video-info?url=${encodeURIComponent(url)}`);
    const info = await infoRes.json();

    // Step 2: Save to database
    const saveRes = await fetch(`${API_URL}/api/admin/videos`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            title: info.title || 'New Video',
            url: url,
            platform: info.platform,
            category: category,
            thumbnail: info.thumbnail,
            embedUrl: info.embedUrl,
            videoId: info.videoId
        })
    });

    if (saveRes.ok) {
        alert('Video added successfully!');
        showPage('home');
    } else {
        alert('Error adding video.');
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    adminToken = null;
    renderLoginScreen();
}

function checkAdminStatus() {
    if (!adminToken) return;
    // Optional: verify token is still valid
}