const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../catalog.js');
test('neighborhood matching is exact, city scoped and accepts spelling variants',()=>{assert(c.inScope({location:'תל אביב-יפו, נוה צדק'},{city:'תל אביב',hood:'נווה צדק'}));assert(!c.inScope({location:'בת ים, מרכז'},{city:'תל אביב',hood:'מרכז'}));assert(!c.inScope({location:'תל אביב, ליד פלורנטין'},{hood:'פלורנטין'}));});
test('map coordinates reject missing, zero and out of range coordinates',()=>{for(const p of [{lat:null,lng:34},{lat:'x',lng:34},{lat:0,lng:0},{lat:92,lng:34},{lat:32,lng:181}])assert(!c.hasCoordinates(p));assert(c.hasCoordinates({lat:'32.05',lng:'34.76'}));});
test('query handles neighborhood and all words without searching unrelated descriptions',()=>{assert(c.matchesQuery({title:'דירה',location:'תל אביב, פלורנטין'},'פלורנטין תל אביב'));assert(!c.matchesQuery({title:'דירה',location:'בת ים',desc:'נסיעה לפלורנטין'},'פלורנטין'));});
