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
test('rent prices always show the monthly qualifier once; sale prices never do', () => {
 const typed = (type, price, price_label) => mapDbRow({id:64, type, price, price_label}).priceLabel;
 assert.equal(typed('rent', '6700', '6,700 ₪'), '₪ 6,700 / חודש');
 assert.equal(typed('commercial-rent', '30560', ''), '₪ 30,560 / חודש');
 assert.equal(typed('rent', '7,200', '₪ 7,200 / חודש'), '₪ 7,200 / חודש');
 assert.equal(typed('rent', '8000', '8000 ש״ח לחודש'), '₪ 8,000 לחודש');
 assert.equal(typed('sale', '7,500,000', '₪ 7,500,000'), '₪ 7,500,000');
 assert.equal(typed('rent', null, 'מחיר בתיאום'), 'מחיר בתיאום');
});
test('older Office titles drop a raw trailing price segment but keep everything else', () => {
 const title = t => mapDbRow({id:64, type:'rent', price:'7200', title:t}).title;
 assert.equal(title('להשכרה · פלורנטין · 5 חדרים · ₪7200'), 'להשכרה · פלורנטין · 5 חדרים');
 assert.equal(title('להשכרה · 4 חדרים · ₪12800 · חניה'), 'להשכרה · 4 חדרים · חניה');
 assert.equal(title('נכס #52 · לב תל אביב · 3 חדרים'), 'נכס #52 · לב תל אביב · 3 חדרים');
 assert.equal(title('₪7200'), '₪7200');
});
