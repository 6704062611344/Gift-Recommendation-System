const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ เชื่อมต่อ MongoDB สำเร็จแล้ว! พร้อมใช้งาน");
    } catch (err) {
        console.error("❌ เชื่อมต่อไม่สำเร็จ:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;