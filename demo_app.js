const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Models
const Vocabulary = require('./models/Vocabulary');
const Category = require('./models/Category');
const Rule = require('./models/Rule');
const Gift = require('./models/Gift');

const app = express();
app.use(express.json());

// Serve static files to access demo_recommendation.html
app.use(express.static(__dirname));

// Function to inject Mock Data if the DB is empty
const seedMockData = async () => {
    try {
        const count = await Vocabulary.countDocuments();
        if (count === 0) {
            console.log("🌱 Seeding initial mock data based on Google Sheet structure...");
            
            // 1. Vocabulary & Synonyms
            await Vocabulary.insertMany([
                { term: 'game', synonyms: ['เกม', 'เกมเมอร์', 'เล่นเกม', 'ps5', 'สวิตช์'], category_id: 'C001', tag_type: 'interest' },
                { term: 'tech', synonyms: ['คอม', 'ไอที', 'gadget', 'คีย์บอร์ด', 'เมาส์', 'เทค'], category_id: 'C002', tag_type: 'interest' },
                { term: 'relax', synonyms: ['พักผ่อน', 'นอน', 'ผ่อนคลาย', 'นวด', 'ปวดหลัง'], category_id: 'C003', tag_type: 'benefit' },
                { term: 'fashion', synonyms: ['กระเป๋า', 'เสื้อ', 'ผ้า', 'แฟชั่น', 'แต่งตัว'], category_id: 'C004', tag_type: 'style' }
            ]);

            // 2. Categories
            await Category.insertMany([
                { category_id: 'C001', category_name: 'Gaming & Gears (อุปกรณ์เกมและเกียร์)', category_description: 'For gamers and streamers' },
                { category_id: 'C002', category_name: 'IT & Gadgets (เทคโนโลยีและแก็ดเจ็ต)', category_description: 'Smart devices and computer parts' },
                { category_id: 'C003', category_name: 'Health & Relax (สุขภาพและผ่อนคลาย)', category_description: 'Items for relaxation' },
                { category_id: 'C004', category_name: 'Fashion (แฟชั่นและการแต่งกาย)', category_description: 'Apparel and accessories' }
            ]);

            // 3. Rules (Condition matches term -> maps to Category)
            await Rule.insertMany([
                { priority: 1, name: 'Gamer Profile', condition: ['game'], target_category_id: 'C001' },
                { priority: 2, name: 'Tech Lover', condition: ['tech'], target_category_id: 'C002' },
                { priority: 3, name: 'Relaxation Seeker', condition: ['relax'], target_category_id: 'C003' },
                { priority: 4, name: 'Fashionista', condition: ['fashion'], target_category_id: 'C004' },
            ]);

            // 4. Gifts
            await Gift.insertMany([
                { gift_id: 'G01', gift_name: 'Mechanical Keyboard RGB', description: 'คีย์บอร์ดเกมมิ่งสัมผัสเยี่ยม แสงไฟสวยงามระดับพรีเมียม ตอบสนองฉับไว', price: '฿2,500', category_id: 'C001', target_gender_id: '3', pic_link: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800', shop_link: 'https://shopee.co.th', shop_name: 'Gaming Store' },
                { gift_id: 'G02', gift_name: 'Wireless Gaming Mouse Pro', description: 'เมาส์ไร้สายความหน่วงต่ำ เซ็นเซอร์แม่นยำสูง', price: '฿1,800', category_id: 'C001', target_gender_id: '3', pic_link: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800', shop_link: 'https://shopee.co.th', shop_name: 'Tech Haven' },
                { gift_id: 'G03', gift_name: 'Smart Watch Series X', description: 'นาฬิกาอัจฉริยะวัดชีพจร ฟังก์ชันตรวจจับการนอน ทันสมัย', price: '฿4,500', category_id: 'C002', target_gender_id: '3', pic_link: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800', shop_link: 'https://shopee.co.th', shop_name: 'Gadget Plus' },
                { gift_id: 'G04', gift_name: 'Aroma Diffuser & Essential Oils', description: 'เครื่องพ่นไอน้ำอโรม่า ทำให้ห้องหอม ช่วยให้หลับง่ายขึ้น', price: '฿850', category_id: 'C003', target_gender_id: '3', pic_link: 'https://images.unsplash.com/photo-1608528577891-eb055944f2e7?w=800', shop_link: 'https://shopee.co.th', shop_name: 'Relax Time' },
                { gift_id: 'G05', gift_name: 'Ergonomic Chair', description: 'เก้าอี้เพื่อสุขภาพ ลดอาการปวดหลัง นั่งทำงานได้นาน', price: '฿3,200', category_id: 'C003', target_gender_id: '3', pic_link: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800', shop_link: 'https://shopee.co.th', shop_name: 'Office Comfort' },
                { gift_id: 'G06', gift_name: 'Classic Leather Tote Bag', description: 'กระเป๋าหนังแท้ ดีไซน์เรียบหรู แมทช์ได้หลายชุด', price: '฿1,500', category_id: 'C004', target_gender_id: '2', pic_link: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800', shop_link: 'https://shopee.co.th', shop_name: 'Fashionista' },
            ]);
            console.log("✅ Mock Data Seeded successfully!");
        }
    } catch (err) {
        console.error("❌ Seeding Error:", err);
    }
};

// --- API ROUTES ---

// 1. Recommendation Engine Logic API
app.post('/api/demo/recommend', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "Missing query" });

        // Step 1: Matching Vocabulary (Synonyms -> Terms)
        const vocabularies = await Vocabulary.find();
        let matchedTerms = new Set();
        let extractedKeywords = [];

        // Check if query contains any of the synonyms
        for (let v of vocabularies) {
            for (let syn of v.synonyms) {
                if (query.toLowerCase().includes(syn.toLowerCase())) {
                    matchedTerms.add(v.term);
                    extractedKeywords.push(syn);
                }
            }
            if (query.toLowerCase().includes(v.term.toLowerCase())) {
                matchedTerms.add(v.term);
                extractedKeywords.push(v.term);
            }
        }

        const matchedTermsArr = Array.from(matchedTerms);
        
        // Step 2 & 3: Match Rules to determine Category
        const rules = await Rule.find().sort({ priority: 1 }); // Sort by priority (1 is highest)
        let resolvedCategoryId = null;
        let matchedRuleName = null;

        for (let rule of rules) {
            // Check if any rule condition intersects with matched terms
            const hasMatch = rule.condition.some(cond => matchedTermsArr.includes(cond));
            if (hasMatch) {
                resolvedCategoryId = rule.target_category_id;
                matchedRuleName = rule.name;
                break; // Because priority 1 handles it first
            }
        }

        // Fallback Category (if nothing matches, show IT & Gadgets just for demo)
        if (!resolvedCategoryId) {
             // If we really want to just return 'No results matched', we can do that. Let's return empty.
             return res.json({
                 success: true,
                 analysis: { matchedTerms: matchedTermsArr, extractedKeywords, matchedRuleName: 'None' },
                 category: null,
                 gifts: []
             });
        }

        // Step 4: Fetch Category details
        const categoryData = await Category.findOne({ category_id: resolvedCategoryId });

        // Step 5: Filter Gifts that correspond to the matched Category
        const gifts = await Gift.find({ category_id: resolvedCategoryId });

        res.json({
            success: true,
            analysis: {
                matchedTerms: matchedTermsArr,
                extractedKeywords,
                matchedRuleName
            },
            category: categoryData,
            gifts: gifts
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. View Details API
app.get('/api/demo/gift/:id', async (req, res) => {
    try {
        const gift = await Gift.findOne({ gift_id: req.params.id });
        if (!gift) return res.status(404).json({ error: "Gift not found" });

        res.json({ success: true, gift });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Start Server connection
const PORT = 3001;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/giftdb_demo')
    .then(async () => {
        console.log("✅ Database Connected for Demo Engine");
        await seedMockData();
        app.listen(PORT, () => {
            console.log(`🚀 Demo Engine Server running on http://localhost:${PORT}/demo_recommendation.html`);
        });
    })
    .catch(err => console.error(err));
