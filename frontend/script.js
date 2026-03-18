/**
 * QUIT IT - FINAL CONSOLIDATED LOGIC
 * Features: Auth, BMI, Finance, AI Bot, Water, Health Recovery, Milestones, and Diet Log
 */

let habitChart;
let currentUser = null;
let waterCount = 0;
const API_URL = 'http://localhost:5000/api';

// --- 1. DATA STORAGE & AUTH ---
const DB = {
    getUsers: () => JSON.parse(localStorage.getItem('quitUsers')) || {},
    saveUser: (user) => {
        let users = DB.getUsers();
        users[user.email] = user;
        localStorage.setItem('quitUsers', JSON.stringify(users));
        currentUser = user;
    }
};

function toggleAuth() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('signup-form').classList.toggle('hidden');
}

async function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const name = document.getElementById('signup-name').value;
    const pass = document.getElementById('signup-password').value;

    if(!email || !name || !pass) return alert("Please fill all fields.");

    const newUser = {
        name, email, password: pass,
        age: document.getElementById('signup-age').value,
        height: document.getElementById('signup-height').value,
        weight: document.getElementById('signup-weight').value,
        disease: document.getElementById('signup-disease').value
    };

    try {
        const res = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        const data = await res.json();
        
        if (res.ok) {
            DB.saveUser(data.user); // Cache locally for the session logic
            alert("Account Created! You can now log in.");
            toggleAuth();
        } else {
            alert(data.error || "Registration failed");
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    try {
        const res = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const data = await res.json();

        if (res.ok) {
            DB.saveUser(data.user); // Cache locally
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            initDashboard();
        } else {
            alert(data.error || "Invalid Email or Password");
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// --- 2. CORE DASHBOARD ENGINE ---
function initDashboard() {
    if(!currentUser) return;
    
    // Initialize or Reset water from saved data
    const today = new Date().toDateString();
    if (currentUser.data.lastWaterDate !== today) {
        waterCount = 0; // New day start
        currentUser.data.waterHistory = 0;
        currentUser.data.lastWaterDate = today;
        syncUserData();
    } else {
        waterCount = currentUser.data.waterHistory || 0;
    }
    
    const waterBar = document.getElementById('water-bar');
    const waterStatus = document.getElementById('water-status');
    if (waterBar) waterBar.style.width = (waterCount / 12 * 100) + "%";
    if (waterStatus) waterStatus.innerText = `${waterCount} / 12 Glasses`;

    renderChart();
    renderProfile();
    updateFinance();
    updateLifeGained();
    updateHealthStatus();
    checkMilestones();
    renderDietLog();
    
    const targetEl = document.getElementById('daily-target');
    if (targetEl) targetEl.innerText = currentUser.data.target;
}

function logHabit() {
    const val = parseInt(document.getElementById('smokeInput').value);
    if (isNaN(val)) return alert("Please enter a valid number");

    // 1. Update History
    if (!currentUser.data.history) currentUser.data.history = [];
    currentUser.data.history.push(val);

    // 2. Financial Logic: (Target - Actually Smoked) * Price
    const savedToday = (currentUser.data.target - val) * (currentUser.data.price || 0.75);
    currentUser.data.savings = (currentUser.data.savings || 0) + savedToday;

    // 3. Dynamic Target Logic: Slowly reduce daily limit
    if(val <= currentUser.data.target && val > 0) {
        currentUser.data.target = Math.max(0, val - 1);
    }

    // 4. Persistence & UI Refresh
    syncUserData(); 
    initDashboard(); 
    document.getElementById('smokeInput').value = "";
}

async function syncUserData() {
    if (!currentUser) return;
    
    // Ensure no corrupted data is sent
    if (currentUser.data.history) {
        currentUser.data.history = currentUser.data.history.map(v => v < 0 ? 0 : v);
    }

    try {
        const res = await fetch('http://localhost:5000/api/user/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUser.email,
                data: currentUser.data
            })
        });
        const result = await res.json();
        if (res.ok) {
            DB.saveUser(result.user);
        }
    } catch (err) {
        console.error("Sync failed:", err);
    }
}

function animateValue(id, start, end, duration, prefix = "", suffix = "") {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.innerHTML = `${prefix}${current.toLocaleString()}${suffix}`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = `${prefix}${end.toLocaleString()}${suffix}`;
        }
    };
    window.requestAnimationFrame(step);
}

