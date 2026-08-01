const API_URL = window.location.origin;
let adminToken = localStorage.getItem('adminToken');
let currentCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
    loadVideos();
});

async function loadVideos() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="loading">Loading videos...</div>';
    
    try {
        let url = `${API_URL}/api/videos`;
        if (currentCategory !== 'All') {
            url += `?category=${currentCategory}`;
        }
        
        const res = await fetch(url);
        const videos = await res.json();
        
        if (videos.length === 0) {
            mainContent.innerHTML = '<div class="loading">No videos yet. Check back soon!</div>';
            return;
        }

        mainContent.innerHTML = videos.map(video => `
            <div class="video-card" onclick='openVideo(${JSON.stringify(video).replace(/'/g, "\\'")})'>
                <img src="${video.thumbnail || 'https://via.placeholder.com/300x169'}" 
                     class="thumbnail" 
                     alt="${video.title}"
                     onerror="this.src='https://via.placeholder.com/300x169?text=${video.platform}+Video'">
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">
                        <span>${video.platform.toUpperCase()}</span>
                        <span>${video.category}</span>
                    </div>
                    ${video.description ? `<p style="color:#888;font-size:12px;margin-top:5px;">${video.description.substring(0, 60)}...</p>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        mainContent.innerHTML = '<div class="loading">Error loading videos.</div>';
    }
}

function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.cat-btn').forEach(btn => {        btn.classList.remove('active');
        if (btn.innerText === category) btn.classList.add('active');
    });
    loadVideos();
}

function openVideo(video) {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('playerContainer');
    const details = document.getElementById('videoDetails');

    let embedHtml = '';
    
    if (video.platform === 'youtube') {
        embedHtml = `<iframe src="${video.embedUrl}" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`;
    } 
    else if (video.platform === 'facebook') {
        // Facebook embed with better error handling
        embedHtml = `
            <div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;">
                <iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.url)}&show_text=false&width=560&height=315" 
                    width="100%" height="100%" style="border:none;overflow:hidden" scrolling="no" 
                    frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
                </iframe>
                <div id="fbError" style="display:none;position:absolute;color:white;text-align:center;padding:20px;">
                    <p style="font-size:20px;margin-bottom:10px;">️ Video Unavailable</p>
                    <p>This Facebook video may be private or deleted.</p>
                    <a href="${video.url}" target="_blank" style="color:#4169E1;margin-top:10px;display:inline-block;">Watch on Facebook →</a>
                </div>
            </div>
            <script>
                setTimeout(function() {
                    var iframe = document.querySelector('iframe');
                    if (iframe && iframe.clientHeight === 0) {
                        document.getElementById('fbError').style.display = 'block';
                    }
                }, 3000);
            </script>
        `;
    } 
    else if (video.platform === 'instagram') {
        embedHtml = `
            <div style="width:100%;height:100%;overflow:auto;background:#000;">
                <blockquote class="instagram-media" 
                    data-instgrm-permalink="${video.url}" 
                    data-instgrm-version="14" 
                    style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
                </blockquote>
            </div>
        `;    }

    player.innerHTML = `<div class="video-player">${embedHtml}</div>`;
    
    let descriptionHTML = '';
    if (video.description) {
        descriptionHTML = `<p style="color:#aaa;margin-top:10px;">${video.description}</p>`;
    }
    
    details.innerHTML = `
        <h2>${video.title}</h2>
        <p style="color:#888; margin-top:5px;">${video.category} • ${video.platform.toUpperCase()}</p>
        ${descriptionHTML}
        ${video.platform === 'facebook' ? `<p style="color:#ffb800;margin-top:10px;font-size:12px;">⚠️ If video doesn't load, it may be set to Private on Facebook</p>` : ''}
    `;
    
    modal.classList.add('active');
    
    if (video.platform === 'instagram') {
        setTimeout(() => {
            if (window.instgrm) {
                window.instgrm.Embeds.process();
            }
        }, 1000);
    }
}

function closeModal() {
    document.getElementById('videoModal').classList.remove('active');
    document.getElementById('playerContainer').innerHTML = '';
}

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
        if (adminToken) {            renderAdminPanel();
        } else {
            renderLoginScreen();
        }
    }
}

function renderLoginScreen() {
    document.getElementById('mainContent').innerHTML = `
        <div class="login-container">
            <h2 style="margin-bottom:20px;">Admin Login</h2>
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
    } catch (error) {        alert('Connection error.');
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

async function renderAdminPanel() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="loading">Loading admin panel...</div>';
    
    try {
        const res = await fetch(`${API_URL}/api/videos`);
        const videos = await res.json();
        
        mainContent.innerHTML = `
            <div class="admin-container" style="max-width:100%;">
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
                <div class="form-group">
                    <label>Description (Optional)</label>
                    <textarea id="videoDescription" rows="2" placeholder="Add a description..." style="width:100%;padding:10px;background:#0f0f0f;border:1px solid #333;color:white;border-radius:8px;"></textarea>
                </div>
                <button class="btn" id="addBtn" onclick="addVideo()">✨ Auto-Add Video</button>
                <button class="btn" style="background:#333; margin-top:10px;" onclick="logout()">Logout</button>
                
                <h3 style="margin-top:40px;margin-bottom:20px;">All Videos (${videos.length})</h3>
                <div style="display:grid;gap:15px;">
                    ${videos.map(video => `
                        <div style="background:#272727;padding:15px;border-radius:10px;display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                            <img src="${video.thumbnail || 'https://via.placeholder.com/100x60'}" 
                                 style="width:120px;height:68px;object-fit:cover;border-radius:5px;"
                                 onerror="this.src='https://via.placeholder.com/100x60?text=${video.platform}'">
                            <div style="flex:1;min-width:200px;">
                                <h4 style="margin-bottom:5px;">${video.title}</h4>
                                <p style="color:#888;font-size:12px;">${video.platform} • ${video.category}</p>
                                ${video.description ? `<p style="color:#aaa;font-size:11px;margin-top:5px;">${video.description}</p>` : ''}
                            </div>                            <button class="btn" style="width:auto;padding:8px 15px;background:#4169E1;" onclick='editVideo(${JSON.stringify(video).replace(/'/g, "\\'")})'>✏️ Edit</button>
                            <button class="btn" style="width:auto;padding:8px 15px;background:#ff4444;" onclick="deleteVideo('${video._id}')">🗑️ Delete</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        mainContent.innerHTML = '<div class="loading">Error loading videos.</div>';
    }
}

