require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const xlsx = require('xlsx');

// Models
const Category = require('./models/Category');
const Vocabulary = require('./models/Vocabulary');
const Rule = require('./models/Rule');
const Gift = require('./models/Gift');

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB')).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('>> ถ้าเจอคำว่า ECONNREFUSED ให้แน่ใจว่า IP ของเครื่องนี้ถูกอนุญาต (Whitelist) ใน MongoDB Atlas แล้ว');
});

// URL ของ Google Sheet (Export เป็น Excel) - ไม่ต้องรู้ GID ย่อยแล้ว เพราะดึงมาทั้งแผ่น 100%
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/12mX4qnmaAxm5W3HHjYsBw3_Fr3ZI4t7fgqMgG1IngBU/export?format=xlsx';

async function fetchAndParseExcel(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    return workbook;
  } catch (err) {
    console.error(`Error fetching Excel from ${url}:`, err.message);
    return null;
  }
}

function getSheetData(workbook, sheetNameOptions) {
  // ลองหาชื่อชีตที่ตรง (รองรับทั้งภาษาอังกฤษและไทยเผื่อการเปลี่ยนชื่อแท็บอนาคต)
  const sheetNames = workbook.SheetNames;
  let targetSheetName = null;
  for (const name of sheetNameOptions) {
    if (sheetNames.includes(name)) {
      targetSheetName = name;
      break;
    }
  }

  if (!targetSheetName) {
    console.log(`⚠️ ไม่พบแท็บที่มีชื่อว่า ${sheetNameOptions.join(' หรือ ')} ในไฟล์ Sheet`);
    return [];
  }

  const worksheet = workbook.Sheets[targetSheetName];
  return xlsx.utils.sheet_to_json(worksheet, { defval: '' }); // กันค่าเรนจ์ว่างเป็นค่ายิบย่อย
}

// ---------------------------------------------
// นำเข้า Categories
// ---------------------------------------------
async function importCategories(workbook) {
  const data = getSheetData(workbook, ['Categories', 'หมวดหมู่']);
  if (!data.length) return;

  await Category.deleteMany({}); // ลบข้อมูลเก่าทิ้งก่อน
  const formattedData = data.map(item => ({
    category_id: (item.category_id || item['รหัสหมวดหมู่'] || '').toString().trim(),
    category_name: (item.category_name || item['ชื่อหมวดหมู่'] || '').toString().trim(),
    category_description: (item.category_description || item['รายละเอียด'] || '').toString().trim()
  })).filter(item => item.category_id !== '');

  if(formattedData.length > 0) {
      await Category.insertMany(formattedData);
      console.log(`✅ นำเข้า Categories สำเร็จ: ${formattedData.length} รายการ`);
  }
}

// ---------------------------------------------
// นำเข้า Vocabulary
// ---------------------------------------------
async function importVocabulary(workbook) {
  const data = getSheetData(workbook, ['Vocabulary', 'คำศัพท์']);
  if (!data.length) return;

  await Vocabulary.deleteMany({});
  const formattedData = data.map(item => ({
    term: (item.term || item['คำศัพท์'] || '').toString().trim(),
    synonyms: (item.synonyms || item['คำเหมือน'] || '').toString().split(',').map(s => s.trim()).filter(s => s !== ''),
    category_id: (item.category_id || item['รหัสหมวดหมู่'] || item['รหัสหมวดหมู่ (อ้างอิง)'] || '').toString().trim(),
    tag_type: (item.tag_type || item['ประเภท'] || 'general').toString().trim()
  })).filter(item => item.term !== '' && item.category_id !== '');

  if(formattedData.length > 0) {
      await Vocabulary.insertMany(formattedData);
      console.log(`✅ นำเข้า Vocabulary สำเร็จ: ${formattedData.length} รายการ`);
  }
}