function updateFinance() {
    if(!currentUser) return;
    const currentSavings = parseFloat(document.getElementById('savings').innerText.replace('$', '')) || 0;
    animateValue('savings', currentSavings, currentUser.data.savings, 1000, "$");
    
    const dailySpendSpan = document.getElementById('daily-spend');
    const monthlyLossSpan = document.getElementById('monthly-loss');
    
    if(dailySpendSpan && monthlyLossSpan) {
        const history = currentUser.data.history || [];
        const lastEntry = history[history.length - 1] || 0;
        const dailySpend = lastEntry * (currentUser.data.price || 0.75);
        dailySpendSpan.innerText = `$${dailySpend.toFixed(2)}`;
        monthlyLossSpan.innerText = `$${(dailySpend * 30).toFixed(2)}`;
    }
}

// --- 3. ANALYTICS & VISUALS ---
function updateLifeGained() {
    const history = currentUser.data.history || [];
    let totalCigsSmoked = history.reduce((a,b) => a+b, 0);
    let baseline = history.length * 20; 
    let minsGained = (baseline - totalCigsSmoked) * 11;
    
    const currentMins = parseInt(document.getElementById('lifeGained').innerText) || 0;
    animateValue('lifeGained', currentMins, minsGained, 1200, "", " min");
}

function updateHealthStatus() {
    let history = currentUser.data.history || [];
    // Sanitize: Ignore negative numbers for health calculation
    history = history.filter(v => v >= 0);
    
    if (history.length === 0) return;

    // 1. Base Progress (Cumulative)
    let days = history.length;
    let totalCigsAvoided = history.reduce((a, b) => a + (20 - b), 0);
    let baseHealth = 5 + (days * 2) + (totalCigsAvoided * 0.2);

    // 2. Trend Adjustment (Dynamic)
    let trendBonus = 0;
    if (history.length >= 2) {
        const current = history[history.length - 1];
        const previousAverage = history.slice(0, -1).reduce((a, b) => a + b, 0) / (history.length - 1);
        
        if (current < previousAverage) {
            trendBonus = (previousAverage - current) * 3; 
        } else if (current > previousAverage) {
            trendBonus = (previousAverage - current) * 4; 
        }
    }

    let healthPercent = Math.max(2, Math.min(100, baseHealth + trendBonus));
    
    const healthBar = document.getElementById('health-bar');
    const healthDesc = document.getElementById('health-desc');
    const healthPct = document.getElementById('health-pct');

    if(healthBar) {
        setTimeout(() => {
            healthBar.style.width = healthPercent.toFixed(0) + "%";
            if (healthPct) healthPct.innerText = healthPercent.toFixed(0) + "%";
        }, 50);
        
        let statusText = "Establishing baseline recovery...";
        let statusColor = "var(--text-muted)";

        if (trendBonus < 0) {
            statusText = "⚠️ CRITICAL: Regression due to increased intake.";
            statusColor = "var(--danger)";
        } else if (trendBonus > 0) {
            statusText = "🩺 OPTIMAL: Ciliary function is regenerating.";
            statusColor = "var(--success)";
        } else if (healthPercent > 50) {
            statusText = "🫁 STABLE: Lung tissue inflammation reduced.";
            statusColor = "#3b82f6";
        } else if (healthPercent > 5) {
            statusText = "🧪 ACTIVE: Carbon monoxide clearing from bloodstream.";
            statusColor = "#60a5fa";
        }

        healthDesc.innerText = statusText;
        healthDesc.style.color = statusColor;
        healthBar.style.boxShadow = `0 0 20px ${statusColor}66`;
        healthBar.style.background = `linear-gradient(90deg, ${statusColor}, #3b82f6)`;
    }
}

function checkMilestones() {
    if (!currentUser) return;
    const b1 = document.getElementById('badge-1');
    const b2 = document.getElementById('badge-2');
    const b3 = document.getElementById('badge-3');
    const s1 = document.getElementById('status-1');
    const s2 = document.getElementById('status-2');
    const s3 = document.getElementById('status-3');

    const history = currentUser.data.history || [];
    const savings = currentUser.data.savings || 0;

    // 1. Novice (3 Data Entries)
    if (history.length >= 3) {
        b1.classList.add('unlocked');
        s1.innerText = "Completed";
    } else {
        s1.innerText = `${history.length}/3 Days`;
    }

    // 2. Saver ($50 Savings)
    if (savings >= 50) {
        b2.classList.add('unlocked');
        s2.innerText = "Unlocked";
    } else {
        s2.innerText = `$${Math.max(0, savings).toFixed(0)} / $50`;
    }
    
    // 3. Elite (3 Consecutive Zeros)
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] === 0) streak++;
        else break;
    }
    
    if (streak >= 3) {
        b3.classList.add('unlocked');
        s3.innerText = "Active";
    } else {
        s3.innerText = `${streak}/3 Streak`;
    }
}

function renderChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if(habitChart) habitChart.destroy();
    
    const history = currentUser.data.history || [];
    const cleanHistory = history.map(v => v < 0 ? 0 : v);
    
    habitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: cleanHistory.map((_, i) => `Day ${i + 1}`),
            datasets: [{ 
                label: 'Usage', 
                data: cleanHistory, 
                borderColor: '#3b82f6', 
                fill: true,
                tension: 0.3 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- 4. MODULES (DIET, WATER, SOS, AI) ---
const DIET_ITEMS = {
    'Antioxidants': ['Ginger', 'Berries', 'Green Tea', 'Turmeric', 'Garlic'],
    'Detox': ['Broccoli', 'Kale', 'Spinach', 'Cabbage', 'Cauliflower']
};

function openDietModal(category) {
    const modal = document.getElementById('diet-modal');
    const title = document.getElementById('diet-modal-title');
    const select = document.getElementById('diet-item-select');
    
    title.innerText = `Add ${category}`;
    select.innerHTML = DIET_ITEMS[category].map(item => `<option value="${item}">${item}</option>`).join('');
    modal.classList.remove('hidden');
}

function closeDietModal() {
    document.getElementById('diet-modal').classList.add('hidden');
}

function confirmDietLog() {
    const item = document.getElementById('diet-item-select').value;
    logDiet(item);
    closeDietModal();
}

function logDiet(item) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!currentUser.data.dietHistory) currentUser.data.dietHistory = [];
    currentUser.data.dietHistory.unshift({ item, time: timestamp });
    if (currentUser.data.dietHistory.length > 5) currentUser.data.dietHistory.pop();
    
    syncUserData();
    renderDietLog();
}

function renderDietLog() {
    const dietLog = document.getElementById('diet-log');
    if(!dietLog) return;
    if (!currentUser || !currentUser.data.dietHistory || currentUser.data.dietHistory.length === 0) {
        dietLog.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem;">No data entries for today.</p>`;
        return;
    }

    const itemIcons = {
        'Ginger': '🫚', 'Berries': '🫐', 'Green Tea': '🍵', 'Turmeric': '🟡', 'Garlic': '🧄',
        'Broccoli': '🥦', 'Kale': '🥬', 'Spinach': '🍃', 'Cabbage': '🥗', 'Cauliflower': '⚪'
    };

    dietLog.innerHTML = currentUser.data.dietHistory.map(log => `
        <div class="diet-entry">
            <div class="diet-icon">${itemIcons[log.item] || '🥗'}</div>
            <div class="diet-info">
                <span class="diet-name">${log.item}</span>
                <span class="diet-time">Log Time: ${log.time}</span>
            </div>
            <div class="diet-tag">Verified</div>
        </div>
    `).join('');
}

function addWater(val) {
    waterCount = Math.min(12, waterCount + val);
    const waterBar = document.getElementById('water-bar');
    const waterStatus = document.getElementById('water-status');
    if (waterBar) waterBar.style.width = (waterCount / 12 * 100) + "%";
    if (waterStatus) waterStatus.innerText = `${waterCount} / 12 Glasses`;
    
    if (!currentUser.data) currentUser.data = {};
    currentUser.data.waterHistory = waterCount;
    currentUser.data.lastWaterDate = new Date().toDateString();
    syncUserData();
}

