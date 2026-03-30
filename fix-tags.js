require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Tag = require('./models/Tag');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000
  });
  console.log('✅ Connected!');

  // อ่านจาก Excel
  const wb   = xlsx.readFile('Giver_Gift.xlsx');
  const ws   = wb.Sheets['tags_detail'];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  console.log('Headers:', headers);

  const idIdx   = headers.findIndex(h => h === 'tags_id'   || h === 'tag_id');
  const nameIdx = headers.findIndex(h => h === 'tags_name' || h === 'tag_name');
  const typeIdx = headers.findIndex(h => h === 'tag_type'  || h === 'type');

  const docs = rows.slice(1)
    .map(r => ({
      tags_id:   String(r[idIdx]   ?? '').trim(),
      tags_name: String(r[nameIdx] ?? '').trim(),
      tag_type:  typeIdx >= 0 ? String(r[typeIdx] ?? 'general').trim() : 'general'
    }))
    .filter(d => d.tags_id !== '' && d.tags_name !== '');

  console.log(`📋 Tags from Excel: ${docs.length}`);

  // bulkWrite upsert ทีเดียวทั้งหมด — เร็วกว่า loop มาก
  const ops = docs.map(d => ({
    updateOne: {
      filter: { tags_id: d.tags_id },
      update: { $set: d },
      upsert: true
    }
  }));

  const result = await Tag.bulkWrite(ops, { ordered: false });
  console.log(`✅ Upserted: ${result.upsertedCount}  Modified: ${result.modifiedCount}`);

  const total = await Tag.countDocuments();
  console.log(`📊 Total tags in DB: ${total}`);

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
