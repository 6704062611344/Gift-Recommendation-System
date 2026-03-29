const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// เชื่อมต่อ Database
connectDB();

// API Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }

        // เช็คว่ามี email หรือ username ซ้ำไหม
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
        }

        // เข้ารหัสรหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // สร้างผู้ใช้ใหม่
        const newUser = new User({
            name,
            username,
            email,
            password: hashedPassword,
            role: 'user' // Default เป็น user
        });

        await newUser.save();

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
});

// API Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }

        // หาผู้ใช้งานอิงจาก email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ส่งข้อมูลผู้ใช้งานกลับไป (ไม่ส่ง password กลับไป)
        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});