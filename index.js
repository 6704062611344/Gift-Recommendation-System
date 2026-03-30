require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const connectDB  = require('./db');

// ── Models ────────────────────────────────────────────────────────────────────
const User       = require('./models/User');
const Category   = require('./models/Category');
const Gift       = require('./models/Gift');
const Vocabulary = require('./models/Vocabulary');
const Rule       = require('./models/Rule');
const Recipient  = require('./models/Recipient');
const Favorite   = require('./models/Favorite');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ============================================================================
// 1.  AUTH  —  Register & Login
// ============================================================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        if (!name || !username || !email || !password)
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });

        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            if (existing.email === email.toLowerCase())
                return res.status(400).json({ message: 'Email นี้ถูกใช้งานแล้ว' });
            return res.status(400).json({ message: 'Username นี้ถูกใช้งานแล้ว' });
        }
        const hashed = await bcrypt.hash(password, 10);
        await new User({ name, username, email, password: hashed }).save();
        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ!' });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจาก Server' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'กรุณากรอก Email และ Password' });
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ message: 'Email หรือ Password ไม่ถูกต้อง' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Email หรือ Password ไม่ถูกต้อง' });
        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: { id: user._id, name: user.name, username: user.username, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดจาก Server' });
    }
});

// ============================================================================
// 2.  USERS
// ============================================================================

app.get('/api/users', async (req, res) => {
    try { res.json(await User.find().select('-password').sort({ createdAt: -1 })); }
    catch (err) { res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล User ได้' }); }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json(user);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, username } = req.body;
        const updates = {};
        if (name) updates.name = name;
        if (username) {
            const dup = await User.findOne({ username, _id: { $ne: req.params.id } });
            if (dup) return res.status(400).json({ message: 'Username นี้ถูกใช้แล้ว' });
            updates.username = username;
        }
        const updated = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).select('-password');
        if (!updated) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'อัปเดตสำเร็จ', user: updated });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ไม่พบ User' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Password ปัจจุบันไม่ถูกต้อง' });
        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ message: 'Password ใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'เปลี่ยน Password สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'ลบ User สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

// ============================================================================
// 3.  ADMIN MANAGEMENT
// ============================================================================