async function addVideo() {
    const btn = document.getElementById('addBtn');
    btn.innerText = "Adding...";
    btn.disabled = true;

    const url = document.getElementById('videoLink').value;
    const category = document.getElementById('videoCategory').value;
    const description = document.getElementById('videoDescription').value;
    
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: info.title || 'New Video',
                url: url,
                platform: info.platform,
                category: category,
                thumbnail: info.thumbnail,
                embedUrl: info.embedUrl,
                videoId: info.videoId,
                description: description
            })
        });

        if (saveRes.ok) {
            alert('Video added successfully!');
            document.getElementById('videoLink').value = '';            document.getElementById('videoDescription').value = '';
            renderAdminPanel();
        } else {
            alert('Error adding video.');
        }
    } catch (error) {
        alert('Connection error.');
    }
    btn.innerText = "✨ Auto-Add Video";
    btn.disabled = false;
}

function editVideo(video) {
    document.getElementById('editVideoId').value = video._id;
    document.getElementById('editTitle').value = video.title;
    document.getElementById('editDescription').value = video.description || '';
    document.getElementById('editThumbnail').value = video.thumbnail || '';
    document.getElementById('editModal').classList.add('active');
}

async function saveVideoEdit() {
    const videoId = document.getElementById('editVideoId').value;
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const thumbnail = document.getElementById('editThumbnail').value;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/videos/${videoId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ title, description, thumbnail })
        });
        
        if (res.ok) {
            alert('Video updated!');
            closeEditModal();
            renderAdminPanel();
        } else {
            alert('Error updating video');
        }
    } catch (error) {
        alert('Connection error');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');}

async function deleteVideo(videoId) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
        const res = await fetch(`${API_URL}/api/admin/videos/${videoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (res.ok) {
            alert('Video deleted!');
            renderAdminPanel();
        } else {
            alert('Error deleting video');
        }
    } catch (error) {
        alert('Connection error');
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    adminToken = null;
    renderLoginScreen();
}