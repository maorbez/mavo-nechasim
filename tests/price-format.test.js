const test = require('node:test');
const assert = require('node:assert/strict');
const { mapDbRow } = require('../db.js');
const label = (price, price_label) => mapDbRow({id:64, price, price_label}).priceLabel;
test('raw Office price gets shekel symbol and thousands separators', () => {
 assert.equal(label('8000', '8000'), '₪ 8,000');
 assert.equal(label(7500000, ''), '₪ 7,500,000');
});
test('existing price labels retain their qualifiers without duplicate currency', () => {
 assert.equal(label(6700, '₪ 6,700 / חודש'), '₪ 6,700 / חודש');
 assert.equal(label(13000, '13,000 ₪'), '₪ 13,000');
 assert.equal(label(8000, '8000 ש״ח לחודש'), '₪ 8,000 לחודש');
});
test('missing prices never become zero or NaN and decimal amounts retain precision', () => {
 assert.equal(label(null, ''), 'מחיר בתיאום');
 assert.equal(label(null, 'מחיר בתיאום'), 'מחיר בתיאום');
 assert.equal(label('1234.5', ''), '₪ 1,234.5');
});
