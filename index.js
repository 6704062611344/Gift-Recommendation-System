const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // เพิ่มการเข้ารหัสรหัสผ่าน
const jwt = require('jsonwebtoken'); // สำหรับระบบ Login ที่ปลอดภัย
const connectDB = require('./db');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors()); 
app.use(express.json()); 
app.use(express.static('.')); 

// ----------------------------------------------------------------
// --- 1. User Model & Auth APIs ---
// ----------------------------------------------------------------

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    role: { type: String, default: 'member' }
});

const User = mongoose.model('User', userSchema);

// API สมัครสมาชิก (พร้อมเข้ารหัส Password)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        // 🔒 เข้ารหัสรหัสผ่านก่อนบันทึก
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ 
            name, 
            username, 
            email, 
            password: hashedPassword 
        });
        
        await newUser.save();
        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        console.error("❌ Register Error:", err);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// API เข้าสู่ระบบ (ตรวจสอบ Password ที่เข้ารหัสไว้)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 🔑 ตรวจสอบรหัสผ่านที่รับมากับในฐานข้อมูล
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        res.json({
            user: {
                name: user.name,
                username: user.username,
                role: user.role,
                email: user.email
            }
        });
    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ message: "Server error during login" });
    }
});

// ----------------------------------------------------------------
// --- 2. Category Model & Manage APIs ---
// ----------------------------------------------------------------

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    desc: { type: String }
});
const Category = mongoose.model('Category', categorySchema);

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: "Error fetching categories" });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, desc } = req.body;
        const newCat = new Category({ name, desc });
        await newCat.save();
        res.status(201).json(newCat);
    } catch (err) {
        res.status(400).json({ message: "Error saving category" });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: "Category deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting category" });
    }
});

// ----------------------------------------------------------------
// --- 3. Server Startup ---
// ----------------------------------------------------------------

const startServer = async () => {
    try {
        await connectDB(); 
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("❌ ไม่สามารถเริ่มระบบได้:", err.message);
    }
};

startServer();