require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Override DNS servers to Google's to prevent ECONNREFUSED for SRV lookup on local Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = process.env.MONGO_URI;

console.log("Testing connection to:", uri);

mongoose.connect(uri)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB!");
    process.exit(0);
  })
  .catch(err => {
    console.log("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });
