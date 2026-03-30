/**
 * seed-admin.js
 * รันครั้งเดียวเพื่อสร้าง Admin account ใน MongoDB Atlas
 * คำสั่ง: node seed-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

const ADMINS = [
    {
        name:     'Admin',
        username: 'admin',
        email:    'admin@giver.com',
        password: 'admin1234',
        role:     'admin'
    },
    {
        name:     'Admin 2',
        username: 'admin2',
        email:    'admin2@giver.com',
        password: 'admin5678',
        role:     'admin'
    }
];

async function seedAdmins() {
    try {
        console.log('⏳ กำลังเชื่อมต่อ MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ เชื่อมต่อสำเร็จ\n');

        for (const admin of ADMINS) {
            const existing = await User.findOne({ email: admin.email });

            if (existing) {
                console.log(`⚠️  ${admin.email} มีอยู่แล้ว — ข้าม`);
                continue;
            }

            const hashed = await bcrypt.hash(admin.password, 10);
            await User.create({ ...admin, password: hashed });
            console.log(`✅ สร้าง Admin สำเร็จ: ${admin.email} / ${admin.password}`);
        }

        console.log('\n🎉 เสร็จแล้ว! สามารถ Login ด้วย Admin ได้แล้ว');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedAdmins();
