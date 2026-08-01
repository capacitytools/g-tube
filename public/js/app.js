const API_URL = window.location.origin;
let adminToken = localStorage.getItem('adminToken');

// Load videos when page opens
document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
    if (window.location.hash === '#admin') {
        showPage('admin');
    }
});

// 1. Load and Display Videos
async function loadVideos() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="loading">Loading videos...</div>';
    
    try {
        const res = await fetch(`${API_URL}/api/videos`);
        const videos = await res.json();
        
        if (videos.length === 0) {
            mainContent.innerHTML = '<div class="loading">No videos yet. Check back soon!</div>';
            return;
        }

        mainContent.innerHTML = videos.map(video => `
            <div class="video-card" onclick='openVideo(${JSON.stringify(video).replace(/'/g, "\\'")})'>
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
    } 
    else if (video.platform === 'facebook') {
        embedHtml = `<iframe src="${video.embedUrl}" width="560" height="315" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
    } 
    else if (video.platform === 'instagram') {
        embedHtml = `<iframe src="${video.embedUrl}" width="400" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`;
    }

    player.innerHTML = `<div class="video-player">${embedHtml}</div>`;
    details.innerHTML = `<h2>${video.title}</h2><p style="color:#aaa; margin-top:5px;">${video.category}</p>`;
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('videoModal').classList.remove('active');
    document.getElementById('playerContainer').innerHTML = '';
}

// 3. Navigation Switching
function showPage(page) {
    const mainContent = document.getElementById('mainContent');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const buttons = document.querySelectorAll('.nav-item');
    if(page === 'home') buttons[0].classList.add('active');
    if(page === 'gchat') buttons[1].classList.add('active');
    if(page === 'admin') buttons[2].classList.add('active');
    if(page === 'rewards') buttons[3].classList.add('active');

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
        <div class="login-container">            <h2 style="margin-bottom:20px;">Admin Login</h2>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="loginUser" value="admin">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="loginPass" value="admin123">
            </div>
            <button class="btn" id="loginBtn" onclick="doLogin()">Login</button>
        </div>
    `;
}

async function doLogin() {
    const btn = document.getElementById('loginBtn');
    btn.innerText = "Logging in...";
    btn.disabled = true;

    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        if (data.token) {
            adminToken = data.token;
            localStorage.setItem('adminToken', data.token);
            renderAdminPanel();
        } else {
            alert(data.message || 'Login failed');
            btn.innerText = "Login";
            btn.disabled = false;
        }
    } catch (error) {
        alert('Connection error. Please check your internet.');
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

// 5. Admin Dashboard (The "Paste Link" Magic)
function renderAdminPanel() {
    document.getElementById('mainContent').innerHTML = `
        <div class="admin-container">            <h2 style="margin-bottom:20px;">Add New Video</h2>
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
            <button class="btn" id="addBtn" onclick="addVideo()">✨ Auto-Add Video</button>
            <button class="btn" style="background:#333; margin-top:10px;" onclick="logout()">Logout</button>
        </div>
    `;
}

async function addVideo() {
    const btn = document.getElementById('addBtn');
    btn.innerText = "Adding...";
    btn.disabled = true;

    const url = document.getElementById('videoLink').value;
    const category = document.getElementById('videoCategory').value;
    if (!url) {
        alert('Please paste a link!');
        btn.innerText = "✨ Auto-Add Video";
        btn.disabled = false;
        return;
    }

    try {
        const infoRes = await fetch(`${API_URL}/api/fetch-video-info?url=${encodeURIComponent(url)}`);
        const info = await infoRes.json();

        const saveRes = await fetch(`${API_URL}/api/admin/videos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: info.title || 'New Video',
                url: url,
                platform: info.platform,
                category: category,
                thumbnail: info.thumbnail,                embedUrl: info.embedUrl,
                videoId: info.videoId
            })
        });

        if (saveRes.ok) {
            alert('Video added successfully!');
            showPage('home');
        } else {
            alert('Error adding video.');
        }
    } catch (error) {
        alert('Connection error.');
    }
    btn.innerText = "✨ Auto-Add Video";
    btn.disabled = false;
}

function logout() {
    localStorage.removeItem('adminToken');
    adminToken = null;
    renderLoginScreen();
}