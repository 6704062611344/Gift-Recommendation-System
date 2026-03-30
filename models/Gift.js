const mongoose = require('mongoose');

const GiftSchema = new mongoose.Schema({
  gift_id: {
    type: String,
    required: true,
    unique: true,
  },
  gift_name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  price: {
    type: String, // Kept as string to handle '฿1,500' format or similar
    default: '0',
  },
  category_id: {
    type: String,
    required: true,
  },
  target_gender_id: {
    type: String,
    required: true,
  },
  target_age_id: {
    type: String,
    default: '',
  },
  pic_link: {
    type: String,
    default: '',
  },
  shop_link: {
    type: String,
    default: '',
  },
  shop_name: {
    type: String,
    default: '',
  },
  tags: {
    // Array of tag_ids relating to gift_id,tag_id logic
    type: [String],
    default: [],
  }
});

module.exports = mongoose.model('Gift', GiftSchema);