app.get('/api/admin/list', async (req, res) => {
    try { res.json(await User.find({ role: 'admin' }).select('-password').sort({ createdAt: 1 })); }
    catch (err) { res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Admin ได้' }); }
});

app.get('/api/admin/requests', async (req, res) => {
    try { res.json(await User.find({ role: 'user', adminRequest: true }).select('-password').sort({ createdAt: -1 })); }
    catch (err) { res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Requests ได้' }); }
});

app.put('/api/admin/promote/:id', async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, { $set: { role: 'admin', adminRequest: false } }, { new: true }).select('-password');
        if (!updated) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'อนุมัติ Admin สำเร็จ', user: updated });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.put('/api/admin/demote/:id', async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, { $set: { role: 'user', adminRequest: false } }, { new: true }).select('-password');
        if (!updated) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'ถอด Admin สำเร็จ', user: updated });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.put('/api/admin/reject/:id', async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, { $set: { adminRequest: false } }, { new: true }).select('-password');
        if (!updated) return res.status(404).json({ message: 'ไม่พบ User' });
        res.json({ message: 'ปฏิเสธ Request สำเร็จ', user: updated });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.post('/api/admin/request', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId is required' });
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'ไม่พบ User' });
        if (user.role === 'admin') return res.status(400).json({ message: 'คุณเป็น Admin อยู่แล้ว' });
        if (user.adminRequest) return res.status(400).json({ message: 'คุณส่งคำขอไปแล้ว' });
        user.adminRequest = true;
        await user.save();
        res.json({ message: 'ส่งคำขอเป็น Admin สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

// ============================================================================
// 4.  CATEGORIES
// ============================================================================

app.get('/api/categories', async (req, res) => {
    try { res.json(await Category.find().sort({ category_id: 1 })); }
    catch (err) { res.status(500).json({ message: 'Error fetching categories' }); }
});

app.get('/api/categories/:id', async (req, res) => {
    try {
        const cat = await Category.findById(req.params.id);
        if (!cat) return res.status(404).json({ message: 'ไม่พบ Category' });
        res.json(cat);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { category_id, category_name, category_description } = req.body;
        if (!category_id || !category_name)
            return res.status(400).json({ message: 'category_id และ category_name จำเป็น' });
        const cat = await new Category({ category_id, category_name, category_description: category_description || '' }).save();
        res.status(201).json(cat);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'category_id นี้มีอยู่แล้ว' });
        res.status(400).json({ message: 'Error saving category' });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { category_name, category_description } = req.body;
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: { category_name, category_description } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'ไม่พบ Category' });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const deleted = await Category.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ Category' });
        res.json({ message: 'ลบ Category สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'Error deleting category' }); }
});

// ============================================================================
// 5.  GIFTS
// ============================================================================

app.get('/api/gifts', async (req, res) => {
    try {
        const { category, gender, search } = req.query;
        const filter = {};
        if (category) filter.category_id = category;
        if (gender)   filter.target_gender_id = gender;
        if (search)   filter.gift_name = { $regex: search, $options: 'i' };
        res.json(await Gift.find(filter).sort({ gift_id: 1 }));
    } catch (err) { res.status(500).json({ message: 'Error fetching gifts' }); }
});

app.get('/api/gifts/:id', async (req, res) => {
    try {
        const gift = await Gift.findById(req.params.id);
        if (!gift) return res.status(404).json({ message: 'ไม่พบ Gift' });
        res.json(gift);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.post('/api/gifts', async (req, res) => {
    try {
        const { gift_id, gift_name, description, category_id, target_gender_id, target_age_id, tags, options } = req.body;
        if (!gift_id || !gift_name || !category_id || !target_gender_id)
            return res.status(400).json({ message: 'gift_id, gift_name, category_id, target_gender_id จำเป็น' });
        const gift = await new Gift({
            gift_id, gift_name, description, category_id,
            target_gender_id, target_age_id,
            tags: tags || [], options: options || []
        }).save();
        res.status(201).json(gift);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'gift_id นี้มีอยู่แล้ว' });
        res.status(400).json({ message: 'Error saving gift: ' + err.message });
    }
});

app.put('/api/gifts/:id', async (req, res) => {
    try {
        const { gift_name, description, category_id, target_gender_id, target_age_id, tags, options } = req.body;
        const updated = await Gift.findByIdAndUpdate(
            req.params.id,
            { $set: { gift_name, description, category_id, target_gender_id, target_age_id, tags, options } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'ไม่พบ Gift' });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.delete('/api/gifts/:id', async (req, res) => {
    try {
        const deleted = await Gift.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ Gift' });
        res.json({ message: 'ลบ Gift สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

// ============================================================================
// 6.  VOCABULARY
// ============================================================================

app.get('/api/vocabulary', async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category_id: category } : {};
        res.json(await Vocabulary.find(filter).sort({ term: 1 }));
    } catch (err) { res.status(500).json({ message: 'Error fetching vocabulary' }); }
});

app.get('/api/vocabulary/:id', async (req, res) => {
    try {
        const vocab = await Vocabulary.findById(req.params.id);
        if (!vocab) return res.status(404).json({ message: 'ไม่พบ Vocabulary' });
        res.json(vocab);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.post('/api/vocabulary', async (req, res) => {
    try {
        const { term, synonyms, category_id, tag_type } = req.body;
        if (!term || !category_id)
            return res.status(400).json({ message: 'term และ category_id จำเป็น' });
        const vocab = await new Vocabulary({
            term, synonyms: synonyms || [], category_id, tag_type: tag_type || 'general'
        }).save();
        res.status(201).json(vocab);
    } catch (err) { res.status(400).json({ message: 'Error saving vocabulary: ' + err.message }); }
});

app.put('/api/vocabulary/:id', async (req, res) => {
    try {
        const { term, synonyms, category_id, tag_type } = req.body;
        const updated = await Vocabulary.findByIdAndUpdate(
            req.params.id,
            { $set: { term, synonyms, category_id, tag_type } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'ไม่พบ Vocabulary' });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.delete('/api/vocabulary/:id', async (req, res) => {
    try {
        const deleted = await Vocabulary.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ Vocabulary' });
        res.json({ message: 'ลบ Vocabulary สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

// ============================================================================
// 8.  RECIPIENTS
// ============================================================================

app.get('/api/recipients', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'userId is required' });
        res.json(await Recipient.find({ userId }).sort({ createdAt: -1 }));
    } catch (err) { res.status(500).json({ message: 'Error fetching recipients' }); }
});

app.post('/api/recipients', async (req, res) => {
    try {
        const { userId, name, age, gender, relation, interests, budget } = req.body;
        if (!userId || !name || !age || !gender || !relation)
            return res.status(400).json({ message: 'userId, name, age, gender, relation จำเป็น' });
        const rec = await new Recipient({ userId, name, age, gender, relation, interests: interests || [], budget: budget || '' }).save();
        res.status(201).json(rec);
    } catch (err) { res.status(400).json({ message: 'Error saving recipient: ' + err.message }); }
});

app.put('/api/recipients/:id', async (req, res) => {
    try {
        const { name, age, gender, relation, interests, budget } = req.body;
        const updated = await Recipient.findByIdAndUpdate(
            req.params.id,
            { $set: { name, age, gender, relation, interests, budget } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'ไม่พบ Recipient' });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.delete('/api/recipients/:id', async (req, res) => {
    try {
        const deleted = await Recipient.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ Recipient' });
        res.json({ message: 'ลบ Recipient สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'Error deleting recipient' }); }
});

// ============================================================================
// 9.  FAVORITES
// ============================================================================

app.get('/api/favorites', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'userId is required' });
        const fav = await Favorite.findOne({ userId });
        res.json(fav ? fav.giftIds : []);
    } catch (err) { res.status(500).json({ message: 'Error fetching favorites' }); }
});

app.post('/api/favorites/toggle', async (req, res) => {
    try {
        const { userId, giftId } = req.body;
        if (!userId || !giftId) return res.status(400).json({ message: 'userId และ giftId จำเป็น' });
        let fav = await Favorite.findOne({ userId });
        if (!fav) fav = new Favorite({ userId, giftIds: [] });
        const idx = fav.giftIds.indexOf(giftId);
        let action;
        if (idx === -1) { fav.giftIds.push(giftId); action = 'added'; }
        else            { fav.giftIds.splice(idx, 1); action = 'removed'; }
        await fav.save();
        res.json({ action, giftIds: fav.giftIds });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

// ============================================================================
// 10.  RULES
// ============================================================================

app.get('/api/rules', async (req, res) => {
    try { res.json(await Rule.find().sort({ priority: 1 })); }
    catch (err) { res.status(500).json({ message: 'Error fetching rules' }); }
});

app.get('/api/rules/:id', async (req, res) => {
    try {
        const rule = await Rule.findById(req.params.id);
        if (!rule) return res.status(404).json({ message: 'ไม่พบ Rule' });
        res.json(rule);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.post('/api/rules', async (req, res) => {
    try {
        const { name, priority, condition, target_category_ids } = req.body;
        if (!name || !target_category_ids || !target_category_ids.length)
            return res.status(400).json({ message: 'name และ target_category_ids จำเป็น' });
        const rule = await new Rule({
            name, priority: priority || 0, condition: condition || [], target_category_ids
        }).save();
        res.status(201).json(rule);
    } catch (err) { res.status(400).json({ message: 'Error saving rule: ' + err.message }); }
});

app.put('/api/rules/:id', async (req, res) => {
    try {
        const { name, priority, condition, target_category_ids } = req.body;
        const updated = await Rule.findByIdAndUpdate(
            req.params.id,
            { $set: { name, priority, condition, target_category_ids } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'ไม่พบ Rule' });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

app.delete('/api/rules/:id', async (req, res) => {
    try {
        const deleted = await Rule.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'ไม่พบ Rule' });
        res.json({ message: 'ลบ Rule สำเร็จ' });
    } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด' }); }
});

// ============================================================================
// 8.  START SERVER
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