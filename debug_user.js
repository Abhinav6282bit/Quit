const mongoose = require('mongoose');
const User = require('./backend/models/User'); // Path correction check
const dns = require('dns');
require('dotenv').config({ path: './backend/.env' });

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');
        
        const user = await User.findOne({ email: 'akkuz6282@gmail.com' });
        if (user) {
            console.log('User found:', JSON.stringify(user, null, 2));
        } else {
            console.log('User NOT found');
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
