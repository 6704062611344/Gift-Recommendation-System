require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Models
const Category   = require('./models/Category');
const Vocabulary = require('./models/Vocabulary');
const Rule       = require('./models/Rule');
const Gift       = require('./models/Gift');
const Tag        = require('./models/Tag');

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
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
    console.error('>> กรุณา Download ไฟล์ Excel แล้ววางไว้ในโฟลเดอร์โปรเจกต์');
    process.exit(1);
  }
  console.log(`📂 พบไฟล์ local: Giver_Gift.xlsx`);
  const workbook = xlsx.readFile(LOCAL_FILE);
  console.log(`📋 Sheet ที่พบในไฟล์: [${workbook.SheetNames.join(', ')}]`);
  return workbook;
}

// ---------------------------------------------------
// Helper: getter แบบ case-insensitive
// ---------------------------------------------------
function makeGetter(item) {
  const keys = Object.keys(item);
  return (...names) => {
    for (const n of names) {
      const k = keys.find(k => k.toLowerCase().trim() === n.toLowerCase().trim());
      if (k && item[k] !== '' && item[k] !== undefined) return item[k].toString().trim();
    }
    return '';
  };
}

// ---------------------------------------------------
// Helper: อ่าน Sheet เป็น array of objects
// ---------------------------------------------------
function readSheet(workbook, sheetName) {
  if (!sheetName || !workbook.Sheets[sheetName]) return [];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

// ---------------------------------------------------
// Auto-detect sheets จาก header columns
// ---------------------------------------------------
function detectSheets(workbook) {
  const detected = {
    categories: null,
    vocabulary: null,
    rules: null,
    giftMain: null,    // Sheet หลัก gift (gift_name + gift_id)
    giftTags: null,    // Gift ↔ Tag mapping (gift_id + tag_id)
    giftGender: null,  // Gender lookup (gender_id)
    giftDetail: null,  // รายละเอียดเพิ่มเติม (price, shop, etc.)
  };

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rows || rows.length < 2) continue;

    const headers = rows[0].map(h => h.toString().toLowerCase().trim());
    console.log(`  → Sheet "${sheetName}" - headers: [${headers.join(', ')}]`);

    const hasCategoryId   = headers.some(h => h.includes('category_id') || h.includes('รหัสหมวดหมู่'));
    const hasCategoryName = headers.some(h => h.includes('category_name') || h.includes('ชื่อหมวดหมู่'));
    const hasTerm         = headers.some(h => h === 'term' || h.includes('คำศัพท์'));
    const hasPriority     = headers.some(h => h.includes('priority') || h.includes('ความสำคัญ'));
    const hasCondition    = headers.some(h => h.includes('condition') || h.includes('เงื่อนไข'));
    const hasCategory     = headers.some(h => h === 'category' || h.includes('category_id') || h.includes('รหัสหมวดหมู่'));
    const hasGiftId       = headers.some(h => h === 'gift_id');
    const hasGiftName     = headers.some(h => h === 'gift_name' || h.includes('ชื่อของขวัญ'));
    const hasTagId        = headers.some(h => h === 'tag_id');
    const hasGenderId     = headers.some(h => h === 'gender_id');
    const hasGenderName   = headers.some(h => h.includes('gender_name') || h.includes('เพศ'));
    const hasPrice        = headers.some(h => h === 'price' || h.includes('ราคา'));
    const hasShop         = headers.some(h => h.includes('shop'));

    if (!detected.categories && hasCategoryId && hasCategoryName) {
      detected.categories = sheetName;
      console.log(`    ✅ ระบุ: Categories`);
    } else if (!detected.vocabulary && hasTerm && hasCategoryId) {
      detected.vocabulary = sheetName;
      console.log(`    ✅ ระบุ: Vocabulary`);
    } else if (!detected.rules && (hasPriority || hasCondition) && hasCategory) {
      detected.rules = sheetName;
      console.log(`    ✅ ระบุ: Rules`);
    } else if (!detected.giftTags && hasGiftId && hasTagId && !hasGiftName) {
      detected.giftTags = sheetName;
      console.log(`    ✅ ระบุ: Gift-Tag Mapping`);
    } else if (!detected.giftGender && hasGenderId && hasGenderName) {
      detected.giftGender = sheetName;
      console.log(`    ✅ ระบุ: Gender Detail`);
    } else if (!detected.giftMain && hasGiftId && hasGiftName) {
      detected.giftMain = sheetName;
      console.log(`    ✅ ระบุ: Gift Main`);
    } else if (!detected.giftDetail && hasGiftId && (hasPrice || hasShop)) {
      detected.giftDetail = sheetName;
      console.log(`    ✅ ระบุ: Gift Detail (เพิ่มเติม)`);
    }
  }

  return detected;
}

