require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ MongoDB Connection Error: ", err));

const PORT = 5000;

// Placeholder route to test the server
app.get('/', (req, res) => {
    res.send("Quit It Backend is Running!");
});
const SYSTEM_PROMPT = `
You are the "Quit It" AI Recovery Coach, a world-class clinical motivator and health expert.
Your goal is to help users quit smoking permanently.

GUIDELINES:
1. Speak with professional empathy, precision, and high energy.
2. Provide medically-backed facts about lungs, heart, and skin recovery.
3. Offer concrete, multi-step problem-solving strategies for cravings and stress.
4. Reference the user's progress if data is provided (Savings, Days Quit).
5. If the user is struggling, be their beacon of hope.
6. Use clear formatting (bullets, bold text) in your responses like a professional LLM.

Tone: "Gemini" - Scientific yet deeply encouraging.
`;

const LOCAL_COACH_BRAIN = {
    cravings: [
        "Cravings are temporary—they usually peak within 5-10 minutes. 🧘‍♂️ Try the 4-7-8 breathing method: Inhale for 4 seconds, hold for 7, and exhale slowly for 8. It resets your nervous system.",
        "When a craving hits, your brain is looking for a dopamine hit. 🏃‍♂️ Do something physical—20 jumping jacks or a brisk walk. This releases natural endorphins that fight the craving.",
        "Ice-cold water is a secret weapon! 🧊 Drink a large glass slowly. The cold sensation shocks the vagus nerve and can instantly dim a craving."
    ],
    health: [
        "Your lungs are already starting to clear! 🫁 Within 12 hours, the carbon monoxide levels in your blood normalize. Imagine your cells finally getting the clean oxygen they've been waiting for.",
        "Your heart is thanking you. ❤️ Your blood pressure and heart rate begin to settle within just 20 minutes of your last cigarette. You are literally extending your life right now.",
        "Science fact: Your sense of taste and smell will sharpen significantly within 48 hours. 🍏 Try eating a piece of fruit today—you might notice flavors you haven't tasted in years."
    ],
    sleep: [
        "Nicotine withdrawal can mess with sleep, but it's temporary. 😴 Try to avoid caffeine after 2 PM and keep your room cool. Your body is relearning how to rest naturally.",
        "If you're restless, try 'progressive muscle relaxation.' Tense and then release each muscle group from your toes to your forehead. It’s a powerful natural sedative."
    ],
    money: [
        "Think of your savings as a 'Freedom Fund.' 💰 If you've saved $50, that's a nice dinner or a new shirt. In a month, it's a weekend getaway. You're no longer 'burning' your hard-earned cash.",
        "Financial freedom is part of recovery. Every pack not bought is an investment in your future. What's the one thing you've always wanted but felt was too expensive? You're buying it now, one day at a time."
    ],
    stress: [
        "You aren't losing a 'stress-reliever'; you're losing a major source of stress. 🧘‍♀️ Nicotine actually increases your heart rate and cortisol. True peace comes from within, not from a habit.",
        "When things get tough, remember: 'This too shall pass.' You have survived every hard day of your life so far. You can survive this hour too."
    ],
    generic: [
        "I'm impressed by your commitment. 🌟 Every hour you stay smoke-free is a massive victory for your future self.",
        "You're not 'giving up' something; you're gaining everything—health, money, and time. Keep going!",
        "The first few days are the hardest, but they are also when your body does the most healing. You're doing the heavy lifting right now!"
    ]
};

