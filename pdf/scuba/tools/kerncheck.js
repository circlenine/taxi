// 字の間を1字ずつ詰める処理（カーニング）が、どこにも残っていないかの点検
// 10/21 まーく様「カーニングは全文やめて。詰めすぎな所や甘い所があり、めちゃくちゃで見るに耐えない」
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__laid===true,{timeout:30000});
const n=await p.evaluate(()=>document.querySelectorAll('.page .kc,[data-kern]').length);
console.log(n?'NG 1字ずつ詰めた字が '+n+' 個 残っている':'カーニングなし OK（どの字も、もとの間隔のまま）');await b.close();process.exit(n?1:0);})();
