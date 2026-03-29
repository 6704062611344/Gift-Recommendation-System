const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log('⏳ Attempting to connect to MongoDB Atlas...');
        
        // ใช้แค่ URI ตรงๆ ไม่ต้องใส่ Options อื่นเพื่อให้ Library จัดการเองตามความเหมาะสมของ Network
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('✅ MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ Connection Error:', err.message);
        // ไม่ต้อง process.exit(1) เพื่อให้เราเห็น Log ค้างไว้ได้
    }
};

module.exports = connectDB;