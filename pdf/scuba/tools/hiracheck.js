// ひらがなが長く続いて、どこで切れるか分かりにくい所を探す（10/21 まーく様「ひらがなが続いて、一瞬わからなくなりそうな所は、漢字か句読点で見やすく」）
// 句読点・かっこ・記号で区切られた中で、ひらがなが MIN 字以上続く所を出す。ALLOW に入れた言い回しは、見直して問題ないと決めたもの
const { chromium } = require('playwright');
const MIN = +(process.env.HIRA_MIN || 8);
// 見直して、このままで読みやすいと決めたもの（10/21）：題（まーく様のご指示の言い方）／「だから」は札の字で区切られている／ひとまとまりの言い回し
const ALLOW = ['【あわてないように】','【だからこまめに】','【あなたのせいじゃない】','【できないときもあるから】','【いているところは】','【しずつたまって】','【いてもらいやすい】','【したくなっても】','【つからなければ】','【るのがおすすめ】'].concat((process.env.HIRA_ALLOW || '').split('|').filter(Boolean));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.emulateMedia({media:'print'});await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const r=await p.evaluate(m=>{const o=[];document.querySelectorAll('.page').forEach(pg=>{const t=pg.innerText.replace(/\s+/g,'｜');const re=new RegExp('[ぁ-ゖー]{'+m+',}','g');let x;while(x=re.exec(t)){o.push(pg.id+'｜'+t.slice(Math.max(0,x.index-6),x.index)+'【'+x[0]+'】'+t.slice(x.index+x[0].length,x.index+x[0].length+6));}});return o;},MIN);
const ng=r.filter(x=>!ALLOW.some(a=>x.includes(a)));
ng.forEach(x=>console.log('NG '+x));
console.log(ng.length?'NG ひらがなが長く続く所 '+ng.length+'か所':'ひらがなの続き OK（'+MIN+'字以上続く所は、見直し済みのものだけ）');await b.close();process.exit(ng.length?1:0);})();
