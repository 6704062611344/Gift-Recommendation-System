require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Models
const Category = require('./models/Category');
const Vocabulary = require('./models/Vocabulary');
const Rule = require('./models/Rule');
const Gift = require('./models/Gift');

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB')).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ชื่อไฟล์ local
const LOCAL_FILE = path.join(__dirname, 'Giver_Gift.xlsx');

// ---------------------------------------------------
// อ่านไฟล์ Excel
// ---------------------------------------------------
function readWorkbook() {
  if (!fs.existsSync(LOCAL_FILE)) {
    console.error(`❌ ไม่พบไฟล์: ${LOCAL_FILE}`);
    console.error('>> กรุณา Download ไฟล์ Excel จาก Google Sheets แล้ววางไว้ในโฟลเดอร์โปรเจกต์');
    process.exit(1);
  }
  console.log(`📂 พบไฟล์ local: Giver_Gift.xlsx`);
  const workbook = xlsx.readFile(LOCAL_FILE);
  console.log(`📋 Sheet ที่พบในไฟล์: [${workbook.SheetNames.join(', ')}]`);
  return workbook;
}

// ---------------------------------------------------
// Auto-detect sheet โดยดูจาก header columns
// ---------------------------------------------------
function detectSheets(workbook) {
  const detected = { categories: null, vocabulary: null, rules: null, gifts: null };

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rows || rows.length < 2) continue;

    // header row (lowercase ทั้งหมด)
    const headers = rows[0].map(h => h.toString().toLowerCase().trim());
    const headerStr = headers.join(',');

    console.log(`  → Sheet "${sheetName}" - headers: [${headers.join(', ')}]`);

    // ตรวจจาก keywords ในคอลัมน์
    const hasCategoryId = headers.some(h => h.includes('category_id') || h.includes('รหัสหมวดหมู่'));
    const hasCategoryName = headers.some(h => h.includes('category_name') || h.includes('ชื่อหมวดหมู่'));
    const hasTerm = headers.some(h => h.includes('term') || h.includes('คำศัพท์'));
    const hasSynonyms = headers.some(h => h.includes('synonym') || h.includes('คำเหมือน'));
    const hasPriority = headers.some(h => h.includes('priority') || h.includes('ความสำคัญ'));
    const hasCondition = headers.some(h => h.includes('condition') || h.includes('เงื่อนไข'));
    const hasGiftId = headers.some(h => h.includes('gift_id') || h.includes('รหัสของขวัญ'));
    const hasGiftName = headers.some(h => h.includes('gift_name') || h.includes('ชื่อของขวัญ'));
    const hasPrice = headers.some(h => h.includes('price') || h.includes('ราคา'));

    if (!detected.categories && hasCategoryId && hasCategoryName) {
      detected.categories = sheetName;
      console.log(`    ✅ ระบุ: Categories`);
    } else if (!detected.vocabulary && hasTerm && hasCategoryId) {
      detected.vocabulary = sheetName;
      console.log(`    ✅ ระบุ: Vocabulary`);
    } else if (!detected.rules && (hasPriority || hasCondition) && hasCategoryId) {
      detected.rules = sheetName;
      console.log(`    ✅ ระบุ: Rules`);
    } else if (!detected.gifts && (hasGiftId || (hasGiftName && hasPrice))) {
      detected.gifts = sheetName;
      console.log(`    ✅ ระบุ: Gifts`);
    }
  }

  return detected;
}

