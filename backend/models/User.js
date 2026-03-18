const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    disease: { type: String },
    data: {
        history: { type: [Number], default: [] },
        savings: { type: Number, default: 0 },
        target: { type: Number, default: 0 },
        price: { type: Number, default: 0.75 },
        dietHistory: { type: Array, default: [] },
        waterHistory: { type: Number, default: 0 },
        lastWaterDate: { type: String, default: "" }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
