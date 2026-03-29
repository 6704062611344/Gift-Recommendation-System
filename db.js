const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        console.log("MONGO_URI =", process.env.MONGO_URI);
        // รวม Option ไว้ในที่เดียว เพื่อให้รันได้ทุกที่
        await mongoose.connect(process.env.MONGO_URI, {
            // directConnection: true, // ลองคอมเมนต์บรรทัดนี้ไว้ก่อน ถ้ายังไม่ได้ค่อยเปิดใช้
            serverSelectionTimeoutMS: 5000 
        });
        console.log('✅ MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ Connection Error:', err.message);
        process.exit(1); 
    }
};

module.exports = connectDB;