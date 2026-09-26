const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../map-base.js'),'utf8');
function delta(event){const start=source.indexOf('function wheelZoomDelta(');assert(start>=0,'gesture normalization missing');const end=source.indexOf('\n  }',start)+4;const c=vm.createContext({});vm.runInContext(source.slice(start,end),c);return c.wheelZoomDelta(event,600)}
test('Mac pinch receives stronger scaling than regular mouse input',()=>{assert.equal(delta({deltaY:-6,deltaMode:0,ctrlKey:true}),-.2);assert.equal(delta({deltaY:-300,deltaMode:0,ctrlKey:false}),-300/550)});
test('fine two-finger scrolling is amplified and direction is preserved',()=>{assert.equal(delta({deltaY:-12,deltaMode:0}),-.1);assert.equal(delta({deltaY:12,deltaMode:0}),.1);assert.equal(delta({deltaY:0,deltaMode:0}),0)});
test('large wheel and pinch events remain bounded',()=>{assert.equal(delta({deltaY:9999,deltaMode:0,ctrlKey:true}),.55);assert.equal(delta({deltaY:-999,deltaMode:1}),-.55)});