// ---------------------------------------------------
// นำเข้า Categories
// ---------------------------------------------------
async function importCategories(workbook, sheetName) {
  if (!sheetName) {
    console.log('⚠️  ไม่พบ Sheet สำหรับ Categories — ข้ามขั้นตอนนี้');
    return;
  }
  const ws = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

  await Category.deleteMany({});
  const formattedData = data.map(item => {
    // หา key แบบ case-insensitive
    const keys = Object.keys(item);
    const get = (...names) => {
      for (const n of names) {
        const k = keys.find(k => k.toLowerCase().trim() === n.toLowerCase());
        if (k && item[k] !== '') return item[k].toString().trim();
      }
      return '';
    };
    return {
      category_id: get('category_id', 'รหัสหมวดหมู่'),
      category_name: get('category_name', 'ชื่อหมวดหมู่'),
      category_description: get('category_description', 'รายละเอียด', 'คำอธิบาย')
    };
  }).filter(item => item.category_id !== '');

  if (formattedData.length > 0) {
    await Category.insertMany(formattedData);
    console.log(`✅ นำเข้า Categories สำเร็จ: ${formattedData.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Categories');
  }
}

// ---------------------------------------------------
// นำเข้า Vocabulary
// ---------------------------------------------------
async function importVocabulary(workbook, sheetName) {
  if (!sheetName) {
    console.log('⚠️  ไม่พบ Sheet สำหรับ Vocabulary — ข้ามขั้นตอนนี้');
    return;
  }
  const ws = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

  await Vocabulary.deleteMany({});
  const formattedData = data.map(item => {
    const keys = Object.keys(item);
    const get = (...names) => {
      for (const n of names) {
        const k = keys.find(k => k.toLowerCase().trim() === n.toLowerCase());
        if (k && item[k] !== '') return item[k].toString().trim();
      }
      return '';
    };
    return {
      term: get('term', 'คำศัพท์'),
      synonyms: get('synonyms', 'คำเหมือน').split(',').map(s => s.trim()).filter(s => s !== ''),
      category_id: get('category_id', 'รหัสหมวดหมู่', 'รหัสหมวดหมู่ (อ้างอิง)'),
      tag_type: get('tag_type', 'ประเภท') || 'general'
    };
  }).filter(item => item.term !== '' && item.category_id !== '');

  if (formattedData.length > 0) {
    await Vocabulary.insertMany(formattedData);
    console.log(`✅ นำเข้า Vocabulary สำเร็จ: ${formattedData.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Vocabulary');
  }
}

// ---------------------------------------------------
// นำเข้า Rules
// ---------------------------------------------------
async function importRules(workbook, sheetName) {
  if (!sheetName) {
    console.log('⚠️  ไม่พบ Sheet สำหรับ Rules — ข้ามขั้นตอนนี้');
    return;
  }
  const ws = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

  await Rule.deleteMany({});
  const formattedData = data.map(item => {
    const keys = Object.keys(item);
    const get = (...names) => {
      for (const n of names) {
        const k = keys.find(k => k.toLowerCase().trim() === n.toLowerCase());
        if (k && item[k] !== '') return item[k].toString().trim();
      }
      return '';
    };
    return {
      priority: parseInt(get('priority', 'ความสำคัญ') || 0, 10),
      name: get('name', 'ชื่อกฎ'),
      condition: get('condition', 'เงื่อนไข').split(',').map(s => s.trim()).filter(s => s !== ''),
      target_category_id: get('target_category_id', 'รหัสหมวดหมู่เป้าหมาย', 'รหัสหมวดหมู่')
    };
  }).filter(item => item.name !== '' && item.target_category_id !== '');

  if (formattedData.length > 0) {
    await Rule.insertMany(formattedData);
    console.log(`✅ นำเข้า Rules สำเร็จ: ${formattedData.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Rules');
  }
}

// ---------------------------------------------------
// นำเข้า Gifts
// ---------------------------------------------------
async function importGifts(workbook, sheetName) {
  if (!sheetName) {
    console.log('⚠️  ไม่พบ Sheet สำหรับ Gifts — ข้ามขั้นตอนนี้');
    return;
  }
  const ws = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

  await Gift.deleteMany({});
  const formattedData = data.map(item => {
    const keys = Object.keys(item);
    const get = (...names) => {
      for (const n of names) {
        const k = keys.find(k => k.toLowerCase().trim() === n.toLowerCase());
        if (k && item[k] !== '') return item[k].toString().trim();
      }
      return '';
    };
    return {
      gift_id: get('gift_id', 'รหัสของขวัญ'),
      gift_name: get('gift_name', 'ชื่อของขวัญ', 'ชื่อ'),
      description: get('description', 'รายละเอียด', 'คำอธิบาย'),
      price: get('price', 'ราคา') || '0',
      category_id: get('category_id', 'รหัสหมวดหมู่'),
      target_gender_id: get('target_gender_id', 'เพศเป้าหมาย', 'เพศ'),
      target_age_id: get('target_age_id', 'อายุเป้าหมาย', 'อายุ'),
      pic_link: get('pic_link', 'ลิงก์รูปภาพ', 'รูปภาพ', 'pic'),
      shop_link: get('shop_link', 'ลิงก์ร้านค้า'),
      shop_name: get('shop_name', 'ชื่อร้านค้า', 'ร้านค้า'),
      tags: get('tags', 'แท็ก', 'tag').split(',').map(s => s.trim()).filter(s => s !== '')
    };
  }).filter(item => item.gift_id !== '' && item.gift_name !== '');

  if (formattedData.length > 0) {
    await Gift.insertMany(formattedData);
    console.log(`✅ นำเข้า Gifts สำเร็จ: ${formattedData.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Gifts');
  }
}

// ---------------------------------------------------
// เริ่มกระบวนการหลัก
// ---------------------------------------------------
async function runImport() {
  try {
    const workbook = readWorkbook();

    console.log('\n🔍 กำลังวิเคราะห์ Sheet อัตโนมัติ...');
    const detected = detectSheets(workbook);

    console.log('\n⏳ เริ่มนำเข้าข้อมูลลง MongoDB...');
    await importCategories(workbook, detected.categories);
    await importVocabulary(workbook, detected.vocabulary);
    await importRules(workbook, detected.rules);
    await importGifts(workbook, detected.gifts);

    console.log('\n🎉 เสร็จสิ้นกระบวนการนำเข้าข้อมูล!');
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err);
  } finally {
    mongoose.disconnect();
  }
}

runImport();