function getLocalResponse(msg) {
    const text = msg.toLowerCase();
    
    if (text.includes('sleep') || text.includes('night') || text.includes('wake')) 
        return LOCAL_COACH_BRAIN.sleep[Math.floor(Math.random() * LOCAL_COACH_BRAIN.sleep.length)];
    
    if (text.includes('crav') || text.includes('want') || text.includes('smoke') || text.includes('need')) 
        return LOCAL_COACH_BRAIN.cravings[Math.floor(Math.random() * LOCAL_COACH_BRAIN.cravings.length)];
    
    if (text.includes('health') || text.includes('lung') || text.includes('heart') || text.includes('body')) 
        return LOCAL_COACH_BRAIN.health[Math.floor(Math.random() * LOCAL_COACH_BRAIN.health.length)];
    
    if (text.includes('money') || text.includes('save') || text.includes('cost') || text.includes('price')) 
        return LOCAL_COACH_BRAIN.money[Math.floor(Math.random() * LOCAL_COACH_BRAIN.money.length)];
    
    if (text.includes('stress') || text.includes('hard') || text.includes('tired') || text.includes('angry')) 
        return LOCAL_COACH_BRAIN.stress[Math.floor(Math.random() * LOCAL_COACH_BRAIN.stress.length)];

    return LOCAL_COACH_BRAIN.generic[Math.floor(Math.random() * LOCAL_COACH_BRAIN.generic.length)];
}

app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, userData } = req.body;
        
        // 1. Try Gemini
        if (process.env.GEMINI_API_KEY) {
            const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
            for (const modelName of modelsToTry) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const context = userData ? ` User Data: Days Quit: ${userData.days}, Savings: $${userData.savings}.` : "";
                    const prompt = `${SYSTEM_PROMPT}\n\n${context}\nUser: ${message}\nCoach:`;

                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    console.log(`✅ Success with ${modelName}`);
                    return res.json({ reply: response.text() });
                } catch (err) {
                    console.warn(`❌ Model ${modelName} unavailable.`);
                    continue; 
                }
            }
        }

        // 2. Fallback to Upgraded Local Brain
        console.log("🛠️ Using Upgraded Local Fail-Safe Brain...");
        const reply = getLocalResponse(message);
        res.json({ reply: reply });

    } catch (error) {
        console.error("Critical AI Error:", error);
        res.status(500).json({ error: "Major system error." });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
const Log = require('./models/Log');

// API to receive smoking data from the frontend
app.post('/api/logs', async (req, res) => {
    try {
        const { cigarettesSmoked, userId } = req.body;
        
        // Calculate savings (e.g., $0.50 saved per cigarette not smoked)
        const pricePerCig = 0.50; 
        const dailySavings = cigarettesSmoked * pricePerCig; 

        const newLog = new Log({
            userId,
            cigarettesSmoked,
            savings: dailySavings
        });

        await newLog.save();
        res.status(201).json({ message: "Log saved successfully!", data: newLog });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const User = require('./models/User');

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, age, height, weight, disease } = req.body;
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if(existingUser) {
            return res.status(400).json({ error: "Email already registered." });
        }
        
        const newUser = new User({ name, email, password, age, height, weight, disease });
        await newUser.save();
        res.status(201).json({ message: "Account Created!", user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if(user && user.password === password) {
            res.status(200).json({ message: "Login successful", user });
        } else {
            res.status(401).json({ error: "Invalid Email or Password" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/profile', async (req, res) => {
    try {
        const { email, weight, disease } = req.body;
        const user = await User.findOneAndUpdate(
            { email },
            { $set: { weight, disease } },
            { new: true } // returns the updated document
        );
        if(user) {
            res.status(200).json({ message: "Profile updated", user });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const Message = require('./models/Message');

app.put('/api/user/data', async (req, res) => {
    try {
        const { email, data } = req.body;
        
        // Server-side validation/sanitization
        if (data && data.history && Array.isArray(data.history)) {
            data.history = data.history.map(v => Math.max(0, Number(v) || 0));
        }

        const user = await User.findOneAndUpdate(
            { email },
            { $set: { data: data } },
            { new: true }
        );
        if(user) {
            res.status(200).json({ message: "Data synced", user });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// COMMUNITY CHAT ENDPOINTS
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', async (req, res) => {
    try {
        const { userName, userEmail, content } = req.body;
        if (!content) return res.status(400).json({ error: "Content is required" });
        
        const newMessage = new Message({ userName, userEmail, content });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

