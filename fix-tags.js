require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Gift = require('./models/Gift');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  // อ่าน tag mapping จาก Excel
  const wb = xlsx.readFile('Giver_Gift.xlsx');
  const ws = wb.Sheets['gift_id,tag_id'];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  console.log(`Read ${rows.length} rows from gift_id,tag_id sheet`);

  // สร้าง tagMap: gift_id → [tag_id, ...]
  const tagMap = {};
  rows.forEach(r => {
    const gid = String(r['gift_id'] || '').trim();
    const tid = String(r['tag_id'] || '').trim();
    if (gid && tid) {
      if (!tagMap[gid]) tagMap[gid] = [];
      tagMap[gid].push(tid);
    }
  });

  const giftIds = Object.keys(tagMap);
  console.log(`Found tags for ${giftIds.length} gifts`);
  console.log(`Sample: gift 1 → [${tagMap['1'].join(', ')}]`);

  // อัปเดต tags ของทุก gift
  let updated = 0;
  for (const gid of giftIds) {
    const result = await Gift.updateOne(
      { gift_id: gid },
      { $set: { tags: tagMap[gid] } }
    );
    if (result.modifiedCount > 0) updated++;
  }

  console.log(`✅ Updated tags for ${updated} gifts`);

  // ตรวจสอบ gift 1
  const g1 = await Gift.findOne({ gift_id: '1' });
  console.log(`Gift 1 tags in DB now: [${g1 ? g1.tags.join(', ') : 'NOT FOUND'}]`);

  mongoose.disconnect();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
