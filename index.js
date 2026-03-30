require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const connectDB  = require('./db');

// ── Models ────────────────────────────────────────────────────────────────────
const User = require('./models/User');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('.'));   // serve HTML files at http://localhost:3000/

// ============================================================================
// 1.  AUTH  —  Register & Login
// ============================================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;

        // Basic validation
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
        }

        // Check duplicate
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            if (existing.email === email.toLowerCase()) {
                return res.status(400).json({ message: 'Email นี้ถูกใช้งานแล้ว' });
            }
            return res.status(400).json({ message: 'Username นี้ถูกใช้งานแล้ว' });
        }

        // Hash password
        const hashed = await bcrypt.hash(password, 10);

        const newUser = new User({ name, username, email, password: hashed });
        await newUser.save();

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ!' });
    } catch (err) {
        console.error('❌ Register Error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจาก Server' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'กรุณากรอก Email และ Password' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id:       user._id,
                name:     user.name,
                username: user.username,
                email:    user.email,
                role:     user.role
            }
        });
    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจาก Server' });
    }
});

// ============================================================================
// 2.  USERS  —  CRUD (Admin / Profile)
// ============================================================================

// GET /api/users  — รายชื่อ user ทั้งหมด (admin ใช้)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล User ได้' });
    }
});

// GET /api/users/:id  — ดูข้อมูล user คนเดียว
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/users/:id  — แก้ไขข้อมูล user (ชื่อ, username)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, username } = req.body;
        const updates = {};
        if (name)     updates.name     = name;
        if (username) updates.username = username;

        // ตรวจ username ซ้ำ (ยกเว้นตัวเอง)
        if (username) {
            const dup = await User.findOne({ username, _id: { $ne: req.params.id } });
            if (dup) return res.status(400).json({ message: 'Username นี้ถูกใช้แล้ว' });
        }

        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        ).select('-password');

        if (!updated) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'อัปเดตสำเร็จ', user: updated });
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/users/:id/password  — เปลี่ยน Password
app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ไม่พบ User' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Password ปัจจุบันไม่ถูกต้อง' });

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password ใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: 'เปลี่ยน Password สำเร็จ' });
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/users/:id  — ลบ user (admin ใช้)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'ลบ User สำเร็จ' });
    } catch (err) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
});

// ============================================================================
// 3.  CATEGORIES  —  CRUD
// ============================================================================

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
        res.status(500).json({ message: 'Error fetching categories' });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, desc } = req.body;
        const newCat = new Category({ name, desc });
        await newCat.save();
        res.status(201).json(newCat);
    } catch (err) {
        res.status(400).json({ message: 'Error saving category' });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting category' });
    }
});

// ============================================================================
// 4.  START SERVER
// ============================================================================

const startServer = async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server: http://localhost:${PORT}`);
            console.log(`📄 Login page: http://localhost:${PORT}/login_register_page.html`);
        });
    } catch (err) {
        console.error('❌ ไม่สามารถเริ่มระบบได้:', err.message);
        process.exit(1);
    }
};

startServer();