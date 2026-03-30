const mongoose = require('mongoose');

const GiftOptionSchema = new mongoose.Schema({
  price: { type: String, default: '0' },
  shop_name: { type: String, default: '' },
  shop_link: { type: String, default: '' },
  pic_link: { type: String, default: '' }
}, { _id: false });

const GiftSchema = new mongoose.Schema({
  gift_id: { type: String, required: true, unique: true },
  gift_name: { type: String, required: true },
  description: { type: String, default: '' },
  category_id: { type: String, required: true },
  target_gender_id: { type: String, required: true },
  target_age_id: { type: String, default: '' },
  tags: { type: [String], default: [] },
  options: { type: [GiftOptionSchema], default: [] }
});

module.exports = mongoose.model('Gift', GiftSchema);
