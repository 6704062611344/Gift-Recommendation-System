const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log("⏳ กำลังพยายามเชื่อมต่อ MongoDB Atlas...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ Connection Error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;