// ---------------------------------------------------
// นำเข้า Categories
// ---------------------------------------------------
async function importCategories(workbook, sheetName) {
  if (!sheetName) { console.log('⚠️  ไม่พบ Sheet สำหรับ Categories'); return; }
  const data = readSheet(workbook, sheetName);

  await Category.deleteMany({});
  const formatted = data.map(item => {
    const get = makeGetter(item);
    return {
      category_id:          get('category_id', 'รหัสหมวดหมู่'),
      category_name:        get('category_name', 'ชื่อหมวดหมู่'),
      category_description: get('category_description', 'รายละเอียด', 'คำอธิบาย')
    };
  }).filter(d => d.category_id !== '');

  if (formatted.length > 0) {
    await Category.insertMany(formatted);
    console.log(`✅ นำเข้า Categories สำเร็จ: ${formatted.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Categories');
  }
}

// ---------------------------------------------------
// นำเข้า Vocabulary
// ---------------------------------------------------
async function importVocabulary(workbook, sheetName) {
  if (!sheetName) { console.log('⚠️  ไม่พบ Sheet สำหรับ Vocabulary'); return; }

  const ws = workbook.Sheets[sheetName];
  // อ่านแบบ raw array เพื่อจับคอลัมน์ตามตำแหน่ง
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows || rows.length < 2) {
    console.log('⚠️  ไม่มีข้อมูล Vocabulary');
    return;
  }

  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  console.log(`  📋 Vocabulary headers: [${headers.join(', ')}]`);

  // หา index ของแต่ละคอลัมน์
  const tagIdIdx    = headers.findIndex(h => h === 'tag_id' || h.includes('รหัสแท็ก') || h.includes('id'));
  const termIdx     = headers.findIndex(h => h === 'term' || h.includes('คำศัพท์'));
  const catIdx      = headers.findIndex(h => h.includes('category_id') || h.includes('รหัสหมวดหมู่'));
  const tagTypeIdx  = headers.findIndex(h => h.includes('tag_type') || h.includes('ประเภท'));
  console.log(`  📋 tag_id column index: ${tagIdIdx}, term index: ${termIdx}`);

  // คอลัมน์ synonyms = ทุกคอลัมน์ระหว่าง term และ category_id
  const synStart = termIdx + 1;
  const synEnd   = catIdx > synStart ? catIdx : synStart + 5;
  console.log(`  📋 Synonym columns: index ${synStart} ถึง ${synEnd - 1}`);

  await Vocabulary.deleteMany({});
  const dataRows = rows.slice(1); // ข้าม header row
  const formatted = dataRows.map((row, rowIndex) => {
    const term        = termIdx >= 0 ? row[termIdx]?.toString().trim() : '';
    const category_id = catIdx >= 0  ? row[catIdx]?.toString().trim()  : '';
    const tag_type    = tagTypeIdx >= 0 ? row[tagTypeIdx]?.toString().trim() || 'general' : 'general';
    // อ่าน tag_id จากคอลัมน์ที่ตรวจพบ หรือใช้ row index + 1 เป็น fallback
    const tag_id      = tagIdIdx >= 0 && row[tagIdIdx]?.toString().trim()
      ? row[tagIdIdx].toString().trim()
      : String(rowIndex + 1);

    // รวบ synonyms จาก column B-F (หรือ synStart ถึง synEnd)
    const synonyms = [];
    for (let i = synStart; i < synEnd; i++) {
      const val = row[i]?.toString().trim();
      if (val && val !== '') synonyms.push(val);
    }

    return { tag_id, term, synonyms, category_id, tag_type };
  }).filter(d => d.term !== '' && d.category_id !== '');

  if (formatted.length > 0) {
    await Vocabulary.insertMany(formatted);
    console.log(`✅ นำเข้า Vocabulary สำเร็จ: ${formatted.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Vocabulary');
  }
}

// ---------------------------------------------------
// นำเข้า Tags (tags_detail sheet)
// ---------------------------------------------------
async function importTags(workbook, sheetName) {
  if (!sheetName) { console.log('⚠️  ไม่พบ Sheet สำหรับ Tags'); return; }
  const ws   = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows || rows.length < 2) { console.log('⚠️  ไม่มีข้อมูล Tags'); return; }

  const headers   = rows[0].map(h => h.toString().toLowerCase().trim());
  const idIdx     = headers.findIndex(h => h === 'tags_id'   || h === 'tag_id');
  const nameIdx   = headers.findIndex(h => h === 'tags_name' || h === 'tag_name' || h === 'tag_detail');
  const typeIdx   = headers.findIndex(h => h === 'tag_type'  || h === 'type');
  console.log(`  📋 tags_detail headers: [${headers.join(', ')}]`);

  await Tag.deleteMany({});
  const formatted = rows.slice(1).map(row => ({
    tags_id:   idIdx   >= 0 ? String(row[idIdx]).trim()   : '',
    tags_name: nameIdx >= 0 ? String(row[nameIdx]).trim() : '',
    tag_type:  typeIdx >= 0 ? String(row[typeIdx]).trim() : 'general'
  })).filter(d => d.tags_id !== '' && d.tags_name !== '');

  if (formatted.length > 0) {
    await Tag.insertMany(formatted);
    console.log(`✅ นำเข้า Tags สำเร็จ: ${formatted.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Tags');
  }
}

// ---------------------------------------------------
// นำเข้า Rules
// ----------------------------------------------------
async function importRules(workbook, sheetName) {
  if (!sheetName) { console.log('⚠️  ไม่พบ Sheet สำหรับ Rules'); return; }
  const data = readSheet(workbook, sheetName);

  await Rule.deleteMany({});
  const formatted = data.map(item => {
    const get = makeGetter(item);
    return {
      priority:           parseInt(get('priority', 'ความสำคัญ') || 0, 10),
      name:               get('name', 'ชื่อกฎ'),
      condition:          get('condition', 'เงื่อนไข').split(',').map(s => s.trim()).filter(Boolean),
      target_category_id: get('target_category_id', 'category', 'รหัสหมวดหมู่เป้าหมาย', 'รหัสหมวดหมู่')
    };
  }).filter(d => d.name !== '' && d.target_category_id !== '');

  if (formatted.length > 0) {
    await Rule.insertMany(formatted);
    console.log(`✅ นำเข้า Rules สำเร็จ: ${formatted.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Rules');
  }
}

// ---------------------------------------------------
// นำเข้า Gifts (Join หลาย Sheet)
// ---------------------------------------------------
async function importGifts(workbook, detected) {
  if (!detected.giftMain) {
    console.log('⚠️  ไม่พบ Sheet หลักสำหรับ Gifts (ต้องมีคอลัมน์ gift_id + gift_name)');
    return;
  }

  // 1. Sheet หลัก
  const mainData = readSheet(workbook, detected.giftMain);
  console.log(`  📥 Gift หลักจาก "${detected.giftMain}": ${mainData.length} แถว`);

  // 2. Gift Detail เพิ่มเติม → Group by gift_id → options[]
  // (1 gift_id อาจมีหลายแถว = หลาย option ราคา/ร้าน/รูป)
  const detailMap = {};   // gift_id → { ...mainFields }
  const optionsMap = {};  // gift_id → [{ price, shop_name, shop_link, pic_link }, ...]
  if (detected.giftDetail) {
    const rows = readSheet(workbook, detected.giftDetail);
    console.log(`  📥 Gift Detail จาก "${detected.giftDetail}": ${rows.length} แถว`);
    for (const row of rows) {
      const get = makeGetter(row);
      const gid = get('gift_id');
      if (!gid) continue;

      // เก็บ fields ทั่วไปจากแถวแรก
      if (!detailMap[gid]) detailMap[gid] = row;

      // เก็บ option (price+shop+pic) ทุกแถว
      const price    = get('price', 'ราคา');
      const shopName = get('shop_name', 'ชื่อร้านค้า', 'ร้านค้า');
      const shopLink = get('shop_link', 'ลิงก์ร้านค้า');
      const picLink  = get('pic_link', 'ลิงก์รูปภาพ', 'รูปภาพ', 'pic');

      if (price || shopLink || picLink) {
        if (!optionsMap[gid]) optionsMap[gid] = [];
        optionsMap[gid].push({ price, shop_name: shopName, shop_link: shopLink, pic_link: picLink });
      }
    }
  }


  // 3. Tag Mapping → Map by gift_id → [tag_id, ...]
  const tagMap = {};
  if (detected.giftTags) {
    const rows = readSheet(workbook, detected.giftTags);
    console.log(`  📥 Tag Mapping จาก "${detected.giftTags}": ${rows.length} แถว`);
    for (const row of rows) {
      const get = makeGetter(row);
      const gid = get('gift_id');
      const tid = get('tag_id');
      if (gid && tid) {
        if (!tagMap[gid]) tagMap[gid] = [];
        tagMap[gid].push(tid);
      }
    }
  }

  // 4. Gender Detail → Map by gender_id
  const genderMap = {};
  if (detected.giftGender) {
    const rows = readSheet(workbook, detected.giftGender);
    console.log(`  📥 Gender Detail จาก "${detected.giftGender}": ${rows.length} แถว`);
    for (const row of rows) {
      const get = makeGetter(row);
      const gid = get('gender_id');
      const gname = get('gender_name', 'เพศ');
      if (gid) genderMap[gid] = gname || gid;
    }
  }

  // 5. Join ทุก Sheet
  await Gift.deleteMany({});
  const formatted = mainData.map(item => {
    const get = makeGetter(item);
    const giftId = get('gift_id', 'รหัสของขวัญ');
    if (!giftId) return null;

    const dGet = makeGetter(detailMap[giftId] || {});
    const tagsFromMap = tagMap[giftId] || [];
    const tagsFromCol = (get('tags', 'แท็ก', 'tag') || dGet('tags', 'แท็ก', 'tag'))
      .split(',').map(s => s.trim()).filter(Boolean);
    const tags = tagsFromMap.length > 0 ? tagsFromMap : tagsFromCol;

    const genderIdRaw = get('target_gender_id', 'gender_id', 'เพศเป้าหมาย', 'เพศ')
                     || dGet('target_gender_id', 'gender_id', 'เพศ');

    // Options จาก detail sheet (หลาย option / gift)
    const options = optionsMap[giftId] || [];

    return {
      gift_id:          giftId,
      gift_name:        get('gift_name', 'ชื่อของขวัญ', 'ชื่อ')       || dGet('gift_name', 'ชื่อ'),
      description:      get('description', 'รายละเอียด', 'คำอธิบาย')  || dGet('description', 'รายละเอียด'),
      category_id:      get('category_id', 'รหัสหมวดหมู่')            || dGet('category_id', 'รหัสหมวดหมู่'),
      target_gender_id: genderIdRaw,
      target_age_id:    get('target_age_id', 'อายุเป้าหมาย', 'อายุ')  || dGet('target_age_id', 'อายุ'),
      tags,
      options
    };
  }).filter(d => d && d.gift_id !== '' && d.gift_name !== '');


  if (formatted.length > 0) {
    await Gift.insertMany(formatted);
    console.log(`✅ นำเข้า Gifts สำเร็จ: ${formatted.length} รายการ`);
  } else {
    console.log('⚠️  ไม่มีข้อมูล Gifts (ตรวจสอบว่าไฟล์มีคอลัมน์ gift_id และ gift_name)');
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
    // import tags_detail
    const tagsSheet = workbook.SheetNames.find(s => s.toLowerCase().includes('tags_detail') || s.toLowerCase() === 'tags');
    await importTags(workbook, tagsSheet);
    await importGifts(workbook, detected);

    console.log('\n🎉 เสร็จสิ้นกระบวนการนำเข้าข้อมูล!');
  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาด:', err);
  } finally {
    mongoose.disconnect();
  }
}

runImport();
