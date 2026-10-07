const test=require('node:test');const assert=require('node:assert/strict');
const {tokenFromHash,safeImages,leaseMs}=require('../branded-share');
test('capabilities are exact nonenumerable tokens; query URLs are never accepted',()=>{
 assert.equal(tokenFromHash('#'+'a'.repeat(32)),'a'.repeat(32));
 for(const x of ['#123','#https://evil.test','#'+'a'.repeat(33),'#'+'a'.repeat(31)+'%','#a?share=1'])assert.equal(tokenFromHash(x),'');
});
test('remote media has a strict origin and no credentials or path traversal',()=>{
 assert.deepEqual(safeImages(['https://img.yad2.co.il/fixture.jpg','javascript:alert(1)','https://img.yad2.co.il.evil/a','https://u:p@img.yad2.co.il/a','http://img.yad2.co.il/a','https://img.yad2.co.il/../secret']),['https://img.yad2.co.il/fixture.jpg']);
});
test('client display lease cannot exceed source expiry or one minute, including transport delay',()=>{
 const data={verified_at:'2026-10-07T12:00:00Z',expires_at:'2026-10-07T12:02:00Z'};
 assert.equal(leaseMs(data,5000),55000);
 assert.equal(leaseMs({...data,expires_at:'2026-10-07T12:00:10Z'},3000),7000);
 assert.equal(leaseMs({...data,expires_at:'invalid'},0),0);
 assert.equal(leaseMs(data,61000),0);
});
