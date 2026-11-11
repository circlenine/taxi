/**
 * 客層の控えが、増えつづけないことを確かめる。
 *   実行: node gas/test/vnaud.test.js
 *
 * ★なぜ要るのか（まーく様のご指摘・2026/11/12「変わってませんが」）
 *   公演1つにつき控えを1つ作っていたため、15分おきに走るたびに
 *   控えが50個を超えて増え、まーく様の画面が「読むだけ」になり、
 *   新しい鍵を足せなくなっていました。片づけても、すぐ戻りました。
 *   ここで「1つにまとまっているか」を必ず見ます。
 */
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'..','006-Venue.gs'),'utf8');
const a=src.indexOf('const VN_AUD_ALL'), b=src.indexOf('/** 覚えておくための名札');
const props={};
const box={ PropertiesService:{ getScriptProperties:()=>({ getProperty:k=>props[k]??null,
  setProperty:(k,v)=>{props[k]=v;}, deleteProperty:k=>{delete props[k];} }) },
  VN_TOPIC_KEEP_MS: 3*24*3600*1000, console };
vm.createContext(box); vm.runInContext(src.slice(a,b),box);
let ng=0; const t=(c,m)=>{ console.log((c?'ok   ':'NG   ')+m); if(!c)ng++; };
// 100件入れても、控えは1つのまま
const m={}; for(let i=0;i<100;i++) m['VNAUD_'+i]={at:Date.now(),v:{audience:'20代から40代の男女',know:'',avoid:''}};
vm.runInContext('vnAudAllWrite_('+JSON.stringify(m)+')',box);
t(Object.keys(props).length===1, '★★★100件入れても、控えは1つだけ');
t(props['VNAUD_ALL'].length<=7000, '★★★入れものの大きさを超えない：'+props['VNAUD_ALL'].length);
const back=vm.runInContext('vnAudAllRead_()',box);
t(Object.keys(back).length>0 && Object.keys(back).length<100, '★★★古い順に落として、残りは読める：'+Object.keys(back).length);
// 3日より古いものは落ちる
const old={a1:{at:Date.now()-4*24*3600*1000,v:{}}, a2:{at:Date.now(),v:{}}};
vm.runInContext('vnAudAllWrite_('+JSON.stringify(old)+')',box);
const b2=vm.runInContext('vnAudAllRead_()',box);
t(b2.a1===undefined && b2.a2!==undefined, '★★★3日より古いものは落ちる');
console.log(ng?('\n✗ '+ng+'件'):'\n✓ 通りました'); process.exit(ng?1:0);
