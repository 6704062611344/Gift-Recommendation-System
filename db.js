const mongoose = require('mongoose');
require('dotenv').config(); // สำคัญมาก: ตัวนี้จะไปดึง Link จากไฟล์ .env มาให้

const connectDB = async () => {
    // เพิ่มบรรทัดนี้เพื่อเช็คว่าเห็นค่าไหม
    console.log("🔍 ค่าที่อ่านได้จาก .env คือ:", process.env.MONGO_URI); 

    try {
        console.log("⏳ กำลังพยายามเชื่อมต่อ MongoDB Atlas (Cloud)...");
        // ... โค้ดเดิมของคุณ ...
        
        // บรรทัดนี้แหละครับที่มันจะไปดูค่าจากไฟล์ .env อัตโนมัติ
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ Connection Error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;