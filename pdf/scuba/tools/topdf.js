const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();await p.goto('file://'+process.argv[2],{waitUntil:'networkidle'});await p.waitForTimeout(1500);
await p.pdf({path:process.argv[3],format:'A4',printBackground:true,margin:{top:0,bottom:0,left:0,right:0}});await b.close();})();