async function askAI() {
    const inputField = document.getElementById('ai-chat-input');
    const content = inputField.value.trim();
    const feed = document.getElementById('ai-chat-feed');
    const typing = document.getElementById('typing-indicator');
    
    if(!content || !currentUser) return;

    // 1. Add User Message
    const userMsg = `
        <div class="chat-msg own">
            <div class="chat-header"><span class="chat-user">You</span></div>
            <div class="chat-content">${content}</div>
        </div>`;
    feed.innerHTML += userMsg;
    inputField.value = "";
    feed.scrollTop = feed.scrollHeight;

    // 2. Show Reasoning Phase
    typing.classList.remove('hidden');
    const reasoningText = document.createElement('div');
    reasoningText.style.fontSize = "0.75rem";
    reasoningText.style.color = "var(--primary)";
    reasoningText.style.paddingLeft = "20px";
    reasoningText.style.fontStyle = "italic";
    reasoningText.id = "ai-reasoning";
    reasoningText.innerText = "Coach is connecting to Gemini Intelligence...";
    feed.appendChild(reasoningText);
    feed.scrollTop = feed.scrollHeight;

    try {
        const response = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: content,
                userData: {
                    days: (currentUser.data.history || []).length,
                    savings: currentUser.data.savings || 0
                }
            })
        });

        const data = await response.json();
        const reply = data.reply || "I'm having trouble connecting right now. Let's try again in a moment!";

        const coachMsg = `
            <div class="chat-msg">
                <div class="chat-header"><span class="chat-user">Coach</span></div>
                <div class="chat-content">${reply.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div>
            </div>`;
        
        typing.classList.add('hidden');
        if(document.getElementById('ai-reasoning')) document.getElementById('ai-reasoning').remove();
        feed.innerHTML += coachMsg;
        feed.scrollTop = feed.scrollHeight;
    } catch (error) {
        console.error("AI Error:", error);
        typing.classList.add('hidden');
        if(document.getElementById('ai-reasoning')) document.getElementById('ai-reasoning').remove();
        alert("Coach is currently offline. Please check your connection.");
    }
}


function renderProfile() {
    const bmi = (currentUser.weight / ((currentUser.height / 100) ** 2)).toFixed(1);
    document.getElementById('profile-info').innerHTML = `
        <p><strong>Name:</strong> ${currentUser.name}</p>
        <p><strong>BMI:</strong> ${bmi}</p>
        <p><strong>Condition:</strong> ${currentUser.disease || 'None'}</p>
    `;
}

async function saveProfileEdit() {
    const newWeight = document.getElementById('edit-weight').value;
    const newDisease = document.getElementById('edit-disease').value;
    if (!newWeight && !newDisease) return alert("Please enter weight or condition to update.");

    try {
        const res = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUser.email,
                weight: newWeight || currentUser.weight,
                disease: newDisease || currentUser.disease
            })
        });
        const data = await res.json();
        if (res.ok) {
            DB.saveUser(data.user);
            alert("Profile saved!");
            document.getElementById('edit-weight').value = "";
            document.getElementById('edit-disease').value = "";
            renderProfile();
        } else {
            alert(data.error || "Failed to save profile");
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// --- 5. COMMUNITY CHAT SYSTEM ---
async function addPost() {
    const input = document.getElementById('postInput');
    const content = input.value.trim();
    if (!content || !currentUser) return;

    try {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: currentUser.name,
                userEmail: currentUser.email,
                content: content
            })
        });
        if (res.ok) {
            input.value = "";
            fetchPosts(); 
        }
    } catch (err) {
        console.error("Chat error:", err);
    }
}

async function fetchPosts() {
    const feed = document.getElementById('community-feed');
    if (!feed) return;

    try {
        const res = await fetch(`${API_URL}/messages`);
        const messages = await res.json();
        
        if (messages.length === 0) {
            feed.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:50px;">
                <p style="font-size:2rem; opacity:0.3;">💬</p>
                <p>No messages yet. Be the first to share your milestone!</p>
            </div>`;
            return;
        }

        feed.innerHTML = messages.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)).map(msg => `
            <div class="chat-msg ${msg.userEmail === currentUser.email ? 'own' : ''}">
                <div class="chat-header">
                    <span class="chat-user">${msg.userName}</span>
                    <span class="chat-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="chat-content">${msg.content}</div>
            </div>
        `).join('');
        
        feed.scrollTop = feed.scrollHeight;
    } catch (err) {
        console.error("Fetch feed error:", err);
    }
}

// Auto-poll every 4s
setInterval(() => {
    const communitySection = document.getElementById('community');
    if (communitySection && !communitySection.classList.contains('hidden')) {
        fetchPosts();
    }
}, 4000);

function showSection(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'community') fetchPosts();
}

function handleLogout() { location.reload(); }