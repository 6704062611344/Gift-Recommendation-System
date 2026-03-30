/**
 * reset-admin-password.js
 * รีเซ็ต password ของ admin@giver.com ให้เป็น admin1234
 * คำสั่ง: node reset-admin-password.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

async function resetAdminPassword() {
    try {
        console.log('⏳ กำลังเชื่อมต่อ MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ เชื่อมต่อสำเร็จ\n');

        const admins = [
            { email: 'admin@giver.com',  password: 'admin1234' },
            { email: 'admin2@giver.com', password: 'admin5678' },
        ];

        for (const a of admins) {
            const hashed = await bcrypt.hash(a.password, 10);
            const result = await User.findOneAndUpdate(
                { email: a.email },
                { $set: { password: hashed, role: 'admin' } },
                { upsert: true, new: true }
            );
            console.log(`✅ Reset password สำเร็จ: ${a.email} / ${a.password}  (id: ${result._id})`);
        }

        console.log('\n🎉 เสร็จแล้ว! ลอง Login ด้วย admin@giver.com / admin1234 ได้เลย');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetAdminPassword();
