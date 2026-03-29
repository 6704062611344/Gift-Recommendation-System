const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./db'); // ดึงฟังก์ชันมาจาก db.js
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 

// --- สร้าง User Model ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    role: { type: String, default: 'member' }
});

const User = mongoose.model('User', userSchema);

// --- API สำหรับสมัครสมาชิก ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        const newUser = new User({ name, username, email, password });
        await newUser.save();
        
        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        console.error("❌ Register Error:", err);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// --- API สำหรับเข้าสู่ระบบ ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        
        if (user) {
            res.json({
                user: {
                    name: user.name,
                    username: user.username,
                    role: user.role,
                    email: user.email
                }
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ message: "Server error during login" });
    }
});

// --- ส่วนการเริ่มทำงานของ Server (สำคัญมาก) ---
const startServer = async () => {
    try {
        // 1. พยายามเชื่อมต่อฐานข้อมูลก่อน
        await connectDB(); 
        
        // 2. ถ้าต่อสำเร็จค่อยเปิด Port
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("❌ ไม่สามารถเริ่มระบบได้เนื่องจากปัญหาฐานข้อมูล:", err.message);
    }
};

startServer();