// ---------------------------------------------
// นำเข้า Rules
// ---------------------------------------------
async function importRules(workbook) {
  const data = getSheetData(workbook, ['Rules', 'กฎ']);
  if (!data.length) return;

  await Rule.deleteMany({});
  const formattedData = data.map(item => ({
    priority: parseInt(item.priority || item['ความสำคัญ'] || 0, 10),
    name: (item.name || item['ชื่อกฎ'] || '').toString().trim(),
    condition: (item.condition || item['เงื่อนไข'] || '').toString().split(',').map(s => s.trim()).filter(s => s !== ''),
    target_category_id: (item.target_category_id || item['รหัสหมวดหมู่เป้าหมาย'] || item['รหัสหมวดหมู่'] || '').toString().trim()
  })).filter(item => item.name !== '' && item.target_category_id !== '');

  if(formattedData.length > 0) {
      await Rule.insertMany(formattedData);
      console.log(`✅ นำเข้า Rules สำเร็จ: ${formattedData.length} รายการ`);
  }
}

// ---------------------------------------------
// นำเข้า Gifts
// ---------------------------------------------
async function importGifts(workbook) {
  const data = getSheetData(workbook, ['Gifts', 'ของขวัญ', 'Gift']);
  if (!data.length) return;

  await Gift.deleteMany({});
  const formattedData = data.map(item => ({
    gift_id: (item.gift_id || item['รหัสของขวัญ'] || '').toString().trim(),
    gift_name: (item.gift_name || item['ชื่อของขวัญ'] || '').toString().trim(),
    description: (item.description || item['รายละเอียด'] || '').toString().trim(),
    price: (item.price || item['ราคา'] || '0').toString().trim(),
    category_id: (item.category_id || item['รหัสหมวดหมู่'] || '').toString().trim(),
    target_gender_id: (item.target_gender_id || item['เพศเป้าหมาย'] || item['เพศ'] || '').toString().trim(),
    target_age_id: (item.target_age_id || item['อายุเป้าหมาย'] || item['อายุ'] || '').toString().trim(),
    pic_link: (item.pic_link || item['ลิงก์รูปภาพ'] || item['รูปภาพ'] || '').toString().trim(),
    shop_link: (item.shop_link || item['ลิงก์ร้านค้า'] || '').toString().trim(),
    shop_name: (item.shop_name || item['ชื่อร้านค้า'] || item['ร้านค้า'] || '').toString().trim(),
    tags: (item.tags || item['แท็ก'] || '').toString().split(',').map(s => s.trim()).filter(s => s !== '')
  })).filter(item => item.gift_id !== '' && item.gift_name !== '');

  if(formattedData.length > 0) {
      await Gift.insertMany(formattedData);
      console.log(`✅ นำเข้า Gifts สำเร็จ: ${formattedData.length} รายการ`);
  }
}

// ฝึกลำดับการทำงานทั้งหมดรวดเดียว
async function runImport() {
  console.log('⏳ กำลังดาวน์โหลดและอ่านไฟล์จาก Google Sheets (ทุกหน้าอัตโนมัติ)...');
  try {
    const workbook = await fetchAndParseExcel(SHEET_URL);
    if(!workbook) {
        console.error('❌ ไม่สามารถอ่านข้อมูลชีตได้ ข้อมูลอาจเป็นส่วนตัวเกินไป (ยังไม่ได้แชร์) หรือลิงก์ผิด');
        process.exit(1);
    }
    
    console.log('⏳ เริ่มทำการล้างข้อมูลเก่าและนำเข้าข้อมูลใหม่ใส่ MongoDB...');
    await importCategories(workbook);
    await importVocabulary(workbook);
    await importRules(workbook);
    await importGifts(workbook);
    console.log('🎉 เสร็จสิ้นกระบวนการนำเข้าข้อมูล 100%! ข้อมูลทั้งหมดตรงปกพร้อมใช้งาน!!');
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาดระหว่างการนำเข้า:', err);
  } finally {
    mongoose.disconnect();
  }
}

// เริ่มต้นสคริปต์
runImport();
