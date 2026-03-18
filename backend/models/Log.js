const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // To identify which user is logging
    date: { type: Date, default: Date.now },  // Date of the entry
    cigarettesSmoked: { type: Number, required: true }, // Count from frontend
    savings: { type: Number, default: 0 } // Calculated financial impact
});

module.exports = mongoose.model('Log', LogSchema);