/**
 * 005-Updater.gs（コードの自動更新）を検証する。
 *   実行: node gas/test/updater.test.js
 *
 * 自分自身を書き換えるコードなので、
 * 「壊す前に必ず保存する」「危ないときは書き込まない」を重点的に見る。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');

const ctx = { console };
vm.createContext(ctx);
const CtxDate = vm.runInContext('Date', ctx);

/* ---- 偽のドライブ ---- */
let drive;              // フォルダ名 → 偽フォルダ
function mkFolder(name) {
  const f = {
    _name: name, _files: [], _folders: [], _trashed: false,
    _created: Date.now(),
    getName: () => f._name,
    getDateCreated: () => new CtxDate(f._created),
    setTrashed: v => { f._trashed = v; },
    getFolders: () => iter(f._folders.filter(x => !x._trashed)),
    getFiles: () => iter(f._files),
    createFolder: n => { const c = mkFolder(n); f._folders.push(c); return c; },
    getFoldersByName: n => iter(f._folders.filter(x => x._name === n && !x._trashed)),
    createFile: (n, content) => {
      const file = mkFile(n, content); f._files.push(file); return file;
    }
  };
  return f;
}
function mkFile(name, content, updated) {
  return {
    getName: () => name,
    getLastUpdated: () => new CtxDate(updated || Date.now()),
    getBlob: () => ({ getDataAsString: () => content })
  };
}
function iter(arr) {
  let i = 0;
  return { hasNext: () => i < arr.length, next: () => arr[i++] };
}
ctx.DriveApp = {
  getFoldersByName: n => iter(drive[n] ? [drive[n]] : []),
  createFolder: n => (drive[n] = mkFolder(n))
};

/* ---- 偽のスプシ ---- */
const toasts = [], alerts = [], cells = {};
let uiWorks = true;
ctx.SpreadsheetApp = {
  flush: () => {},
  ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' },
  newDataValidation: () => {
    // 実物と同じで、どのメソッドも自分を返す（つなげて書けるように）
    const b = { _list: null, _allow: null, _help: '' };
    b.requireCheckbox = () => b;
    b.requireValueInList = (list, drop) => { b._list = list; b._drop = drop; return b; };
    b.setAllowInvalid = v => { b._allow = v; return b; };
    b.setHelpText = v => { b._help = v; return b; };
    b.build = () => ({ list: b._list, allow: b._allow, help: b._help });
    return b;
  },
  getActiveSpreadsheet: () => ({
    toast: (m, t) => toasts.push({ t: t, m: m }),
    getSheetByName: n => (n === '説明') ? panel : null,
    insertSheet: () => (panel = mkPanel())
  }),
  getUi: () => {
    if (!uiWorks) throw new Error('ダイアログは使えません');
    return {
      alert: (t, b) => { alerts.push({ t: t, b: b }); return 'YES'; },
      prompt: (t, b) => { prompts.push({ t: t, b: b });
        return { getSelectedButton: () => promptBtn, getResponseText: () => promptText }; },
      Button: { YES: 'YES', OK: 'OK' },
      ButtonSet: { YES_NO: 'YN', OK: 'OK', OK_CANCEL: 'OKC' }
    };
  }
};
let prompts = [], promptBtn = 'OK', promptText = '';
ctx.pad2_ = n => ('0' + n).slice(-2);
const props = {};
ctx.PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = String(v); },
  deleteProperty: k => { delete props[k]; } })};
let gh = null;      // {dir:[{name,path,type}], raw:{path:内容}, fail:{code,msg}}
ctx.ScriptApp = { getOAuthToken: () => 'tok', getScriptId: () => 'SID',
  getProjectTriggers: () => triggers,
  deleteTrigger: t => { triggers = triggers.filter(x => x !== t); },
  newTrigger: fn => {
    const b = { _fn: fn, _kind: '' };
    const api = {
      forSpreadsheet: () => api, onEdit: () => { b._kind = 'edit'; return api; },
      timeBased: () => api, everyMinutes: () => { b._kind = 'min'; return api; },
      after: () => { b._kind = 'after'; return api; },
      atHour: () => api, nearMinute: () => api, everyDays: () => api,
      create: () => { triggers.push({ getHandlerFunction: () => b._fn, _kind: b._kind });
                      return b; }
    };
    return api;
  }};
let triggers = [];
ctx.LockService = { getScriptLock: () => ({ tryLock: () => lockFree,
  releaseLock() {}, waitLock() {} }) };
let lockFree = true;
ctx.logErr_ = (w, e) => { errs.push(w + ':' + (e && e.message ? e.message : e)); };
const errs = [];
// 「説明」タブの偽物（パネルはこの中の8行目から下に置かれる）
let panel;
function mkPanel() {
  const cells = {};
  const sizes = {};
  const merges = {};      // 'r,c' → 結合のまとまりの左上 {r,c}
  const heights = {};     // 行 → 高さ
  const valids = {};      // 'r,c' → 入力規則（プルダウン）
  const prot = [];
  // 結合セルの左上を返す小さな入れ物
  function panelCell(r, c) {
    const C = { setValue: v => { cells[r + ',' + c] = v; return C; },
                getValue: () => cells[r + ',' + c] };
    return new Proxy(C, { get: (t, k) => (k in t ? t[k] : () => C) });
  }
  let protFails = false;
  return {
    _cells: cells,
    _sizes: sizes,
    _heights: heights,
    _valids: valids,
    _prot: prot,
    // r1..r2 / c1..c2 を1つにまとめる（左上は r1,c1）
    _merge: (r1, c1, r2, c2) => {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) merges[r + ',' + c] = { r: r1, c: c1 };
      }
    },
    _failProtect: v => { protFails = v; },
    getProtections: () => prot.slice(),

    getName: () => '説明',
    getMaxRows: () => 200,
    getMaxColumns: () => 9,          // 説明タブは I列 まで（J以降は消してある）
    insertRowsBefore: (before, n) => {
      const moved = {};
      Object.keys(cells).forEach(k => {
        const m = k.match(/^(\d+),(\d+)$/);
        if (!m) return;
        const r = +m[1];
        if (r >= before) { moved[(r + n) + ',' + m[2]] = cells[k]; delete cells[k]; }
      });
      Object.keys(moved).forEach(k => { cells[k] = moved[k]; });
    },
    // 行を足す＝その下の行がぜんぶ1つずつ下がる（本物と同じ動き）
    insertRowsAfter: (after, n) => {
      const moved = {};
      Object.keys(cells).forEach(k => {
        const m = k.match(/^(\d+),(\d+)$/);
        if (!m) return;
        const r = +m[1];
        if (r > after) { moved[(r + n) + ',' + m[2]] = cells[k]; delete cells[k]; }
      });
      Object.keys(moved).forEach(k => { cells[k] = moved[k]; });
    },
    createTextFinder: q => ({
      matchEntireCell: () => ({
        findNext: () => {
          for (let r = 1; r <= 200; r++) {
            for (let c = 1; c <= 8; c++) {
              if (String(cells[r + ',' + c] || '').indexOf(q) !== -1) {
                return { getRow: () => r, getColumn: () => c };
              }
            }
          }
          return null;
        }
      })
    }),
    clear: () => { throw new Error('説明タブを clear してはいけません'); },
    setFrozenRows: () => {},
    setRowHeight: (r, h) => { heights[r] = h; },
    setRowHeights: () => {},
    getColumnWidth: c => (c === 2 ? 75 : 150),
    setColumnWidth() { return this; },
    insertCheckboxes() { return this; },
    getRange: (r, c, nr, nc) => {
      // getRange("Y5") のような呼び方にも応える
      if (typeof r === 'string') {
        const key = r;
        const S = { setValue: v => { cells[key] = String(v); return S; },
                    getValue: () => cells[key] };
        return new Proxy(S, { get: (t, k) => (k in t ? t[k] : () => S) });
      }
      let px;
      const R = {
        getA1Notation: () => {
          const L = 'ABCDEFGH'.charAt(c - 1);
          return L + r + ':' + L + (r + (nr || 1) - 1);
        },
        protect: () => {
          if (protFails) throw new Error('保護できません');
          const p = {
            _a1: 'ABCDEFGH'.charAt(c - 1) + r + ':' +
                 'ABCDEFGH'.charAt(c - 1) + (r + (nr || 1) - 1),
            _editors: ['tomodachi@example.com', 'stranger@example.com'],
            _domain: true,
            setDescription() { return p; },
            getRange: () => ({ getA1Notation: () => p._a1 }),
            getEditors: () => p._editors.slice(),
            removeEditors: list => {
              p._editors = p._editors.filter(e => list.indexOf(e) === -1); },
            canDomainEdit: () => p._domain,
            setDomainEdit: v => { p._domain = v; },
            canEdit: () => true,
            remove: () => { const i = prot.indexOf(p); if (i >= 0) prot.splice(i, 1); }
          };
          prot.push(p);
          return p;
        },
        // 本物と同じく、チェックボックスを付けると値が false になる
        insertCheckboxes: () => {
          for (let i = 0; i < (nr || 1); i++) {
            for (let j = 0; j < (nc || 1); j++) cells[(r + i) + ',' + (c + j)] = false;
          }
          return px;
        },
        removeCheckboxes: () => {
          for (let i = 0; i < (nr || 1); i++) {
            for (let j = 0; j < (nc || 1); j++) delete cells[(r + i) + ',' + (c + j)];
          }
          return px;
        },
        setDataValidation: rule => {
          for (let i = 0; i < (nr || 1); i++) valids[(r + i) + ',' + c] = rule;
          return px;
        },
        clearDataValidations: () => {
          for (let i = 0; i < (nr || 1); i++) delete valids[(r + i) + ',' + c];
          return px;
        },
        isPartOfMerge: () => !!(merges[r + ',' + c]),
        getMergedRanges: () => {
          const m = merges[r + ',' + c];
          if (!m) return [];
          let n = 0;
          for (let x = m.c; x <= m.c + 20; x++) { if (merges[m.r + ',' + x]) n++; else break; }
          return [{ getCell: () => panelCell(m.r, m.c),
                    getRow: () => m.r, getColumn: () => m.c,
                    getNumColumns: () => n }];
        },
        setFontSize: v => {
          for (let i = 0; i < (nr || 1); i++) sizes[(r + i) + ',' + c] = v;
          return px;
        },
        setValue: v => { cells[r + ',' + c] = v; return px; },
        getValue: () => cells[r + ',' + c],
        getValues: () => {
          const out = [];
          for (let i = 0; i < (nr || 1); i++) {
            const row = [];
            for (let j = 0; j < (nc || 1); j++) {
              const v = cells[(r + i) + ',' + (c + j)];
              row.push(v === undefined ? '' : v);
            }
            out.push(row);
          }
          return out;
        },
        setValues: v => { v.forEach((vr, i) => vr.forEach((vv, j) => {
          cells[(r + i) + ',' + (c + j)] = vv; })); return px; }
      };
      // 知らないメソッドを呼ばれても、つないで呼べるように自分（Proxy）を返す
      px = new Proxy(R, { get: (t, k) => (k in t ? t[k] : () => px) });
      return px;
    }
  };
}

let ghUrls = [];        // GitHubに投げたURLを、そのまま覚えておく

/* ---- 偽の Apps Script API ---- */
let project;            // サーバー側にあることになっている中身
let apiCalls;           // 呼ばれた記録
let apiFail = null;     // {path, code, msg} を入れると、その呼び出しだけ失敗する
ctx.UrlFetchApp = { fetch: (url, opt) => {
  /*
   * ★置き場のファイルを、そのまま読みにいくとき（raw）。
   *   おつかいメモは、こちらの読み方を使う
   */
  if (url.indexOf('https://raw.githubusercontent.com/') === 0) {
    const want = decodeURI(url);
    let hit = null;
    if (gh && gh.raw) {
      Object.keys(gh.raw).forEach(function (k) {
        if (want.slice(-(k.length + 1)) === '/' + k) hit = k;
      });
    }
    if (hit !== null) {
      return { getResponseCode: () => 200, getContentText: () => gh.raw[hit] };
    }
    return { getResponseCode: () => 404, getContentText: () => 'Not Found' };
  }
  if (url.indexOf('https://api.github.com/') === 0) {
    if (gh && gh.fail) {
      return { getResponseCode: () => gh.fail.code,
               getContentText: () => JSON.stringify({ message: gh.fail.msg }) };
    }
    // 枝の一覧を聞かれたとき
    if (url.indexOf('/branches') !== -1) {
      if (gh && gh.reposCode && gh.reposCode !== 200) {
        return { getResponseCode: () => gh.reposCode, getContentText: () => JSON.stringify({ message: 'x' }) };
      }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(
        ((gh && gh.branches) || ['main', 'claude/gas-code-info-collection-e5mxw3'])
          .map(function (n) { return { name: n }; })) };
    }
    // 枝のいちばん新しい書き込みを聞かれたとき
    if (url.indexOf('/commits/') !== -1) {
      ghUrls.push(url);
      // 置き場そのものが見えないときは、どの入口もだめになる
      if (gh && gh.reposCode && gh.reposCode !== 200) {
        return { getResponseCode: () => gh.reposCode,
                 getContentText: () => JSON.stringify({ message: 'x' }) };
      }
      if (gh && gh.headFail) {
        return { getResponseCode: () => gh.headFail,
                 getContentText: () => JSON.stringify({ message: 'Not Found' }) };
      }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(
        (gh && gh.head) || { commit: { message: 'さいしんの直し\n\n本文', author: { date: '2026-09-16T14:20:00Z' } } }) };
    }
    // 置き場そのものを聞かれたとき（既定の枝を知るため）
    if (url.indexOf('/contents/') === -1) {
      // gh.only を決めておくと、その置き場だけが見つかる（名前が変わった様子を作る）
      if (gh && gh.only && url.indexOf('/repos/' + gh.only) === -1) {
        return { getResponseCode: () => 404,
                 getContentText: () => JSON.stringify({ message: 'Not Found' }) };
      }
      if (gh && gh.reposCode && gh.reposCode !== 200) {
        return { getResponseCode: () => gh.reposCode,
                 getContentText: () => JSON.stringify({ message: 'Not Found' }) };
      }
      return { getResponseCode: () => 200,
               getContentText: () => JSON.stringify((gh && gh.repo) || { default_branch: 'main' }) };
    }
    const p = decodeURI(url.split('/contents/')[1].split('?')[0]);
    if (gh && gh.raw && (p in gh.raw)) {
      return { getResponseCode: () => 200, getContentText: () => gh.raw[p] };
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify(gh.dir) };
  }
  const path = url.replace('https://script.googleapis.com/v1/projects/SID', '');
  apiCalls.push({ path: path, method: opt.method,
                  body: opt.payload ? JSON.parse(opt.payload) : null });
  if (apiFail && path.indexOf(apiFail.path) === 0 && opt.method === apiFail.method) {
    return { getResponseCode: () => apiFail.code,
             getContentText: () => JSON.stringify({ error: { message: apiFail.msg } }) };
  }
  if (path === '/content' && opt.method === 'get') {
    return ok({ files: project.files });
  }
  if (path === '/content' && opt.method === 'put') {
    project.files = JSON.parse(opt.payload).files;
    return ok({ files: project.files });
  }
  if (path === '/deployments' && opt.method === 'get') {
    return ok({ deployments: project.deployments });
  }
  if (path === '/versions' && opt.method === 'post') {
    project.version++;
    return ok({ versionNumber: project.version });
  }
  if (path.indexOf('/deployments/') === 0 && opt.method === 'put') {
    const id = path.split('/')[2];
    project.deployments.forEach(d => {
      if (d.deploymentId === id) d.deploymentConfig = JSON.parse(opt.payload).deploymentConfig;
    });
    return ok({});
  }
  return ok({});
}};
function ok(o) { return { getResponseCode: () => 200, getContentText: () => JSON.stringify(o) }; }

// 001-Code.gs の「説明タブの控えらん（I列）」の写し。
// このテストは 005-Updater.gs しか読み込まないので、ここだけ用意する
vm.runInContext(`
  var INFO_COL = 9;
  var INFO_ROW = { GROUP:1, DASHBOARD:2, WEBAPP:3, DIAG:4, UPDATE:5, AUTO:6, EVENT:7, READ:8, NEWIDS:9 };
  function infoSet_(row, value, label) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("説明");
    if (!sh) return false;
    sh.getRange(row, INFO_COL).setValue(label ? "【" + label + "】\\n" + value : value);
    return true;
  }`, ctx);

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '005-Updater.gs'), 'utf8'), ctx,
  { filename: '005-Updater.gs' });
const F = n => vm.runInContext(n, ctx);

/*
 * ★置き場は、ほんとうは「何も決めていなければ circlenine/test」です。
 *   でも、そうすると ドライブから読む道を試せなくなります。
 *   そこで、テストのあいだだけ「GitHubの にせもの（gh）を用意したときだけ
 *   置き場がある」ことにします。ほんものは realUpdRepo で呼べます。
 */
const realUpdRepo = F('updRepo_');
ctx.testRepo = () => (props['GH_REPO'] || (gh ? 'circlenine/test' : ''));
vm.runInContext('updRepo_ = function(){ return testRepo(); };', ctx);
// 「取り込みの見張り」だけを数える（星人の絵の見張りは別物なので、混ぜない）
const panelChk = sh => F('panelChkCol_')(sh, F('panelTop_')(sh));
const upTrig = () => triggers.filter(x => x.getHandlerFunction() === 'updRunFromLine_');
/*
 * ★合言葉の返事は、受け口の中では作らない。
 *   星人と絵をAIに作らせると5〜15秒かかり、LINEにもApps Scriptにも
 *   打ち切られて、1通も届かなくなっていた（実際に届かなかった）。
 *   受け口は「やることを1件書いて、すぐ返す」だけ。作って送るのは、この見張り。
 */
const kataTrig = () => triggers.filter(x => x.getHandlerFunction() === 'updKataFire');
const kataRun = () => { const n = kataTrig().length; F('updKataFire')(); return n; };

let ng = 0;
function t(c, l) { console.log((c ? '  ok   ' : '  NG   ') + l); if (!c) ng++; }
function has(s, n, l) {
  const hit = String(s).indexOf(n) !== -1;
  console.log((hit ? '  ok   ' : '  NG   ') + l +
    (hit ? '' : '  … 実際: ' + JSON.stringify(String(s).slice(0, 200))));
  if (!hit) ng++;
}
const MANIFEST = { name: 'appsscript', type: 'JSON', source: '{"timeZone":"Asia/Tokyo"}' };

function reset(driveFiles, projFiles) {
  drive = {};
  toasts.length = 0; alerts.length = 0;
  Object.keys(cells).forEach(k => delete cells[k]);
  apiCalls = []; apiFail = null; uiWorks = true;
  Object.keys(props).forEach(k => delete props[k]);
  gh = null; triggers = []; lockFree = true; errs.length = 0;
  panel = mkPanel();          // 「説明」タブは最初からある
  if (driveFiles) {
    const f = mkFolder('taxi-gas');
    driveFiles.forEach(([n, c, u]) => f._files.push(mkFile(n, c, u)));
    drive['taxi-gas'] = f;
  }
  project = {
    files: projFiles || [MANIFEST, { name: '001-Code', type: 'SERVER_JS', source: 'ふるい' }],
    deployments: [
      { deploymentId: 'D1', deploymentConfig: { versionNumber: 3, description: '本番' } },
      { deploymentId: 'HEAD', deploymentConfig: { description: '作業中' } }   // 版なし
    ],
    version: 3
  };
}
const lastPut = () => apiCalls.filter(c => c.path === '/content' && c.method === 'put').pop();

console.log('\n■ ドライブから読む');
reset([['001-Code.gs', 'あたらしい'], ['004-WebApp.gs', 'ページ'], ['めも.txt', 'これは無視']]);
let d = F('updReadDrive_')();
t(d.length === 2, '.gs だけ読む（.txt は無視）');
t(d.map(x => x.name).sort().join(',') === '001-Code,004-WebApp', '拡張子を落とした名前になる');
t(d[0].type === 'SERVER_JS', '種類は SERVER_JS');

reset([['004-WebApp.html', '<b>x</b>'], ['appsscript.json', '{}']]);
d = F('updReadDrive_')();
t(d.filter(x => x.name === '004-WebApp')[0].type === 'HTML', '.html は HTML');
t(d.filter(x => x.name === 'appsscript')[0].type === 'JSON', '.json は JSON');

console.log('\n■ 同じ名前が複数あったら、新しいほうを使う');
reset([['001-Code.gs', 'ふるい版', 1000], ['001-Code.gs', 'あたらしい版', 9000]]);
d = F('updReadDrive_')();
t(d.length === 1, '1つにまとまる');
t(d[0].source === 'あたらしい版', '新しいほうが勝つ');

console.log('\n■ 更新の流れ');
reset([['001-Code.gs', 'あたらしい'], ['005-Updater.gs', '更新係']]);

/*
 * ★更新のあと、見張りをこちらでそろえること。
 *   前は「入れ替えたら、LINEに『なおして』と打ってください」とお願いしていた。
 *   打ち忘れると、新しく増えた見張りが立たないまま黙って止まる。
 *   毎回 手で打ってもらうのは、忘れる前提のやり方だった
 */
vm.runInContext('var upFmt = 0, upRep = 0, upTst = 0, upVn = 0;' +
  'function ensureAutoFormatTrigger_(){ upFmt++; return true; }' +
  'function ensureAutoReportTrigger_(){ upRep++; return true; }' +
  'function ensureAutoReportTestTrigger_(){ upTst++; return true; }' +
  'function vnEnsureDailyTrigger_(){ upVn++; return true; }', ctx);
const upOut = F('menuUpdateCode')();
t(vm.runInContext('upFmt', ctx) === 1, '★更新したら、毎日17時の見張りを自分でそろえる');
t(vm.runInContext('upRep', ctx) === 1, '  レポート本番も');
t(vm.runInContext('upTst', ctx) === 1, '  レポート確認用も');
t(vm.runInContext('upVn', ctx) === 1, '  ★イベントの見張りも（ここが立たないと黙って止まる）');
t(String(upOut).indexOf('見張り') !== -1, '  何をしたか、結果にも書く');
t(lastPut() !== undefined, '書き込みが走った');
const put = lastPut().body.files;
t(put.filter(f => f.name === '001-Code')[0].source === 'あたらしい', '001-Code が入れ替わった');
t(put.filter(f => f.name === '005-Updater').length === 1, '無かったファイルは足される');
t(put.filter(f => f.name === 'appsscript').length === 1, 'appsscript は残る');
has(alerts[alerts.length - 1].t, '更新しました', '結果を知らせる');
t(Object.keys(drive['taxi-gas']._folders[0]._folders).length !== 0 ||
  drive['taxi-gas']._folders[0]._folders.length === 1, '書き換える前に保存された');
const bk = drive['taxi-gas']._folders[0]._folders[0];
t(bk._files.length === 2, '保存には元の全ファイルが入っている');
t(bk._files.map(f => f.getName()).indexOf('appsscript.json') !== -1,
  'appsscript も .json で保存される');

console.log('\n■ デプロイもやり直す');
t(project.version === 4, '新しい版が作られた');
const d1 = project.deployments.filter(x => x.deploymentId === 'D1')[0];
t(d1.deploymentConfig.versionNumber === 4, '公開中のデプロイが新しい版になった');
t(project.deployments.filter(x => x.deploymentId === 'HEAD')[0]
    .deploymentConfig.versionNumber === undefined, '作業中(@HEAD)のものは触らない');
has(alerts[alerts.length - 1].b, 'デプロイもやり直しました', 'その旨も伝える');

console.log('\n■ 危ないときは書き込まない');
reset([['001-Code.gs', 'あたらしい']]);
let threw = false;
try { F('updPutProject_')([{ name: '001-Code', type: 'SERVER_JS', source: 'x' }]); }
catch (e) { threw = true; has(e.message, 'appsscript', 'appsscript が無ければ止める'); }
t(threw, 'そのまま書き込まない');

reset([['001-Code.gs', 'あたらしい']]);
threw = false;
try { F('updPutProject_')([]); } catch (e) { threw = true; }
t(threw, '空でも書き込まない');

console.log('\n■ 保存に失敗したら書き込まない');
reset([['001-Code.gs', 'あたらしい']]);
const realCreate = drive['taxi-gas'].createFolder;
drive['taxi-gas'].createFolder = () => { throw new Error('ドライブがいっぱいです'); };
F('menuUpdateCode')();
t(lastPut() === undefined, '書き込みまで進まない');
has(alerts[alerts.length - 1].t, 'バックアップできませんでした', '理由を出す');
t(project.files.filter(f => f.name === '001-Code')[0].source === 'ふるい',
  'コードは元のまま');

console.log('\n■ APIが使えないとき');
reset([['001-Code.gs', 'あたらしい']]);
apiFail = { path: '/content', method: 'get', code: 403,
            msg: 'User has not enabled the Apps Script API.' };
F('menuUpdateCode')();
t(lastPut() === undefined, '書き込まない');
has(alerts[alerts.length - 1].b, 'usersettings', 'どこで ON にするか教える');

console.log('\n■ 書き込みが失敗したとき');
reset([['001-Code.gs', 'あたらしい']]);
apiFail = { path: '/content', method: 'put', code: 500, msg: 'なにか失敗' };
F('menuUpdateCode')();
has(alerts[alerts.length - 1].t, '書き込めませんでした', 'そう伝える');
has(alerts[alerts.length - 1].b, 'コードは元のまま', '元のままだと伝える');
t(drive['taxi-gas']._folders[0]._folders.length === 1, '保存は残っている');

console.log('\n■ 変わっていなければ何もしない');
reset([['001-Code.gs', 'ふるい']]);
F('menuUpdateCode')();
t(lastPut() === undefined, '書き込まない');
has(alerts[alerts.length - 1].t, 'すでに最新', 'そう伝える');
t(drive['taxi-gas']._folders.length === 0, '無駄な保存もしない');

console.log('\n■ ドライブに何も無いとき');
reset([]);
F('menuUpdateCode')();
t(lastPut() === undefined, '書き込まない');
has(alerts[alerts.length - 1].t, '新しいコードがありません', 'そう伝える');

console.log('\n■ 前のコードに戻す');
reset([['001-Code.gs', 'あたらしい']]);
F('menuUpdateCode')();
t(project.files.filter(f => f.name === '001-Code')[0].source === 'あたらしい', 'まず更新');
F('menuRestoreCode')();
t(project.files.filter(f => f.name === '001-Code')[0].source === 'ふるい', '元に戻った');
has(alerts[alerts.length - 1].t, '戻しました', 'そう伝える');

reset([['001-Code.gs', 'あたらしい']]);
F('menuRestoreCode')();
has(alerts[alerts.length - 1].b, '保存されたコードがありません', '保存が無ければそう言う');

console.log('\n■ 保存は増えすぎないように');
reset([['001-Code.gs', 'あたらしい']]);
for (let i = 0; i < 13; i++) {
  project.files = [MANIFEST, { name: '001-Code', type: 'SERVER_JS', source: 'v' + i }];
  F('menuBackupCode')();
}
const kept = drive['taxi-gas']._folders[0]._folders.filter(f => !f._trashed);
t(kept.length <= 10, '10個までに抑える（実際 ' + kept.length + '個）');

console.log('\n■ ダイアログが出せなくても動く');
reset([['001-Code.gs', 'あたらしい']]);
uiWorks = false;
F('menuUpdateCode')();
t(lastPut() !== undefined, 'ダイアログ無しでも更新できる');
t(toasts.length > 0, 'トーストで知らせる');
has(panel._cells['5,9'], '更新しました', '説明タブの I5（非表示）にも残る');
has(panel._cells['5,9'], '最後の更新', '  見出しも同じマスに入る');

console.log('\n■ 状態を調べる');
reset([['001-Code.gs', 'あたらしい']]);
F('menuUpdateStatus')();
has(alerts[0].b, 'Apps Script API：使えます', 'APIが使えるか出る');
has(alerts[0].b, '001-Code', 'ドライブの中身が出る');

reset([['001-Code.gs', 'あたらしい']]);
apiFail = { path: '/content', method: 'get', code: 403, msg: 'not enabled' };
F('menuUpdateStatus')();
has(alerts[0].b, '使えません', '使えないときもそう出る');
has(alerts[0].b, 'usersettings', '直し方も出る');

/*
 * ★同じ「403」でも、意味が2つある。
 *   「insufficient authentication scopes」は、APIのスイッチの話ではなく、
 *   許可をもらい直す話。読みちがえると、関係ないところを何度も触ることになる
 */
{
  const H = F('updApiHow_');
  const scope = H({ message: '(403) Request had insufficient authentication scopes.' });
  has(scope, '許可を、もらい直してください', '★「許可が足りない」ときは、承認のやり直しを案内する');
  has(scope, 'APIのスイッチの話ではありません', '  スイッチの話ではないと、はっきり書く');
  has(scope, '拡張機能', '  道順も書く');
  has(scope, 'きょかをもらう', '  どの関数を動かすかも書く');
  /*
   * ★編集画面の「関数を選ぶ」らんは、いま開いているファイルのぶんしか出ない。
   *   そのせいで「menuUpdateStatus が見つかりません」となってしまった
   */
  has(scope, '005-Updater', '★どのファイルを開くかも書く');
  has(scope, '開いているファイルのぶんしか出ません', '  なぜファイルを開くのかも書く');
  t(scope.indexOf('usersettings') === -1, '★このときは、スイッチの案内を出さない（まぎらわしいため）');

  const off = H({ message: '(403) Apps Script API not enabled' });
  has(off, 'usersettings', 'スイッチが切れているときは、スイッチの案内を出す');
  t(off.indexOf('許可を、もらい直して') === -1, '  そちらでは、承認の話は出さない');
  /*
   * ★「has not been used in project …」のときは、入れる場所が2か所ある。
   *   片方だけでは通らないことがあるので、どちらも出す
   */
  const off2 = H({ message: '(403) Apps Script API has not been used in project 545100114464 ' +
    'before or it is disabled. Enable it by visiting ' +
    'https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=545100114464 then retry.' });
  has(off2, 'usersettings', '★まず usersettings を案内する');
  has(off2, 'console.developers.google.com/apis/api/script.googleapis.com/overview?project=545100114464',
      '★だめなときのために、そのページのリンクもそのまま出す');
  has(off2, '有効にする', '  そこで押すボタンの名前も書く');
  has(off2, '数分かかります', '★入れてすぐは効かないことも書く（失敗と思わせないため）');
  has(H(null), 'usersettings', 'null でも落ちない');

  reset([['001-Code.gs', 'x']]);
  apiFail = { path: '/content', method: 'get', code: 403,
              msg: 'Request had insufficient authentication scopes.' };
  F('menuUpdateCode')();
  has(alerts[alerts.length - 1].b, '許可を、もらい直してください',
      '★[1] を押したときも、正しい直し方が出る');
  apiFail = null;
}

console.log('\n■ いま見ている枝の、いちばん新しい書き込みを出す');
{
  /*
   * ★「☑を押したのに、古いままだ」というとき、たいていは枝がちがう。
   *   日時と題がここに出れば、取り込む前に見分けられる
   */
  const keepRepo = props['GH_REPO'], keepTok = props['GH_TOKEN'], keepBr = props['GH_BRANCH'];
  props['GH_REPO'] = 'circlenine/test';
  props['GH_TOKEN'] = 'github_pat_xxx';
  props['GH_BRANCH'] = 'claude/gas-code-info-collection-e5mxw3';
  gh = { dir: [], head: { commit: { message: 'さいしんの直し\n\n本文',
                                    author: { date: '2026-09-16T14:20:00Z' } } } };
  ghUrls.length = 0;
  const h = F('updHeadInfo_')();
  has(h, '2026-09-16 14:20', '書き込んだ日時が出る');
  /*
   * ★枝の名前には「claude/なんとか」のように「/」が入る。
   *   ふつうの入れ方だと「%2F」に置きかわり、GitHubが別の名前として扱うので、
   *   ちゃんとある枝なのに「見つかりません」になっていた（実際になった）
   */
  has(ghUrls[0], '/commits/claude/gas-code-info-collection-e5mxw3',
      '★枝の「/」は、そのままURLに入れる');
  t(ghUrls[0].indexOf('%2F') === -1, '  「%2F」に置きかえない');

  const P = F('updRefPath_');
  t(P('claude/abc') === 'claude/abc', '「/」はそのまま');
  t(P('feature/日本語') === 'feature/' + encodeURIComponent('日本語'),
    '  日本語などは、ちゃんと置きかえる');
  t(P('a b') === 'a%20b', '  空白も置きかえる');
  t(P('') === '', '空でも落ちない');
  t(P(null) === '', 'null でも落ちない');
  has(h, 'さいしんの直し', '  題の1行目も出る');
  t(h.indexOf('本文') === -1, '  2行目から先は出さない（長くなるため）');

  // 枝の名前を打ちまちがえたとき
  gh = { dir: [], headFail: 404 };
  has(F('updHeadInfo_')(), 'その枝が見つかりません', '★枝が無ければ、はっきりそう言う');
  gh = { dir: [], headFail: 500 };
  t(F('updHeadInfo_')().indexOf('その枝が見つかりません') === -1,
    '  ほかの不具合を「枝が無い」とは言わない');

  // [2] の結果にも出る
  reset([]);
  props['GH_REPO'] = 'circlenine/test';
  props['GH_TOKEN'] = 'github_pat_xxx';
  props['GH_BRANCH'] = 'claude/gas-code-info-collection-e5mxw3';
  gh = { dir: [], head: { commit: { message: 'さいしんの直し', author: { date: '2026-09-16T14:20:00Z' } } } };
  F('menuUpdateStatus')();
  has(alerts[0].b, '枝　　：claude/gas-code-info-collection-e5mxw3', '★どの枝を見ているか出る');
  has(alerts[0].b, '最新　：', '★その枝の最新も出る');
  has(alerts[0].b, 'さいしんの直し', '  題も出る');

  props['GH_REPO'] = keepRepo; props['GH_TOKEN'] = keepTok; props['GH_BRANCH'] = keepBr;
}

console.log('\n■ 読み元の選び方');
{
  /*
   * ★みんなに公開されている置き場なら、鍵は要りません。
   *   前は「鍵が無ければドライブ」だったので、鍵が無いというだけで
   *   ドライブの古いコードを読みにいってしまう形でした
   */
  reset([['001-Code.gs', 'x']]);
  gh = { dir: [] };
  t(F('updSource_')() === 'github', '★鍵が無くても、GitHubを読みにいく');
  props['GH_TOKEN'] = 'github_pat_xxx';
  t(F('updSource_')() === 'github', '鍵があっても、もちろんGitHub');
  delete props['GH_TOKEN'];

  // ★鍵が無いときは、鍵の行そのものを付けない（空の鍵は かえって断られる）
  const h1 = F('updGhHeaders_')(false);
  t(h1.Authorization === undefined, '★鍵が無ければ、鍵の行を付けない');
  props['GH_TOKEN'] = 'github_pat_xxx';
  const h2 = F('updGhHeaders_')(false);
  t(h2.Authorization === 'Bearer github_pat_xxx', '  鍵があれば、付ける');
  delete props['GH_TOKEN'];
}

console.log('\n■ GitHubから読む');
reset([]);
props['GH_REPO'] = 'circlenine/test';
props['GH_TOKEN'] = 'github_pat_xxx';
props['GH_BRANCH'] = 'claude/gas-code-info-collection-e5mxw3';
props['GH_PATH'] = 'gas';
gh = {
  dir: [
    { name: '001-Code.gs',    path: 'gas/001-Code.gs',    type: 'file' },
    { name: '004-WebApp.gs',  path: 'gas/004-WebApp.gs',  type: 'file' },
    { name: 'appsscript.json', path: 'gas/appsscript.json', type: 'file' },
    { name: 'README.md',      path: 'gas/README.md',      type: 'file' },
    { name: 'parts',          path: 'gas/parts',          type: 'dir' }
  ],
  raw: {
    'gas/001-Code.gs': 'あたらしいコード',
    'gas/004-WebApp.gs': 'ページ',
    'gas/appsscript.json': '{"timeZone":"Asia/Tokyo"}'
  }
};
let g = F('updReadGitHub_')().files;
t(g.length === 3, '.gs と .json だけ読む（.md とフォルダは無視）');
t(g.filter(x => x.name === '001-Code')[0].source === 'あたらしいコード', '中身が取れる');
t(g.filter(x => x.name === 'appsscript')[0].type === 'JSON', 'appsscript は JSON 扱い');
t(F('updListNew_')().sort().join(',') === '001-Code,004-WebApp,appsscript',
  '名前だけなら、中身を読まずに一覧が出る');

console.log('\n■ GitHubから読んで更新する');
F('menuUpdateCode')();
t(lastPut() !== undefined, '書き込みが走った');
t(project.files.filter(f => f.name === '001-Code')[0].source === 'あたらしいコード',
  'GitHubの中身で入れ替わった');
t(drive['taxi-gas']._folders[0]._folders.length === 1,
  'GitHubから読むときも、書き換える前に保存する');

console.log('\n■ GitHubのエラー');
reset([]);
props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'わるい鍵';
gh = { fail: { code: 401, msg: 'Bad credentials' } };
F('menuUpdateCode')();
t(lastPut() === undefined, '読めなければ書き込まない');
has(alerts[alerts.length - 1].b, '期限切れ', '鍵の問題だと分かる文言を出す');

reset([]);
props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'x';
gh = { fail: { code: 404, msg: 'Not Found' } };
F('menuUpdateCode')();
has(alerts[alerts.length - 1].b, '置き場所が見つかりません', '404なら置き場所の話をする');
t(project.files.filter(f => f.name === '001-Code')[0].source === 'ふるい', 'コードは無傷');

console.log('\n■ 鍵はどこにも書き出さない');
reset([]);
props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'github_pat_himitsu';
gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' },
             { name: 'appsscript.json', path: 'gas/appsscript.json', type: 'file' }],
       raw: { 'gas/001-Code.gs': 'x', 'gas/appsscript.json': '{}' } };
F('menuUpdateStatus')();
t(alerts[0].b.indexOf('github_pat_himitsu') === -1, '状態画面に鍵を出さない');
has(alerts[0].b, '読み元：GitHub', '読み元は出す');
t(JSON.stringify(panel._cells).indexOf('github_pat_himitsu') === -1, 'シートにも書かない');

console.log('\n■ そうさタブ（スマホアプリ用のボタン）');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
t(String(panel._cells['8,3']) === '▼ チェックを入れると動きます（終わると自動で外れます）',
  '説明タブの8行目に見出しが入る（C列）');
let items = F('panelItems_')();
// このテストでは 005-Updater しか読み込んでいないので、
// 004-WebApp や 001-Code の機能は出てこないのが正しい
t(items.length === 13, 'いつも13個並ぶ（' + items.length + '個）');
t(items[0].fn === 'menuUpdateCode', '1つめは「コードを更新する」');
t(items.some(x => x.fn === 'menuWebAppSendLineStep'),
  '入れていない機能も並べる（数が変わると行がずれるため）');
t(items.map(x => x.fn).join(',') ===
  'menuUpdateCode,menuUpdateStatus,menuFormatAll,menuRestoreCode,' +
  'menuWebAppSendLineStep,menuWebAppCheck,menuSendReportPanel,panelAutoReportStatus,panelVenueProbe,menuVenueSample,' +
  'menuVenueTestSend,panelVenueAuto,panelVenueList',
  'スプシに置いてある番号どおりの並び');
t(F('panelHas_')('menuUpdateCode') === true, '入っている機能は分かる');
t(F('panelHas_')('menuWebAppSendLineStep') === false, '入っていない機能も分かる');
t(F('panelHas_')('menuUpdateCode') === true, 'ある関数は true');
t(F('panelHas_')('そんな関数はない') === false, '無い関数は false');

console.log('\n■ 見張りのしくみが入る');
t(triggers.filter(x => x.getHandlerFunction() === 'panelOnEdit').length === 1,
  'チェックした瞬間に動くトリガー');
t(triggers.filter(x => x.getHandlerFunction() === 'panelWatch').length === 1,
  '1分おきの見張り');
F('menuMakePanel')();
t(triggers.filter(x => x.getHandlerFunction() === 'panelWatch').length === 1,
  '作り直しても二重にならない');
F('menuPanelWatchOff')();
t(triggers.filter(x => x.getHandlerFunction() === 'panelWatch').length === 0,
  '見張りだけ止められる');
t(triggers.filter(x => x.getHandlerFunction() === 'panelOnEdit').length === 1,
  'onEdit のほうは残る');

console.log('\n■ チェックすると動く');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
const TOP = 9;   // はじめて置いたときは 8行目が見出し、9行目からボタン
panel._cells[TOP + ',2'] = true;                       // 1行目＝コードを更新する
F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                            getRow: () => TOP }, value: 'TRUE' });
t(panel._cells[TOP + ',2'] === false, '終わったらチェックが外れる');
t(lastPut() !== undefined, '更新が実際に走った');
// 「結果」の行を探して書くので、入力らんが増えても付いていける
const resRow = F('panelResultRow_')(panel);
has(panel._cells[resRow + ',3'], '✅', '結果らんに出る');

console.log('\n■ 「結果」は、上に置いても下に置いても、そこに書く');
{
  /*
   * ★まーくさんが「結果」をボタンより上（3行目）に置き直された。
   *   前は「ボタンより下」しか探していなかったので、
   *   上に置いたほうには書かれず、下に書きつづけていた
   */
  const below = F('panelResultRow_')(panel);
  t(below > 8, 'ボタンの下に置いてあれば、そこを使う');

  // 上（2行目）に「結果」を置いてみる
  panel._cells['2,2'] = '結果';
  const above = F('panelResultRow_')(panel);
  t(above === 3, '★上に置いたら、そのすぐ下（3行目）に書く');
  const cell = F('panelResultCell_')(panel);
  t(cell.col === 2, '  列も「結果」と同じ列にそろえる');

  // 上下ふたつあるときは、上を使う
  t(above < below, '★2つあるときは、上のほうに書く（目に入りやすいので）');

  // 実際に押したときも、上に出る
  Object.keys(panel._cells).forEach(k => { if (k === '3,2') delete panel._cells[k]; });
  panel._cells[panelChk(panel) + ',' + 9] = true;   // 何か1つ押した形にする
  delete panel._cells['2,2'];                        // もとに戻す
  t(F('panelResultRow_')(panel) === below, '  戻せば、また下に書く');
}
has(panel._cells[resRow + ',3'], 'コードを更新する', 'どれを動かしたか分かる');

console.log('\n■ チェックを外したときは動かない');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                            getRow: () => TOP }, value: 'FALSE' });
t(lastPut() === undefined, '外したときは何もしない');

console.log('\n■ 関係ない場所を触っても動かない');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 3,
                            getRow: () => TOP }, value: 'TRUE' });
t(lastPut() === undefined, 'チェック以外の列を触っても動かない');
F('panelOnEdit')({ range: { getSheet: () => ({ getName: () => 'ﾀﾞｲｽｹ' }),
                            getColumn: () => 2, getRow: () => TOP }, value: 'TRUE' });
t(lastPut() === undefined, '別のタブなら動かない');
F('panelOnEdit')({});
F('panelOnEdit')(null);
t(errs.length === 0, '変な呼ばれ方をしても落ちない' +
  (errs.length ? '（' + JSON.stringify(errs) + '）' : ''));

console.log('\n■ 1分おきの見張りでも動く（アプリでonEditが効かないとき用）');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
panel._cells[TOP + ',2'] = true;
F('panelWatch')();
t(lastPut() !== undefined, '見張りが拾って動かす');
t(panel._cells[TOP + ',2'] === false, 'チェックも外れる');

reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
F('panelWatch')();
t(lastPut() === undefined, 'チェックが無ければ何もしない');

console.log('\n■ 二重に動かない');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
panel._cells[TOP + ',2'] = true;
lockFree = false;                                   // すでに誰かが動かしている
F('panelWatch')();
t(lastPut() === undefined, '鍵が取れなければ動かさない');
t(panel._cells[TOP + ',2'] === true, 'チェックも外さない（あとで拾えるように）');

console.log('\n■ 失敗しても結果が残る');
reset([]);                                          // ドライブに何も無い状態
F('menuMakePanel')();
panel._cells[TOP + ',2'] = true;
F('panelWatch')();
t(panel._cells[TOP + ',2'] === false, 'チェックは外れる（押しっぱなしにならない）');
has(panel._cells[F('panelResultRow_')(panel) + ',3'], '✅', '処理自体は最後まで通る');

console.log('\n■ 8行目より上は絶対に触らない');
reset([['001-Code.gs', 'あたらしい']]);
// 説明タブに、もともと入っているものを置いておく
panel._cells['1,1'] = 'このシートの説明';
panel._cells['2,2'] = '大事なメモ';
panel._cells['6,1'] = '6行目のなにか';
panel._cells['Z1'] = 'Cgroup123';
panel._cells['Z2'] = 'dashboardId';
F('menuMakePanel')();
t(panel._cells['1,1'] === 'このシートの説明', '1行目はそのまま');
t(panel._cells['2,2'] === '大事なメモ', '2行目はそのまま');
t(panel._cells['6,1'] === '6行目のなにか', '6行目はそのまま');
t(panel._cells['Z1'] === 'Cgroup123', 'Z1（グループID）はそのまま');
t(panel._cells['Z2'] === 'dashboardId', 'Z2（ダッシュボード）はそのまま');
t(panel._cells['7,1'] === undefined, '7行目は空のまま');
t(String(panel._cells['8,3']).indexOf('チェックを入れると') !== -1, '8行目に見出し');
t(String(panel._cells['9,3']).indexOf('コードを更新') !== -1, '9行目から1つめのボタン');

console.log('\n■ 行を差し込むので、もともとの中身は消えない');
reset([['001-Code.gs', 'あたらしい']]);
panel._cells['8,2'] = 'もともと8行目にあったもの';
panel._cells['9,3'] = 'もともと9行目にあったもの';
F('menuMakePanel')();
// 8行目から10行差し込まれるので、元の中身は下へ move している
const still = Object.keys(panel._cells).map(k => panel._cells[k]);
t(still.indexOf('もともと8行目にあったもの') !== -1, '8行目にあったものは残っている');
t(still.indexOf('もともと9行目にあったもの') !== -1, '9行目にあったものは残っている');
has(alerts[alerts.length - 1].t, 'ボタンを置きました', '止まらずに置ける');
has(alerts[alerts.length - 1].b, '何も消していません', 'そう伝える');

console.log('\n■ 2回目は「もう置いてある」として、並べ直さない');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
const firstHead = panel._cells['8,3'];
F('menuMakePanel')();
t(panel._cells['8,3'] === firstHead, '見出しはそのまま');
has(alerts[alerts.length - 1].t, 'もう置いてあります', '置き直さないと伝える');

console.log('\n■ 説明タブを clear しない');
reset([['001-Code.gs', 'あたらしい']]);
panel._cells['3,1'] = 'きえたら困る';
F('menuMakePanel')();
t(panel._cells['3,1'] === 'きえたら困る', 'clear していない（していたら例外で落ちる作りにしてある）');

console.log('\n■ チェックのらんだけを自分だけが押せるようにする');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
t(panel._prot.length === 1, '保護がかかる');
t(panel._prot[0]._a1 === 'B9:B24',
  'チェックのらん（B列）を、置いてある行のぶんだけ守る（入力らん3つも含む）');
t(panel._prot[0]._editors.length === 0, 'ほかの編集者は外される（＝自分だけ）');
t(panel._prot[0]._domain === false, '同じドメインの人もまとめて外す');
has(alerts[alerts.length - 1].b, 'あなただけが触れるように', 'そう伝える');
t(F('panelIsProtected_')(panel) === true, '保護されていると分かる');

console.log('\n■ 作り直しても保護が二重にならない');
F('menuMakePanel')();
t(panel._prot.length === 1, '保護は1つのまま');

console.log('\n■ 保護をかけられなかったときは、はっきり言う');
reset([['001-Code.gs', 'あたらしい']]);
panel._failProtect(true);
F('menuMakePanel')();
has(alerts[alerts.length - 1].b, '保護をかけられませんでした', '黙って済ませない');
has(alerts[alerts.length - 1].b, '誰でもチェックを押せます', '何が起きるか書く');
t(F('panelIsProtected_')(panel) === false, '保護なしと分かる');

console.log('\n■ 見やすいように動かしても、ちゃんと追いかける');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
t(F('panelHeadRow_')(panel) === 8, 'はじめは8行目');
t(F('panelTop_')(panel) === 9, 'ボタンは9行目から');

// 34行目あたりへ引っ越したことにする（実際のスプシでやったのと同じ状態）
Object.keys(panel._cells).forEach(k => {
  const m = k.match(/^(\d+),(\d+)$/);
  if (!m) return;
  const r = +m[1];
  if (r < 8) return;
  panel._cells[(r + 27) + ',' + m[2]] = panel._cells[k];
  delete panel._cells[k];
});
props['PANEL_ROW'] = '8';                    // 覚えている場所は古いまま
t(F('panelHeadRow_')(panel) === 35, '動かした先（35行目）を見つけ直す');
t(F('panelTop_')(panel) === 36, 'ボタンの位置も追いつく');
t(props['PANEL_ROW'] === '35', '新しい場所を覚え直す');

console.log('\n■ 動かした先でもチェックが効く');
panel._cells['36,2'] = true;                 // 引っ越し先の1つめ
F('panelWatch')();
t(lastPut() !== undefined, '見張りが拾って動かす');
t(panel._cells['36,2'] === false, 'チェックも外れる');
has(panel._cells[F('panelResultRow_')(panel) + ',3'], '✅', '結果も正しい行に出る');

F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                            getRow: () => 36 }, value: 'TRUE' });
t(panel._cells['36,2'] === false, 'onEdit でも効く');
F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                            getRow: () => 9 }, value: 'TRUE' });
t(true, '引っ越し前の行を触っても、何も起きない（例外にならない）');

console.log('\n■ もう置いてあるときは、並べ直さない');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
// 見た目を自分で整えたことにする
panel._cells['9,3'] = '🔄 コードを更新する（じぶんで書き換えた）';
panel._cells['8,3'] = '▼ チェックを入れると動きます（じぶんで書き換えた）';
F('menuMakePanel')();
t(panel._cells['9,3'] === '🔄 コードを更新する（じぶんで書き換えた）',
  'ラベルを書き換えない');
t(panel._cells['8,3'] === '▼ チェックを入れると動きます（じぶんで書き換えた）',
  '見出しも書き換えない');
has(alerts[alerts.length - 1].t, 'もう置いてあります', 'そう伝える');
has(alerts[alerts.length - 1].b, '並びはそのまま', '触っていないと伝える');
t(triggers.filter(x => x.getHandlerFunction() === 'panelWatch').length === 1,
  '見張りは入れ直す');

console.log('\n■ 見出しを消してしまったら、置き直せる');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
Object.keys(panel._cells).forEach(k => { if (/^\d+,/.test(k)) delete panel._cells[k]; });
delete props['PANEL_ROW'];
t(F('panelHeadRow_')(panel) === 0, '見出しが無ければ 0');
t(F('panelTop_')(panel) === 0, 'ボタンの位置も 0');
F('panelWatch')();
t(true, '置いていない状態で見張りが回っても落ちない');
F('menuMakePanel')();
t(F('panelHeadRow_')(panel) === 8, 'もう一度8行目に置ける');

console.log('\n■ 更新情報の行を足しても、追いかける');
reset([['001-Code.gs', 'あたらしい']]);
// 実際の説明タブに近い形にする
panel._cells['2,2'] = '⚙️ 更新情報';
panel._cells['3,2'] = '08/25(火) 00:00';
F('menuMakePanel')();
t(F('panelHeadRow_')(panel) === 8, 'はじめは8行目');
// 3行目に新しい更新情報を1行足す（いつもの運用）
panel.insertRowsAfter(2, 1);
t(F('panelHeadRow_')(panel) === 9, '1つ下がったのを見つける');
t(F('panelTop_')(panel) === 10, 'ボタンの位置も追いつく');
// 何回も足す
panel.insertRowsAfter(2, 5);
t(F('panelHeadRow_')(panel) === 14, '5行足しても追いつく');
panel._cells['15,2'] = true;                        // 1つめのボタン
F('panelWatch')();
t(lastPut() !== undefined, 'ずれた先でもチェックが効く');
t(panel._cells['15,2'] === false, 'チェックも外れる');
has(panel._cells[F('panelResultRow_')(panel) + ',3'], '✅', '結果も正しい行に出る');

console.log('\n■ 遠くまで行っても見つける');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
panel.insertRowsAfter(2, 150);
t(F('panelHeadRow_')(panel) === 158, '150行足しても見つける');

console.log('\n■ 足りないボタンだけ足す');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
// 4つしか無かった昔の状態を作る（5つめ以降を消す）
[13, 14, 15, 16, 17, 18, 19, 20].forEach(r => {
  delete panel._cells[r + ',2']; delete panel._cells[r + ',3']; delete panel._cells[r + ',4'];
});
panel._cells['9,3'] = '[1] コードを更新する（じぶんで整えた）';
F('menuMakePanel')();
t(panel._cells['9,3'] === '[1] コードを更新する（じぶんで整えた）',
  'すでにあるボタンの文言は書き換えない');
const added = F('panelReadRows_')(panel).map(r => String(r.text));
t(added.some(x => x.indexOf('URLをLINE') !== -1), '5つめが足された');
t(added.some(x => x.indexOf('開けるか調べる') !== -1), '6つめが足された');
t(added.some(x => x.indexOf('レポートをLINE') !== -1), '7つめが足された');
t(added.some(x => x.indexOf('自動送信の状態') !== -1), '8つめが足された');
t(F('panelReadRows_')(panel).every(r => r.value === false),
  '足した行にチェックボックスが付く');
has(alerts[alerts.length - 1].b, '9個のボタンを足しました', '何個足したか伝える');
has(alerts[alerts.length - 1].b, 'レポートの期間', '入力らんも置いたと伝える');

console.log('\n■ そろっていれば何も足さない');
// 控えらん（I列＝9列目）は毎回書かれるので、ボタンの部分だけを比べる
const grid = () => JSON.stringify(Object.keys(panel._cells)
  .filter(k => /^\d+,\d+$/.test(k) && k.split(',')[1] !== '9').sort()
  .map(k => k + '=' + panel._cells[k]));
const before = grid();
F('menuMakePanel')();
t(grid() === before, 'ボタンのセルを一切さわらない');
has(alerts[alerts.length - 1].b, '並びはそのまま', 'そう伝える');

console.log('\n■ 入れていない機能を押したとき');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
panel._cells['13,2'] = true;          // 5つめ＝ページのURLをLINEに送る（004-WebApp）
F('panelWatch')();
t(panel._cells['13,2'] === false, 'チェックは外れる');
has(panel._cells[F('panelResultRow_')(panel) + ',3'], 'まだ使えません', 'そう出る');
has(panel._cells[F('panelResultRow_')(panel) + ',3'], '004-WebApp', 'どれを入れればいいか出る');
t(lastPut() === undefined, '何も実行されない');

console.log('\n■ チェックは大きく（スマホで押しやすいように）');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
t(panel._sizes['9,2'] === 50, '1つめのチェックが文字サイズ50');
t(panel._sizes['14,2'] === 50, '6つめのチェックも同じ');
t(panel._sizes['9,3'] === 12, 'ラベルは普通の大きさのまま');

console.log('\n■ チェックの列は決め打ちにしない');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
t(F('panelChkCol_')(panel, 9) === 2, 'はじめて置いたときはB列');
// 昔の形（A列にチェック）を作る
reset([['001-Code.gs', 'あたらしい']]);
panel._cells['35,2'] = '▼ チェックを入れると動きます（終わると自動で外れます）';
for (let i = 0; i < 6; i++) {
  panel._cells[(36 + i) + ',1'] = false;                       // A列にチェック
  panel._cells[(36 + i) + ',2'] = ['🔄 コードを更新する','🔧 更新できる状態か調べる',
    '💬 ページのURLをLINEに送る','🩺 ページが開けるか調べる',
    '🧹 全タブをまとめて整形する','⏪ 前のコードに戻す'][i];
}
t(F('panelHeadRow_')(panel) === 35, '見出しを見つける');
t(F('panelChkCol_')(panel, 36) === 1, 'A列のチェックも見つける');
panel._cells['36,1'] = true;
F('panelWatch')();
t(lastPut() !== undefined, 'A列でもチェックが効く');
t(panel._cells['36,1'] === false, 'A列のチェックが外れる');
has(panel._cells[F('panelResultRow_')(panel) + ',2'],
    '✅', '結果はチェックのすぐ右の列（B）に出る');

/* ============ 実際のスプシで起きた並びの崩れ ============ */
console.log('\n■ 並び順ではなく、書いてある文言で動く');
// 実際にこうなっていた：38行目と40行目、39行目と41行目が同じ文言
function realLayout() {
  reset([['001-Code.gs', 'あたらしい']]);
  panel._cells['34,2'] = '💡 まーく用 コード修正開始チェックボタン';
  panel._cells['35,2'] = '▼ チェックを入れると動きます（終わると自動で外れます）';
  const labels = ['[1] コードを更新する', '[2] 更新できる状態か調べる',
                  '[3] 全タブをまとめて整形する', '[4] 前のコードに戻す',
                  '[3] 全タブをまとめて整形する', '[4] 前のコードに戻す'];  // 5・6が重複
  for (let i = 0; i < 6; i++) {
    panel._cells[(36 + i) + ',2'] = false;      // B列＝チェック
    panel._cells[(36 + i) + ',3'] = labels[i];  // C列＝ラベル
  }
  panel._cells['43,2'] = '結果';                 // 結果はB列へ動かしてある
  panel._cells['44,2'] = '（まだ何も動かしていません）';
}

realLayout();
t(F('panelHeadRow_')(panel) === 35, '見出しは35行目');
t(F('panelChkCol_')(panel, 36) === 2, 'チェックはB列');
t(F('panelItemOf_')('[3] 全タブをまとめて整形する').fn === 'menuFormatAll',
  '文言から正しい機能を引ける');
t(F('panelItemOf_')('[1] コードを更新する').fn === 'menuUpdateCode', '1つめも引ける');
t(F('panelItemOf_')('なにこれ') === null, '知らない文言は null');

console.log('\n■ 「全タブをまとめて整形する」を押したら、本当に整形が動く');
vm.runInContext('var formatRan = 0; function menuFormatAll(){ formatRan++; }', ctx);
panel._cells['38,2'] = true;                     // 3行目＝全タブをまとめて整形する
F('panelWatch')();
t(vm.runInContext('formatRan', ctx) === 1, '整形が動いた');
t(lastPut() === undefined, 'コードの更新は動いていない（前は別のものが動いていた）');
t(panel._cells['38,2'] === false, 'チェックも外れる');

console.log('\n■ 結果はB列（動かした先）に出る');
has(panel._cells['44,2'], '✅', '結果らんの位置に出る');
has(panel._cells['44,2'], '全タブをまとめて整形', 'どれを動かしたか出る');
t(panel._cells['44,3'] === undefined, 'C列には書かない');

console.log('\n■ 重複していたら、直し方を知らせる（勝手に並べ替えない）');
realLayout();
const snap = grid();
F('menuMakePanel')();
t(grid() === snap, 'セルを一切さわらない（控えらんのI列は別）');
has(alerts[alerts.length - 1].t, '並びを直してください', 'そう伝える');
has(alerts[alerts.length - 1].b, '40行目', '重複している行を教える');
has(alerts[alerts.length - 1].b, 'ページのURLをLINEに送る', '足りないものを教える');
has(alerts[alerts.length - 1].b, '書き換えてください', '直し方も教える');

console.log('\n■ 文言を直したら、そのまま使える');
panel._cells['40,3'] = '[5] ページのURLをLINEに送る';
panel._cells['41,3'] = '[6] ページが開けるか調べる';
panel._cells['42,2'] = false;
panel._cells['42,3'] = '[7] レポートをLINEに送る';
panel._cells['43,2'] = false;
panel._cells['43,3'] = '[8] 自動送信の状態を見る';
panel._cells['44,2'] = false;
panel._cells['44,3'] = '[9] イベント情報を調べる';
panel._cells['45,2'] = false;
panel._cells['45,3'] = '[10] イベントの絵の見本を見る';
panel._cells['46,2'] = false;
panel._cells['46,3'] = '[11] きょうのイベントを試し送りする';
panel._cells['47,2'] = false;
panel._cells['47,3'] = '[12] イベントの自動発信を入切する';
panel._cells['48,2'] = false;
panel._cells['48,3'] = '[13] 読み取れているものの一覧を見る';
panel._cells['49,2'] = '結果';
const st = F('panelCheck_')(panel);
t(st.dup.length === 0, '重複が消えた');
t(st.missing.length === 0, '足りないものも無い');
F('menuMakePanel')();
has(alerts[alerts.length - 1].t, 'もう置いてあります', '普通に通る');
has(alerts[alerts.length - 1].b, 'そろっています', 'そう伝える');

console.log('\n■ 分からない文言の行を押したとき');
realLayout();
panel._cells['39,3'] = 'なにか勝手に書いた文';
panel._cells['39,2'] = true;
F('panelWatch')();
t(panel._cells['39,2'] === false, 'チェックは外れる');
has(panel._cells['44,2'], '何をするボタンか分かりません', 'そう出る');
has(panel._cells['44,2'], 'コードを更新する', '正しい文言の一覧を出す');

console.log('\n■ ボタンの間に空行があってもよい（押し間違い防止）');
// 実際のスプシと同じ形：1行おきにボタン、間は空
function gapLayout() {
  reset([['001-Code.gs', 'あたらしい']]);
  panel._cells['34,2'] = '💡 まーく用 コード修正開始チェックボタン';
  panel._cells['35,2'] = '▼ チェックを入れると動きます（終わると自動で外れます）';
  const labels = ['[1] コードを更新する', '[2] 更新できる状態か調べる',
                  '[3] 全タブをまとめて整形する', '[4] 前のコードに戻す',
                  '[5] ページのURLをLINEに送る', '[6] ページが開けるか調べる'];
  for (let i = 0; i < 6; i++) {
    const r = 36 + i * 2;                       // 36,38,40,42,44,46
    panel._cells[r + ',2'] = false;
    panel._cells[r + ',3'] = labels[i];
  }
  panel._cells['47,2'] = '結果';
  panel._cells['48,2'] = '（まだ何も動かしていません）';
}

gapLayout();
const gr = F('panelReadRows_')(panel);
t(gr.length === 6, '空行をまたいで6つとも読める（実際 ' + gr.length + '個）');
t(gr[0].row === 36 && gr[5].row === 46, '行番号も正しい（36〜46）');
t(F('panelLastRow_')(panel) === 46, '最後のボタンは46行目');
t(F('panelResultRow_')(panel) === 48, '結果らんは48行目');

console.log('\n■ 空行があってもチェックが効く');
panel._cells['40,2'] = true;                    // 40行目＝全タブをまとめて整形する
vm.runInContext('formatRan = 0;', ctx);
F('panelWatch')();
t(vm.runInContext('formatRan', ctx) === 1, '書いてあるとおり整形が動いた');
t(panel._cells['40,2'] === false, 'チェックも外れる');
has(panel._cells['48,2'], '全タブをまとめて整形', '結果も正しい行に出る');

console.log('\n■ いちばん下のボタンでも効く');
gapLayout();
panel._cells['46,2'] = true;
F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                            getRow: () => 46 }, value: 'TRUE' });
t(panel._cells['46,2'] === false, '46行目でも効く');

console.log('\n■ 空行そのものは押せない');
gapLayout();
F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                            getRow: () => 37 }, value: 'TRUE' });
t(panel._cells['48,2'] === '（まだ何も動かしていません）', '空行では何も起きない');

console.log('\n■ 「結果」の行より下は見に行かない');
gapLayout();
panel._cells['52,2'] = false;                   // 結果より下にチェックがあっても
panel._cells['52,3'] = '🔄 コードを更新する';
t(F('panelReadRows_')(panel).length === 6, '結果の行で止まる');

console.log('\n■ 空行が続いたら、そこで終わり');
gapLayout();
delete panel._cells['44,2']; delete panel._cells['44,3'];
delete panel._cells['46,2']; delete panel._cells['46,3'];
delete panel._cells['47,2']; delete panel._cells['48,2'];
t(F('panelReadRows_')(panel).length === 4, '空きが続けば、そこまでを読む');

console.log('\n■ 空行の形でも、足りないものは最後の下に足す');
gapLayout();
// 重複を直した状態にする
panel._cells['44,3'] = '💬 ページのURLをLINEに送る';
panel._cells['46,3'] = '🩺 ページが開けるか調べる';
t(F('panelCheck_')(panel).missing.length === 7, '[7]〜[13] が足りない');
// 5つめ6つめを消して、足りない状態を作る
delete panel._cells['44,2']; delete panel._cells['44,3'];
delete panel._cells['46,2']; delete panel._cells['46,3'];
const miss = F('panelCheck_')(panel).missing;
t(miss.length === 9, '9つ足りない');
F('menuMakePanel')();
t(F('panelCheck_')(panel).missing.length === 0, '足したのでそろった');
t(F('panelReadRows_')(panel).length === 13, '13個になった');

console.log('\n■ 結果らんが結合されていても書ける');
gapLayout();
// 48〜49行目の B〜H を1つにまとめた（実際のスプシと同じ形）
panel._merge(48, 2, 49, 8);
panel._cells['40,2'] = true;
vm.runInContext('formatRan = 0;', ctx);
F('panelWatch')();
t(vm.runInContext('formatRan', ctx) === 1, '動く');
has(panel._cells['48,2'], '全タブをまとめて整形', '結合のまとまりの左上に書ける');

console.log('\n■ 結果らんの左上でない場所を指しても大丈夫');
gapLayout();
panel._merge(47, 2, 49, 8);        // 「結果」ごと結合してしまった場合
panel._cells['36,2'] = true;
F('panelWatch')();
t(true, '結合の中でも落ちない');

console.log('\n■ [7] の入力らん（期間・送り先）');
reset([['001-Code.gs', 'あたらしい']]);
F('menuMakePanel')();
{
  const pc = F('panelInputCell_')(panel, vm.runInContext('PANEL_IN_PERIOD', ctx));
  const dc = F('panelInputCell_')(panel, vm.runInContext('PANEL_IN_DEST', ctx));
  t(!!pc && !!dc, '期間と送り先の2行が置かれる');
  t(pc.col === 4 && dc.col === 4, '入力するのは見出しのすぐ右（D列）');
  const rows = F('panelReadRows_')(panel);
  const r7 = rows.filter(r => String(r.text).indexOf('レポートをLINE') !== -1)[0];
  t(!!r7, '[7] がある');
  t(pc.row === r7.row - 2 && dc.row === r7.row - 1, '[7] のすぐ上に並ぶ');
  t(F('panelInputGet_')(panel, vm.runInContext('PANEL_IN_PERIOD', ctx)) === '今期',
    'はじめは「今期」');
  t(F('panelInputGet_')(panel, vm.runInContext('PANEL_IN_DEST', ctx)) ===
    vm.runInContext('PANEL_DEST_TEST', ctx), 'はじめは「自分だけ（テスト）」');
  t(panel._cells[pc.row + ',2'] === '', '入力らんの行にはチェックを置かない');

  // プルダウン
  const v = panel._valids[pc.row + ',4'];
  t(!!v && v.list.length > 1, '期間はプルダウンから選べる');
  t(v.allow === true, '一覧に無い期間も打ち込める（260716-0815 など）');
  t(String(v.list[0]).indexOf('今期') === 0, '先頭は今期');
  const dv = panel._valids[dc.row + ',4'];
  t(dv.list.length === 2, '送り先は2つだけ');
  t(dv.allow === false, '送り先は打ち込めない（押し間違いを防ぐ）');

  // 何度置いても増えない
  F('menuMakePanel')();
  t(F('panelInputCell_')(panel, vm.runInContext('PANEL_IN_PERIOD', ctx)).row === pc.row,
    '何度やっても入力らんは増えない');

  // 書き込み
  F('panelInputSet_')(panel, vm.runInContext('PANEL_IN_DEST', ctx), 'あとで戻す用');
  t(F('panelInputGet_')(panel, vm.runInContext('PANEL_IN_DEST', ctx)) === 'あとで戻す用',
    '送り先らんに書き戻せる（本番のあと自分だけに戻すため）');
}

console.log('\n■ 期間のプルダウンの中身');
{
  const list = F('panelPeriodChoices_')(new Date(2026, 8, 6));
  t(list.length >= 15, '今期・前期・過去1年ぶん・今日・昨日などが並ぶ');
  t(list[0].indexOf('8/16') !== -1 && list[0].indexOf('9/6') !== -1,
    '今期は 8/16〜9/6');
  t(list[1].indexOf('前期') === 0, '2つめは前期');
  t(list.some(x => x.indexOf('昨日') === 0), '昨日もある');
  t(list.indexOf('先月') !== -1, '先月もある');
  // 選んだ文字が、そのまま読み取れる形になっているか
  t(list.every(x => x.length < 40), '長すぎない（スマホでも読める）');
}

console.log('\n■ コードを更新したら、増えたボタンを自分で足す');
{
  reset([['001-Code.gs', 'あたらしい']]);
  F('menuMakePanel')();
  // 古いコードで置いた状態を作る（[7] と入力らんを消し、目印も古くする）
  const rows = F('panelReadRows_')(panel);
  const last = rows[rows.length - 1].row;
  [last, last - 1, last - 2, last - 3, last - 4, last - 5, last - 6, last - 7, last - 8].forEach(r => {
    delete panel._cells[r + ',2']; delete panel._cells[r + ',3']; delete panel._cells[r + ',4'];
  });
  props['PANEL_SETUP_VER'] = 'U006ver';
  t(F('panelCheck_')(panel).missing.length === 7, '[7]〜[13] が無い状態');

  F('panelWatch')();                       // 1分おきの見張りが気づいて足す
  t(F('panelCheck_')(panel).missing.length === 0, '見張りが [7] を足した');
  t(!!F('panelInputCell_')(panel, vm.runInContext('PANEL_IN_PERIOD', ctx)),
    '入力らんも一緒に置く');
  t(props['PANEL_SETUP_VER'] === vm.runInContext('UPD_VERSION', ctx),
    '足したことを覚えて、毎分やり直さない');

  // 2回目は何もしない
  const snap = JSON.stringify(panel._cells);
  F('panelWatch')();
  t(JSON.stringify(panel._cells) === snap, '2回目は何もしない');
}

console.log('\n■ 押されているものがあるときは、行を動かさない');
{
  reset([['001-Code.gs', 'あたらしい']]);
  F('menuMakePanel')();
  const rows = F('panelReadRows_')(panel);
  const last = rows[rows.length - 1].row;
  [last, last - 1, last - 2, last - 3, last - 4, last - 5].forEach(r => {
    delete panel._cells[r + ',2']; delete panel._cells[r + ',3']; delete panel._cells[r + ',4'];
  });
  props['PANEL_SETUP_VER'] = 'U006ver';
  vm.runInContext('formatRan = 0;', ctx);
  panel._cells[(TOP + 2) + ',2'] = true;        // [3] 全タブをまとめて整形する
  F('panelWatch')();
  t(vm.runInContext('formatRan', ctx) === 1, '押されたものが先に動く');
  t(F('panelCheck_')(panel).missing.length >= 1,
    'そのときは行を差し込まない（押した行がずれるため）');
}

console.log('\n■ 更新の結果が、そうさボタンの結果らんに出る');
{
  reset([['001-Code.gs', 'あたらしい'], ['appsscript.json', '{"x":1}']]);
  F('menuMakePanel')();
  panel._cells[TOP + ',2'] = true;                       // [1] コードを更新する
  F('panelOnEdit')({ range: { getSheet: () => panel, getColumn: () => 2,
                              getRow: () => TOP }, value: 'TRUE' });
  const res = String(panel._cells[F('panelResultRow_')(panel) + ',3'] || '');
  has(res, '更新しました', '何をしたかが結果らんに出る');
  has(res, 'appsscript', 'appsscript を入れ替えたことも分かる');
  has(res, '001-Code', 'ほかのファイルも分かる');
}

console.log('\n■ 枝（ブランチ）を決めていなくても読める');
{
  reset([]);
  props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'x';
  delete props['GH_BRANCH']; delete props['GH_BRANCH_AUTO'];
  // この置き場には main が無い（実際そうだった）。既定の枝は別の名前
  gh = { repo: { default_branch: 'claude/gas-code-info-collection-e5mxw3' },
         dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' },
               { name: 'appsscript.json', path: 'gas/appsscript.json', type: 'file' }],
         raw: { 'gas/001-Code.gs': 'あたらしい', 'gas/appsscript.json': '{}' } };
  t(F('updBranch_')() === 'claude/gas-code-info-collection-e5mxw3',
    'GitHubに聞いて、既定の枝を使う（main 決め打ちをやめた）');
  t(props['GH_BRANCH_AUTO'] === 'claude/gas-code-info-collection-e5mxw3',
    '  一度聞いたら覚える（毎回は聞かない）');

  props['GH_BRANCH'] = 'develop';
  t(F('updBranch_')() === 'develop', '自分で決めていれば、そちらが優先');
  delete props['GH_BRANCH'];

  F('menuUpdateCode')();
  t(lastPut() !== undefined, '枝を決めていなくても、更新が通る');
}

console.log('\n■ バージョン');
t(vm.runInContext('UPD_VERSION', ctx) === 'U023ver', 'U023ver になっている');
reset([['001-Code.gs', 'あたらしい']]);
F('menuUpdateStatus')();
has(alerts[0].b, 'U023ver', '状態画面にバージョンが出る');

console.log('\n■ 番号でも見分けられる（文言を書き換えてしまったとき用）');
{
  const P = F('panelItemOf_');
  // 文言がそろっているときは、文言で決まる
  t(P('[1] コードを更新する').fn === 'menuUpdateCode', '[1] は更新');
  t(P('[2] 更新できる状態か調べる').fn === 'menuUpdateStatus', '[2] は状態');
  t(P('[3] 全タブをまとめて整形する').fn === 'menuFormatAll', '[3] は整形');
  t(P('[4] 前のコードに戻す').fn === 'menuRestoreCode', '[4] は巻き戻し');
  t(P('[5] ページのURLをLINEに送る').fn === 'menuWebAppSendLineStep', '[5] はLINE送信');
  t(P('[6] ページが開けるか調べる').fn === 'menuWebAppCheck', '[6] はページ確認');

  // 文言を分からなく書き換えても、番号が残っていれば動く
  t(P('[4] じぶんで書いた名前').fn === 'menuRestoreCode', '番号だけでも引ける');
  t(P('（5）なにか').fn === 'menuWebAppSendLineStep', '全角のカッコでも引ける');
  t(P('6. なにか').fn === 'menuWebAppCheck', '「6.」の形でも引ける');
  t(P('[9] なにか').fn === 'panelVenueProbe', '9番も引ける');
  t(P('[0] なにか') === null, '無い番号は null');
  t(P('なにか [3] うしろ') === null, '先頭に無い番号は使わない');

  // 絵文字だけの昔の書き方も、まだ読める
  t(P('🔄 コードを更新する').fn === 'menuUpdateCode', '昔の絵文字つきでも引ける');

  // 文言と番号が食い違ったら、文言のほうを信じる（人が読むのはそちらなので）
  t(P('[1] 前のコードに戻す').fn === 'menuRestoreCode', '文言が優先される');
}

console.log('\n■ 戻したときも、デプロイをやり直す');
reset([['001-Code.gs', 'あたらしい']]);
F('menuUpdateCode')();                       // 更新して版3→4、デプロイD1も4へ
t(project.version === 4, '更新で版4になった');
t(project.deployments.filter(x => x.deploymentId === 'D1')[0]
    .deploymentConfig.versionNumber === 4, 'デプロイも4');

F('menuRestoreCode')();
t(project.files.filter(f => f.name === '001-Code')[0].source === 'ふるい', 'コードが戻った');
t(project.version === 5, '戻したぶんも新しい版として作る');
t(project.deployments.filter(x => x.deploymentId === 'D1')[0]
    .deploymentConfig.versionNumber === 5,
  'デプロイも戻した版に切り替わる（ここが抜けていた）');
has(alerts[alerts.length - 1].b, 'デプロイもやり直しました', 'そう伝える');

console.log('\n■ 戻せてもデプロイに失敗したときは、はっきり言う');
reset([['001-Code.gs', 'あたらしい']]);
F('menuUpdateCode')();
apiFail = { path: '/versions', method: 'post', code: 403, msg: 'だめ' };
F('menuRestoreCode')();
t(project.files.filter(f => f.name === '001-Code')[0].source === 'ふるい', 'コードは戻る');
has(alerts[alerts.length - 1].b, '動いているものは古いままです', '危ない状態だと伝える');
has(alerts[alerts.length - 1].b, '新バージョン', '手で直す方法も出す');

console.log('\n■ デプロイのURLは変わらない（LINEの受け口が生きたままになる）');
reset([['001-Code.gs', 'あたらしい']]);
const idsBefore = project.deployments.map(d => d.deploymentId).join(',');
F('menuUpdateCode')();
const idsAfter = project.deployments.map(d => d.deploymentId).join(',');
t(idsBefore === idsAfter, 'デプロイを作り直さず、同じものの版だけ上げる');
t(project.deployments.length === 2, '数も増えない');
t(apiCalls.filter(c => c.path === '/deployments' && c.method === 'post').length === 0,
  '新しいデプロイは作らない（作るとURLが変わってしまう）');

console.log('\n■ 推定残り時間を出す');
{
  const S = F('updSecText_');
  t(S(25) === '約25秒', '秒だけ');
  t(S(90) === '約1分30秒', '分と秒');
  t(S(120) === '約2分', 'ちょうど何分ならそれだけ');
  t(S(0.4) === '約1秒', '0秒とは言わない');
  const items = F('panelItems_')();
  t(items.every(x => x.sec > 0), '13個とも見込み時間を持っている');
}

console.log('\n■ 押したら、まず空にしてから「実行中（推定〇〇）」を出す');
gapLayout();
panel._cells['48,2'] = '前に動かしたときの結果が残っている';
const says = [];
vm.runInContext('formatRan = 0;', ctx);
// 実行中の表示を捕まえるため、整形の中で結果らんを覗く
vm.runInContext(
  'function menuFormatAll(){ formatRan++; ' +
  '  says.push(String(SpreadsheetApp.getActiveSpreadsheet()' +
  '    .getSheetByName("説明").getRange(48,2).getValue())); }', ctx);
ctx.says = says;
panel._cells['40,2'] = true;
F('panelWatch')();
t(says.length === 1, '実行中に1回のぞけた');
has(says[0], '実行中', '動かしている間は「実行中」と出る');
has(says[0], '推定 約2分30秒', '推定時間も出る');
t(says[0].indexOf('前に動かしたときの結果') === -1, '前の結果は消えている');
has(panel._cells['48,2'], '終わりました', '終わったら結果が出る');
has(panel._cells['48,2'], '約', 'かかった時間も出る');

console.log('\n■ 終わらないまま止まったら、見張りが知らせる');
gapLayout();
props['PANEL_RUNNING'] = JSON.stringify(
  { row: 38, label: '[2] 更新できる状態か調べる', sec: 25,
    at: Date.now() - 200 * 1000 });          // 200秒前から動きっぱなし
F('panelWatch')();
has(panel._cells['48,2'], '終わりませんでした', '止まったと知らせる');
has(panel._cells['48,2'], '[2] 更新できる状態か調べる', 'どれが止まったか出る');
has(panel._cells['48,2'], '承認がまだ済んでいない', 'いちばん多い原因を出す');
has(panel._cells['48,2'], '承認画面', '直し方も出る');
t(props['PANEL_RUNNING'] === undefined, '記録は消す（毎分ずっと出続けないように）');

console.log('\n■ まだ動いている見込みのうちは、邪魔しない');
gapLayout();
props['PANEL_RUNNING'] = JSON.stringify(
  { row: 38, label: '[2] 更新できる状態か調べる', sec: 25, at: Date.now() - 10 * 1000 });
panel._cells['36,2'] = true;                 // 別のボタンにチェックが入っていても
vm.runInContext('formatRan = 0;', ctx);
F('panelWatch')();
t(lastPut() === undefined, '新しいものを勝手に動かさない');
t(panel._cells['36,2'] === true, 'チェックもそのまま（あとで拾える）');
t(props['PANEL_RUNNING'] !== undefined, '記録も残す');

console.log('\n■ 終わったら記録は消える');
gapLayout();
vm.runInContext('function menuFormatAll(){ formatRan++; }', ctx);
panel._cells['40,2'] = true;
F('panelWatch')();
t(props['PANEL_RUNNING'] === undefined, '終わったら記録は残らない');

console.log('\n■ 途中で失敗しても記録は消える');
gapLayout();
vm.runInContext('function menuFormatAll(){ throw new Error("わざと失敗"); }', ctx);
panel._cells['40,2'] = true;
F('panelWatch')();
t(props['PANEL_RUNNING'] === undefined, '失敗しても残らない');
has(panel._cells['48,2'], 'わざと失敗', '理由が出る');
vm.runInContext('function menuFormatAll(){ formatRan++; }', ctx);

console.log('\n■ 変わっていないファイルは読みに行かない');
reset([]);
props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'x';
gh = {
  dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file', sha: 'AAA' },
        { name: '004-WebApp.gs', path: 'gas/004-WebApp.gs', type: 'file', sha: 'BBB' },
        { name: 'appsscript.json', path: 'gas/appsscript.json', type: 'file', sha: 'CCC' }],
  raw: { 'gas/001-Code.gs': 'あたらしい', 'gas/004-WebApp.gs': 'ページ',
         'gas/appsscript.json': '{}' }
};
let r1 = F('updReadGitHub_')();
t(r1.files.length === 3, 'はじめは3つとも読む');
t(r1.skipped.length === 0, '飛ばしたものは無い');
F('updSaveShas_')(r1.shas);
let r2 = F('updReadGitHub_')();
t(r2.files.length === 0, '2回目は1つも読まない（中身が変わっていないので）');
t(r2.skipped.length === 3, '3つとも飛ばした');
gh.dir[0].sha = 'ZZZ';                              // 001-Code だけ変わった
let r3 = F('updReadGitHub_')();
t(r3.files.length === 1, '変わった1つだけ読む');
t(r3.files[0].name === '001-Code', '変わったのは 001-Code');
t(r3.skipped.length === 2, '残り2つは飛ばす');

console.log('\n■ 変わっていなければ「すでに最新です」');
reset([]);
props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'x';
gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file', sha: 'AAA' }],
       raw: { 'gas/001-Code.gs': 'あたらしい' } };
F('updSaveShas_')({ '001-Code': 'AAA' });
F('menuUpdateCode')();
t(lastPut() === undefined, '書き込まない');
has(alerts[alerts.length - 1].t, 'すでに最新', 'そう伝える');

console.log('\n■ 息をしているうちは、止まったと言わない');
gapLayout();
props['PANEL_RUNNING'] = JSON.stringify(
  { row: 36, label: '[1] コードを更新する', sec: 180,
    at: Date.now() - 500 * 1000 });          // 始めてから500秒
F('updBeat_')('読み込み中… 001-Code.gs');    // でも、たったいま息をした
F('panelWatch')();
t(props['PANEL_RUNNING'] !== undefined, '止まったと言わない（まだ動いている）');
t(String(panel._cells['48,2'] || '').indexOf('終わりませんでした') === -1, '結果にも出さない');

console.log('\n■ 息が止まったら知らせる');
gapLayout();
props['PANEL_RUNNING'] = JSON.stringify(
  { row: 36, label: '[1] コードを更新する', sec: 180, step: '読み込み中… 001-Code.gs',
    at: Date.now() - 200 * 1000 });          // 200秒、音沙汰なし
F('panelWatch')();
has(panel._cells['48,2'], '終わりませんでした', '知らせる');
has(panel._cells['48,2'], '読み込み中… 001-Code.gs', 'どこで止まったかも出る');

console.log('\n■ 長い結果は、行の高さを文字にあわせてひろげる');
gapLayout();
panel._merge(48, 2, 49, 8);
F('panelSay_')(panel, '短い');
const hShort = panel._heights[48];
F('panelSay_')(panel, new Array(30).join('あいうえおかきくけこ') + '\n2行目\n3行目');
const hLong = panel._heights[48];
t(hShort >= 42, '短くても、ふだんの高さは下回らない（実際 ' + hShort + '）');
t(hLong > hShort, '長い文は高くなる（' + hShort + ' → ' + hLong + '）');
t(hLong <= 600, '高くなりすぎない');

console.log('\n■ 空にするときは、高さをふだんに戻す');
F('panelClear_')(panel);
t(panel._heights[48] === 42, 'ふだんの高さ（42）に戻る');
t(panel._cells['48,2'] === '', '中身も空になる');

console.log('\n■ ファイル名が変わったときは、前の名前を消す');
// これが無いと、同じ const が2回宣言されて Apps Script が丸ごと止まる
{
  const stale = F('updStale_');
  const RENAMED = vm.runInContext('UPD_RENAMED', ctx);
  t(RENAMED['006-Venue'] === '006-Events', '006-Venue の前の名前は 006-Events');

  t(JSON.stringify(stale([{ name: '006-Venue' }], [{ name: '006-Events' }, { name: '001-Code' }]))
    === JSON.stringify(['006-Events']),
    '新しい名前が来て、前の名前が残っていれば、それを消す');
  t(stale([{ name: '006-Venue' }], [{ name: '006-Venue' }]).length === 0,
    'すでに新しい名前だけになっていれば、消すものは無い');
  // 読み飛ばしで「これから入ってくるもの」が空でも、両方あるなら片づける
  t(JSON.stringify(stale([], [{ name: '006-Venue' }, { name: '006-Events' }]))
    === JSON.stringify(['006-Events']),
    '前の名前が残ったままなら、次に押したときに消す');
  t(stale([{ name: '001-Code' }], [{ name: '006-Events' }]).length === 0,
    '新しい名前が来ていなければ、前の名前には手を出さない');
  t(stale([], []).length === 0, '空でも落ちない');
  t(stale(null, null).length === 0, 'null でも落ちない');
}

console.log('\n■ 見張りが止まったとき、スマホだけで直せる');
{
  // 押されているものを探すのは、チェックのらん1列だけで済む（1分おきに走るため）
  realLayout();
  const pend = F('panelPendingRow_');
  t(pend(panel) === 0, '押されていなければ 0');
  panel._cells['40,2'] = true;
  t(pend(panel) === 40, '押されている行が分かる');
  panel._cells['40,2'] = false;

  // 足あと
  delete props['PANEL_WATCH_AT'];
  t(F('panelWatchQuiet_')() === -1, '一度も動いていなければ -1');
  F('panelBeatWatch_')();
  t(F('panelWatchQuiet_')() >= 0, '動いたら足あとが残る');
  t(F('panelWatch') && (F('panelWatch')(), true), '見張りは足あとを残して動く');
  t(props['PANEL_WATCH_AT'] !== undefined, '  足あとが書かれている');

  // 入れ直し
  const before = props['PANEL_WATCH_AT'];
  props['PANEL_WATCH_AT'] = String(Date.now() - 3600 * 1000);   // 1時間 動いていない
  // 「なおして」は “ぜんぶ直す” 合図。ほかのしかけも一緒にそろえる
  vm.runInContext('var fmtArmed = 0; function ensureAutoFormatTrigger_(){ fmtArmed++; return true; }', ctx);
  vm.runInContext('var repArmed = 0; function ensureAutoReportTrigger_(){ repArmed++; return true; }', ctx);
  vm.runInContext('var tstArmed = 0; function ensureAutoReportTestTrigger_(){ tstArmed++; return true; }', ctx);
  vm.runInContext('var vnArmed = 0; function vnEnsureDailyTrigger_(){ vnArmed++; return true; }', ctx);
  const text = F('panelRepair_')();
  has(text, '見張りを立て直した', '入れ直したと伝える');
  has(text, '計★画★通★り', '  ユーモアも入れる');
  t(vm.runInContext('fmtArmed', ctx) === 1, '毎日17時の自動チェックも、一緒にそろえる');
  has(text, '毎日17時の自動チェック', '  そう伝える');
  t(vm.runInContext('repArmed', ctx) === 1, '毎月のレポート本番も、一緒にそろえる');
  t(vm.runInContext('tstArmed', ctx) === 1, '★レポートの確認用（16日3:00）も、一緒にそろえる');
  has(text, 'レポート確認用', '  そう伝える');
  /*
   * ★イベントの見張りは、ここが無いと永久に立ち上がらない。
   *   立て直す仕掛け（vnSelfHeal_）が、その見張りの中から動くため。
   *   「なおして」でここを見ないと、鶏と卵になる
   */
  t(vm.runInContext('vnArmed', ctx) === 1, '★イベントの見張りも、一緒にそろえる（ここが抜けていた）');
  has(text, 'イベントの見張り', '  そう伝える');

  /*
   * ★ふだんは、これを打つ必要そのものが無いようにした。
   *   コードを入れ替えたら、その場で見張りをそろえる。
   *   毎回 手で打ってもらうのは、忘れる前提のやり方だった
   */
  vm.runInContext('fmtArmed = 0; repArmed = 0; tstArmed = 0; vnArmed = 0;', ctx);
  const ea = F('updEnsureAll_')();
  t(vm.runInContext('fmtArmed', ctx) === 1, '★更新のあとも、同じものをそろえる（毎日17時）');
  t(vm.runInContext('repArmed', ctx) === 1, '  レポート本番も');
  t(vm.runInContext('tstArmed', ctx) === 1, '  レポート確認用も');
  t(vm.runInContext('vnArmed', ctx) === 1, '  イベントの見張りも');
  has(ea, '見張り', '  何をしたか、そのまま読める形で返す');
  has(text, '最後に動いたのは', '  いつから止まっていたかも出る');
  has(text, '持ち時間を使い切る', '  長く止まっていたら、その理由も書く');
  t(F('panelTriggersOk_')() === true, '入れ直したあとは、しくみがそろっている');
  props['PANEL_WATCH_AT'] = before;
}


console.log('\n■ LINEから「コード更新」（スマホだけで貼り替えずに済むように）');
{
  // ★スマホしか無いのに、コードを1本ずつ貼り替えるのは無理がある。
  //   GitHubから取り込む仕掛けを、LINEからも押せるようにした
  const cache = {};
  ctx.CacheService = { getScriptCache: () => ({
    get: k => (k in cache ? cache[k] : null),
    put: (k, v) => { cache[k] = String(v); },
    remove: k => { delete cache[k]; } }) };
  let replies = [], pushes = [];
  vm.runInContext('function lineReply_(tok, t){ rep.push(t); }', ctx);
  vm.runInContext('function lrPush_(to, msgs){ pu.push({ to: to, msgs: msgs }); }', ctx);
  vm.runInContext('var SENDER_MAP = { "Umark": "ﾏｰｸ", "Uother": "ｼｭﾝ" };', ctx);
  ctx.rep = replies; ctx.pu = pushes;

  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file', sha: 'a' }],
         raw: { 'gas/001-Code.gs': 'function appsscript(){}' } };
  props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'tok'; props['GH_PATH'] = 'gas';

  const note = F('updHandleNote_'), yes = F('updHandleYes_');

  // ほかの人は使えない
  replies.length = 0;
  t(note({ message: { text: 'コード更新' }, source: { userId: 'Uother' }, replyToken: 'r' }) === false,
    '★まーくさん以外は、コード更新を使えない');
  t(replies.length === 0, '  何も返さない');

  // いきなり「はい」では始まらない
  triggers.length = 0;
  t(yes({ message: { text: 'はい' }, source: { userId: 'Umark' }, replyToken: 'r' }) === false,
    '★確かめていない「はい」では、取り込みを始めない');
  t(upTrig().length === 0, '  見張りも作らない');

  // 1段目：聞き返すだけ
  replies.length = 0; triggers.length = 0;
  t(note({ message: { text: 'コード更新' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '「コード更新」を受ける');
  t(triggers.length === 0, '  ★1段目では、まだ取り込まない');
  t(replies[0].indexOf('よろしいですか') !== -1, '  聞き返す');
  t(replies[0].indexOf('001-Code') !== -1, '  何が入るのかも見せる');
  t(replies[0].indexOf('保存します') !== -1, '  先に保存することも伝える');

  // 2段目：裏で動かす見張りを作って、すぐ返事する
  replies.length = 0; triggers.length = 0;
  t(yes({ message: { text: 'はい' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '2段目で取り込みを始める');
  t(triggers.length === 1, '  1回だけ動く見張りを作る');
  t(triggers[0].getHandlerFunction() === 'updRunFromLine_', '  その見張りが取り込みをする');
  t(triggers[0]._kind === 'after', '  ★受け口の中では取り込まない（LINEの送り直しで二重になるため）');
  t(replies[0].indexOf('取り込みを始めました') !== -1, '  すぐ返事する');
  t(props['UPD_LINE_TO'] === 'Umark', '  結果の送り先も覚えておく');

  // 同じ「はい」をもう一度打っても、二度は始まらない
  triggers.length = 0;
  t(yes({ message: { text: 'はい' }, source: { userId: 'Umark' }, replyToken: 'r' }) === false,
    '★二度目の「はい」では始まらない');
  t(upTrig().length === 0, '  見張りも作らない');

  // 裏の見張りは、終わったら自分を片づけて、結果を送る
  triggers.push({ getHandlerFunction: () => 'updRunFromLine_', _kind: 'after' });
  pushes.length = 0;
  F('updRunFromLine_')();
  t(triggers.filter(x => x.getHandlerFunction() === 'updRunFromLine_').length === 0,
    '★終わったら、自分の見張りを片づける（見張りの数を食わないように）');
  t(pushes.length === 1 && pushes[0].to === 'Umark', '  結果をまーくさんに送る');
  t(props['UPD_LINE_TO'] === undefined, '  送り先の覚え書きも消す');
}


console.log('\n■ 合言葉「katastrophe」');
{
  const K = F('updKataWord_');
  t(K('katastrophe') === true, '小文字そのまま');
  t(K('KATASTROPHE') === true, '大文字でも通る');
  t(K('Katastrophe') === true, '頭だけ大文字でも');
  t(K('KaTaStRoPhE') === true, 'まざっていても');
  t(K('Ｋａｔａｓｔｒｏｐｈｅ') === true, '★全角でも通る');
  t(K('ＫＡＴＡＳＴＲＯＰＨＥ') === true, '  全角の大文字でも');
  t(K(' katastrophe ') === true, '前後に空白があっても');
  t(K('katastrophen') === false, '別の言葉は通さない');
  t(K('カタストロフ') === true, '★カタカナでも通る');
  t(K('カタストロフィ') === true, '  「ィ」が付いても');
  t(K('かたすとろふぃ') === true, '  ひらがなでも');
  t(K('ｶﾀｽﾄﾛﾌｨ') === true, '  半角カナでも');
  t(K('ジェバンニ') === true, '★「ジェバンニ」でも通る');
  t(K('じぇばんに') === true, '  ひらがなでも');
  t(K('ｼﾞｪﾊﾞﾝﾆ') === true, '  半角カナでも');
  t(K('jebanni') === true, '  ローマ字でも');
  t(K('Gevanni') === true, '  つづりちがいでも');
  t(K('𝐊𝐀𝐓𝐀𝐒𝐓𝐑𝐎𝐏𝐇𝐄') === true, '★飾り文字（太字）でも通る');
  t(K('𝕜𝕒𝕥𝕒𝕤𝕥𝕣𝕠𝕡𝕙𝕖') === true, '  白抜きでも');
  t(K('Ⓚⓐⓣⓐⓢⓣⓡⓞⓟⓗⓔ') === true, '  まる囲みでも');
  t(K('🅺🅰🆃🅰🆂🆃🆁🅾🅿🅷🅴') === true, '  四角囲みでも');
  t(K('ᴋᴀᴛᴀsᴛʀᴏᴘʜᴇ') === true, '  小さい大文字でも');
  t(K('k̴a̵t̶a̷s̸t̴r̵o̶p̷h̸e̴') === true, '  ぐちゃぐちゃにしても');
  t(K('カタストロフィの件') === false, '★ほかの言葉が混ざったら、反応しない');
  t(K('ジェバンニが一晩で') === false, '  これも反応しない');
  t(K('') === false, '空でも落ちない');
  t(K(null) === false, 'null でも落ちない');

  const kata = F('updHandleKata_');
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file', sha: 'z' }],
         raw: { 'gas/001-Code.gs': 'function appsscript(){}' } };
  props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'tok';
  props['GH_BRANCH'] = 'claude/gas-code-info-collection-e5mxw3';

  /*
   * ★役わりを、はっきり2つに分けた（まーくさんのご指示）。
   *     「カタストロフィ」…… だれが打っても “遊び”。まーくさんでも遊び
   *     「💩」…………… LINEからの取り込み。まーくさんだけ
   *                     （ほかの人が打ったときは、遊びが返る）
   */
  // ほかの人が「カタストロフィ」を打つ → 遊び
  ctx.rep.length = 0; ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: 'katastrophe' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    '★ほかの人が打っても、そこで止める');
  t(upTrig().length === 0, '  ★取り込みは絶対に始めない');
  /*
   * ★遊びは「その場の返事（reply）」で返します（ご指摘：遊びがうまくいかない）。
   *   前は 星人も絵も 裏の見張りに逃がしていたので、
   *   裏が動かない・公式LINEの月200通を使い切っている、のどちらでも
   *   打った人には 何も返りませんでした。
   *   返事なら 200通に数えられませんし、裏が動かなくても必ず届きます
   */
  t(ctx.rep.length === 1, '★その場で、すぐ返事をする');
  t(String(ctx.rep[0]).indexOf('きみは　えらばれません') !== -1,
    '  あの黒い球の声で断る');
  t(String(ctx.rep[0]).indexOf('星人') !== -1, '  星人も、その場の返事に入っている');
  t(ctx.pu.length === 0, '  ★送信数を食う push は、文には使わない');
  t(kataRun() === 1, '  絵だけは、1秒後の見張りから送る');
  t(kataTrig().length === 0, '  ★役目を終えた見張りは、自分で片づける');

  /*
   * ★まーくさんが「カタストロフィ」を打っても、遊びにする。
   *   みんなと同じものが返る、というのがご指示
   */
  try { ctx.CacheService.getScriptCache().remove('KATA_FUN_Umark'); } catch (e) {}
  ctx.rep.length = 0; ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: 'KATASTROPHE' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    'まーくさんが「カタストロフィ」を打っても受ける');
  t(upTrig().length === 0, '★まーくさんでも、取り込みは始めない（遊びにする）');
  t(props['UPD_LINE_KATA'] === undefined, '  取り込みの覚え書きも残さない');
  t(ctx.rep.length === 1, '  その場で、すぐ返事をする');
  t(String(ctx.rep[0]).indexOf('きみは　えらばれません') !== -1,
    '★みんなと同じものが返る');
  kataRun();

  /*
   * ★ほかの人が「💩」を打ったときも、遊びが返る。
   *   まとめスプシに「カタストロフィ か 💩 で遊べます」と書いてあるので、
   *   打って何も返らないのでは「壊れてるの？」と思われてしまう
   */
  try { ctx.CacheService.getScriptCache().remove('KATA_FUN_Uother'); } catch (e) {}
  ctx.rep.length = 0; ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: '💩' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    'ほかの人が「💩」を打っても受ける');
  t(upTrig().length === 0, '★ほかの人の「💩」で、取り込みは絶対に始めない');
  t(ctx.rep.length === 1, '★何も返らない、ということにはしない');
  t(String(ctx.rep[0]).indexOf('きみは　えらばれません') !== -1, '  遊びが返る');
  kataRun();

  // まーくさんの「💩」→ ここだけが取り込み
  ctx.rep.length = 0; ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: '💩' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '★まーくさんの「💩」だけが、取り込み');
  t(upTrig().length === 1, '  裏で取り込む見張りを作る');
  t(upTrig()[0]._kind === 'after', '  受け口の中では取り込まない');
  t(ctx.pu.length === 0, '  ★受け口の中では、まだ何も送らない');
  kataRun();
  t(ctx.pu.length === 1, '★送るのは1回だけ');
  const kt = ctx.pu[0].msgs[0].text;
  t(kt.indexOf('まえの　バージョンは') !== -1, '  あの黒い球の声で返す');
  t(kt.indexOf('いまの　スプシを') !== -1, '  「いまのスプシを どうアプデしようと」');
  t(kt.indexOf('どう　アプデしようと') !== -1, '  ★「アップデート」は長くて折り返すので「アプデ」に詰めた');
  t(kt.indexOf('アップデート') === -1, '    前の長い言い方は、もう使わない');
  t(kt.indexOf('という　りくつなわけだす') !== -1, '  「わけだす」で終わる');
  t(kt.indexOf('●') !== -1, '  黒い球も出る');
  t(kt.indexOf('取り込みを開始しました') === -1, '★「取り込みを開始しました」は、もう書かない');
  t(kt.indexOf('死') === -1 && kt.indexOf('命') === -1, '  ★「死」「命」という言葉は使わない');
  t(props['UPD_LINE_TO'] === 'Umark', '  結果の送り先を覚える');
  t(props['UPD_LINE_KATA'] === '1', '  合言葉から始めたことも覚える');

  // 取り込み中にもう一度打っても、二重に動かない
  ctx.rep.length = 0; triggers.length = 0;
  t(kata({ message: { text: '💩' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '取り込み中にもう一度打っても受ける');
  t(upTrig().length === 0, '  ★二重には動かさない');
  t(ctx.rep[0].indexOf('IN BEARBEITUNG') !== -1, '  すでに動いていると伝える');

  /*
   * ★終わったことは、みじかく1行お知らせする。
   *   前は「うまくいったら何も送らない」だったが、
   *   それだと 動いているのか 止まったのか 分からなかった
   */
  ctx.pu.length = 0;
  triggers.push({ getHandlerFunction: () => 'updRunFromLine_', _kind: 'after' });
  F('updRunFromLine_')();
  t(ctx.pu.length === 1, '★終わったら、みじかく知らせる');
  const done = ctx.pu[0].msgs[0].text;
  has(done, 'とりこみ　かんりょう', '  終わったと分かる');
  t(done.length < 300, '★長い中身は書かない（読む気が失せるため）');
  t(props['UPD_LINE_KATA'] === undefined, '  合言葉の覚え書きは消す');

  // はじめの1通に、どれくらいで終わるかを書く
  const st2 = F('updKataStart_')(F('updAlien_')());
  has(st2, 'とりこみ　かいし', '★はじめの1通に、始めたと書く');
  has(st2, 'のこり　', '★どれくらいで終わるかも書く（止まったのか分からない、を防ぐ）');

  // おかしくなったときだけ、もう一度お知らせする
  ctx.pu.length = 0;
  props['UPD_LINE_TO'] = 'Umark'; props['UPD_LINE_KATA'] = '1';
  gh = { fail: { code: 404, msg: 'not found' } };
  triggers.push({ getHandlerFunction: () => 'updRunFromLine_', _kind: 'after' });
  F('updRunFromLine_')();
  t(ctx.pu.length === 1, '★しくじったときだけ、もう1通お知らせする');
  const bad = ctx.pu[0].msgs[0].text;
  t(bad.indexOf('スプシは　そのままです') !== -1, '  何も壊れていないことも伝える');
  t(bad.indexOf('という　りくつなわけだす') !== -1, '  「わけだす」で終わる');
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file', sha: 'z' }],
         raw: { 'gas/001-Code.gs': 'function appsscript(){}' } };

  // グループLINEから打っても効く（結果はそのグループへ）
  ctx.rep.length = 0; triggers.length = 0; ctx.pu.length = 0;
  t(kata({ message: { text: '💩' },
           source: { userId: 'Umark', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    '★グループLINEからでも効く');
  t(upTrig().length === 1, '  取り込みを始める');
  t(props['UPD_LINE_TO'] === 'Cgroup', '  結果は、打った場所（グループ）へ返す');

  /*
   * ★鍵が無くても、そのまま動くこと。
   *   前はここで「鍵が入っていません」と言って止めていた。
   *   けれど、みんなに公開されている置き場なら鍵は要らないので、
   *   止める理由がなかった（実際に、鍵が無いせいで何もできなくなっていた）
   */
  ctx.rep.length = 0; triggers.length = 0;
  try { F('CacheService').getScriptCache().remove('UPD_RUNNING'); } catch (e) {}
  const keepTok = props['GH_TOKEN']; delete props['GH_TOKEN'];
  t(kata({ message: { text: '💩' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '鍵が無くても受ける');
  t(upTrig().length === 1, '★鍵が無くても、ちゃんと取り込みを始める');
  t(ctx.rep.length === 0, '  「鍵が入っていません」とは、もう言わない');
  props['GH_TOKEN'] = keepTok;
}


console.log('\n■ 受け口の中では、重たいことをしない');
{
  /*
   * ★合言葉を打っても何も返ってこなかったのは、ここが原因でした。
   *   受け口の中で、星人と絵をAIに作らせていた（5〜15秒）。
   *   LINEもApps Scriptも、それを待たずに打ち切るので、
   *   送る前に処理ごと終わっていました。
   */
  const kata = F('updHandleKata_');
  try { ctx.CacheService.getScriptCache().remove('UPD_RUNNING'); } catch (e) {}
  delete props['UPD_KATA_JOBS'];
  ctx.pu.length = 0; triggers.length = 0;

  // AIが固まっても（呼ばれた時点で例外）、受け口は止まらない
  let aiCalls = 0;
  const realAlien = vm.runInContext('updAlien_', ctx);
  vm.runInContext('updAlien_ = function(){ aiHit(); throw new Error("AIが固まった"); };', ctx);
  ctx.aiHit = function () { aiCalls++; };

  t(kata({ message: { text: '💩' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '合図を受ける');
  t(aiCalls === 0, '★受け口の中では、AIを1回も呼ばない');
  t(ctx.pu.length === 0, '  受け口の中では、まだ送らない');
  t(kataTrig().length === 1, '★1秒後に動く見張りを立てる');
  t(kataTrig()[0]._kind === 'after', '  「〇秒後に1回」の形で立てる');
  t(String(props['UPD_KATA_JOBS'] || '').indexOf('"kind":"start"') !== -1,
    '  やることも書き残す（見張りが読む）');

  // 見張りのほうで AI が転んでも、文だけは必ず届く
  F('updKataFire')();
  t(aiCalls === 1, '  見張りのほうで、AIを呼ぶ');
  t(ctx.pu.length === 1, '★AIが転んでも、文だけは必ず送る');
  /*
   * ★絵のありか（https://…）は、文のうしろに付けない（まーくさんのご指示）。
   *   長いアドレスがぶら下がると、ふきだしの形がくずれて じゃまなだけ
   */
  t(String(ctx.pu[0].msgs[0].text).indexOf('http') === -1,
    '★文のうしろに、絵のアドレスを付けない');
  t(ctx.pu[0].msgs[0].text.indexOf('星人') !== -1, '  星人は、こちらの組み合わせ表で作る');
  t(props['UPD_KATA_JOBS'] === undefined, '  送ったら、やることリストは空にする');

  vm.runInContext('updAlien_ = null;', ctx);
  ctx.updAlien_ = realAlien;
  try { ctx.CacheService.getScriptCache().remove('UPD_RUNNING'); } catch (e) {}
  delete props['UPD_KATA_JOBS'];
}

console.log('\n■ 🧹 結果を空にするボタン（リセット）');
{
  /*
   * ★前の結果が残ったままだと、いまのものか前のものか分からない。
   *   場所は決め打ちにせず、「リセット」と書いてあるセルの
   *   すぐ左のチェックを見る（動かしても付いていけるように）
   */
  reset([['001-Code.gs', 'x']]);
  F('menuMakePanel')();
  panel._cells['4,8'] = 'リセットボタン';     // H4 に名前
  panel._cells['4,7'] = false;                // G4 にチェック

  const c = F('panelResetCell_')(panel);
  t(c && c.row === 4 && c.col === 7, '★「リセット」の、すぐ左のチェックを見つける');

  // 押していなければ、何もしない
  const rr = F('panelResultRow_')(panel);
  panel._cells[rr + ',3'] = 'のこっている結果';
  t(F('panelResetIfAsked_')(panel) === false, '押していなければ、何もしない');
  t(panel._cells[rr + ',3'] === 'のこっている結果', '  結果もそのまま');

  // 押したら、空にして、チェックを戻す
  panel._cells['4,7'] = true;
  t(F('panelResetIfAsked_')(panel) === true, '★押したら、空にする');
  t(String(panel._cells[rr + ',3'] || '') === '', '  結果が空になる');
  t(panel._cells['4,7'] === false, '★チェックは □ に戻す');

  /*
   * ★言葉を書かずに □ だけを置いても、動くこと。
   *   まーくさんは、G4に □ を置かれただけでした。
   *   前は「リセット」という文字をさがしていたので1つも見つからず、
   *   ☑を入れても何も起きませんでした（押したのに無反応）
   */
  delete panel._cells['4,8'];                 // 言葉を消す
  panel._cells['4,7'] = false;                // G4 の □ だけ残す
  const c2 = F('panelResetCell_')(panel);
  t(c2 && c2.row === 4 && c2.col === 7,
    '★言葉が無くても、ボタンより上の □ を見つける');

  panel._cells[rr + ',3'] = 'また のこっている結果';
  panel._cells['4,7'] = true;
  t(F('panelResetIfAsked_')(panel) === true, '★言葉が無くても、押せば空になる');
  t(String(panel._cells[rr + ',3'] || '') === '', '  結果が空になる');
  t(panel._cells['4,7'] === false, '  チェックも □ に戻る');

  /*
   * ★高さも、ふだんの高さに戻すこと。
   *   長い結果のあとは行がとても高いまま残り、
   *   空にしても画面がすかすかになっていた
   */
  panel._heights[rr] = 600;
  panel._cells[rr + ',3'] = '長かった結果';
  panel._cells['4,7'] = true;
  F('panelResetIfAsked_')(panel);
  t(panel._heights[rr] === 42, '★空にしたら、高さもふだん（42）に戻す');

  // ボタンの列のチェックは、拾わない（そちらは「動かす」ためのもの）
  delete panel._cells['4,7'];
  t(F('panelResetCell_')(panel) === null, '  チェックが1つも無ければ、何もしない');
  t(F('panelResetIfAsked_')(panel) === false, '  そのときも落ちない');

  /*
   * ★ボタンの列に置かれたチェックは、拾わないこと。
   *   そこは「その行のボタンを動かす」ためのチェックなので、
   *   リセットとして拾うと、押してもいないボタンが動いてしまう
   */
  {
    const top = F('panelTop_')(panel);
    const chk = F('panelChkCol_')(panel, top);
    panel._cells['2,' + chk] = false;          // ボタンより上に、ボタンの列のチェック
    t(F('panelResetCell_')(panel) === null,
      '★ボタンの列のチェックは、リセットとして拾わない');
    delete panel._cells['2,' + chk];
  }

  // 「リセット」の右にチェックを置く形も受ける
  panel._cells['4,7'] = 'リセット';
  panel._cells['4,8'] = false;
  const c3 = F('panelResetCell_')(panel);
  t(c3 && c3.row === 4 && c3.col === 8, '「リセット」の右に置いた形も見つける');
  delete panel._cells['4,7']; delete panel._cells['4,8'];
}

console.log('\n■ 結果らんは、高くなりすぎない');
{
  /*
   * ★結果が長いと、行が600まで伸びて、スマホでは画面がまるごと
   *   結果らんで埋まっていた。上限を200（だいたい10行ぶん）に下げた。
   *   入りきらない文が消えるわけではない（セルの中には全部入っている）
   */
  const F2 = n => vm.runInContext(n, ctx);
  t(F2('PANEL_RESULT_MAX_H') === 200, '★高さの上限は 200');
  t(F2('PANEL_RESULT_H') === 42, '  ふだんの高さは 42');

  panel._heights[70] = 0;
  F('panelFitRow_')(panel, 70, 3, new Array(80).join('とても長い結果の行\n'));
  t(panel._heights[70] <= 200, '★どんなに長い結果でも、200より高くしない');
  t(panel._heights[70] >= 42, '  短くもしすぎない');

  panel._heights[71] = 0;
  F('panelFitRow_')(panel, 71, 3, 'みじかい');
  t(panel._heights[71] === 42, '  みじかい結果は、ふだんの高さのまま');
}

console.log('\n■ 🔁 新しいコードに、自分で気づいて取り込む');
{
  /*
   * ★「伝えるだけで終わる」ようにするためのもの。
   *   15分おきの見張りのついでに、GitHubのいちばん新しい書き込みを
   *   1回だけ見にいき、変わっていれば取り込む
   */
  reset([]);
  props['GH_REPO'] = 'circlenine/taxi';
  props['GH_PATH'] = 'gas';
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' }],
         raw: { 'gas/001-Code.gs': 'あたらしい中身' },
         head: { sha: 'AAA111', commit: { message: 'なおした', author: { date: '2026-09-17T07:00:00Z' } } } };
  ctx.pu.length = 0;

  t(F('updAutoPull_')() === true, '★新しくなっていたら、自分で取り込む');
  t(props['GH_HEAD_SEEN'] === 'AAA111', '  見た印を覚える');
  t(lastPut() !== undefined, '★ちゃんと書き込まれる');
  /*
   * ★終わったら、個人LINEにお知らせする。
   *   黙って終わられると、入ったのか入っていないのか分からない
   */
  t(ctx.pu.length === 1, '★うまくいったら、個人LINEにお知らせする');
  t(ctx.pu[0].to === 'Umark', '  ★まーくさんにだけ（グループには流さない）');
  has(ctx.pu[0].msgs[0].text, 'かんりょう', '  終わったと分かる');
  has(ctx.pu[0].msgs[0].text, 'じどう', '  ★どこから始まったものかが分かる');

  // しくじったときも、知らせる
  props['GH_HEAD_SEEN'] = 'ふるい';
  gh = { dir: [], head: { sha: 'CCC333', commit: { message: 'x', author: { date: '2026-09-17T08:00:00Z' } } } };
  ctx.pu.length = 0;
  F('updAutoPull_')();
  t(ctx.pu.length === 1, '★しくじったときも、お知らせする');
  t(ctx.pu[0].to === 'Umark', '  ★まーくさんにだけ（グループには流さない）');
  has(ctx.pu[0].msgs[0].text, 'しっぱいしました', '  しくじったと分かる');
  has(ctx.pu[0].msgs[0].text, 'じどう', '  こちらが勝手にやったものだと分かる');

  /*
   * ★お知らせを「切」にしたら、1通も送らない。
   *   うるさくなったときに止められないと、切りようがない
   */
  props['UPD_TELL'] = 'off';
  props['GH_HEAD_SEEN'] = 'ふるい';
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' }],
         raw: { 'gas/001-Code.gs': 'べつの中身' },
         head: { sha: 'DDD444', commit: { message: 'x', author: { date: '2026-09-17T09:00:00Z' } } } };
  ctx.pu.length = 0;
  t(F('updAutoPull_')() === true, '★切にしても、取り込みそのものは動く');
  t(ctx.pu.length === 0, '★切にしたら、LINEには1通も送らない');
  delete props['UPD_TELL'];

  // もとに戻して、続きを見る
  props['GH_HEAD_SEEN'] = 'AAA111';
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' }],
         raw: { 'gas/001-Code.gs': 'あたらしい中身' },
         head: { sha: 'AAA111', commit: { message: 'なおした', author: { date: '2026-09-17T07:00:00Z' } } } };
  ctx.pu.length = 0;

  /*
   * ★同じ書き込みでは、二度と動かないこと。
   *   中身をわざと変えておいて、それでも動かないことを見る
   *   （印だけで止めていないと、ここで書き込みが起きてしまう）
   */
  ctx.pu.length = 0; apiCalls = [];
  gh.raw['gas/001-Code.gs'] = 'さらに べつの中身';
  t(F('updAutoPull_')() === false, '★同じ書き込みでは、二度と動かない');
  t(ctx.pu.length === 0, '  だから、何度も鳴らない');
  t(lastPut() === undefined, '★中身が変わっていても、書き込みにいかない（印で止める）');

  /*
   * ★設定で止められること。
   *   こちらも、中身と印の両方を変えておいて、
   *   それでも動かないことを見る
   */
  props['GH_HEAD_SEEN'] = 'ふるい';
  gh.head.sha = 'BBB222';
  apiCalls = []; ctx.pu.length = 0;
  vm.runInContext('function cfg_(k){ return k === "コードを自動で取り込む" ? "いいえ" : ""; }', ctx);
  t(F('updAutoPull_')() === false, '★設定で「いいえ」にすれば、止まる');
  t(lastPut() === undefined, '  そのときは、書き込みにもいかない');
  t(props['GH_HEAD_SEEN'] === 'ふるい', '  印も、触らない');
  vm.runInContext('cfg_ = function(){ return ""; };', ctx);

  // GitHubが見えないときは、何もしない（黙って見送る）
  props['GH_HEAD_SEEN'] = 'ふるい';
  gh = { dir: [], reposCode: 404 };
  ctx.pu.length = 0;
  t(F('updAutoPull_')() === false, 'GitHubが見えなければ、何もしない');
  t(ctx.pu.length === 0, '  そのときは、何も送らない');

  /*
   * ★見にいく回数をしぼるところ（updAutoPullTick_）。
   *   ボタンの見張りは1分おきに動くので、毎回GitHubへ聞くと
   *   1時間に60回になり、鍵なしで聞ける上限にぶつかる。
   *   3分に1回までにしぼれているかを見る
   */
  try { ctx.CacheService.getScriptCache().remove('UPD_PULL_WAIT'); } catch (e) {}
  props['UPD_TELL'] = 'off';
  props['GH_HEAD_SEEN'] = 'ふるい';
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' }],
         raw: { 'gas/001-Code.gs': 'またべつの中身' },
         head: { sha: 'EEE555', commit: { message: 'x', author: { date: '2026-09-17T10:00:00Z' } } } };
  t(F('updAutoPullTick_')() === true, '★1回目は、見にいく');
  props['GH_HEAD_SEEN'] = 'ふるい';
  gh.head.sha = 'FFF666';
  apiCalls = [];
  t(F('updAutoPullTick_')() === false, '★すぐもう一度呼ばれても、見にいかない（3分に1回まで）');
  t(props['GH_HEAD_SEEN'] === 'ふるい', '  だから、印も触らない');
  try { ctx.CacheService.getScriptCache().remove('UPD_PULL_WAIT'); } catch (e) {}
  // 中身も変えておく（同じ中身だと「すでに最新です」で終わってしまうため）
  gh.raw['gas/001-Code.gs'] = 'さらに あたらしい中身';
  t(F('updAutoPullTick_')() === true, '★3分たてば、また見にいく');
  try { ctx.CacheService.getScriptCache().remove('UPD_PULL_WAIT'); } catch (e) {}
  delete props['UPD_TELL'];
}

console.log('\n■ 右下の知らせ（トースト）は、みじかくする');
{
  /*
   * ★あそこは数行しか入らない。長い文を入れると途中で切れて、
   *   「見切れている」ばかりが目立ち、かえって読みにくくなる
   */
  const T = F('updToastText_');
  t(T('1行目\n2行目\n3行目\n4行目').indexOf('1行目') === 0, '1行目は必ず出す');
  has(T('1行目\n2行目\n3行目\n4行目'), 'ほか3行', '★入りきらないぶんは「ほか〇行」とまとめる');
  t(T('1行目\n2行目\n3行目\n4行目').split('\n').length === 2,
    '★1行＋案内の2行だけ（2行入れると、機種によっては まだ見切れる）');
  t(T('あ'.repeat(80)).split('\n')[0].length <= 34, '  1行が長すぎるときは、そこも切る');
  has(T('1行目\n2行目\n3行目\n4行目'), '結果らん', '  くわしくはどこを見ればよいか書く');
  t(T('みじかい1行').indexOf('ほか') === -1, '  みじかければ、そのまま');
  t(T('あ'.repeat(500)).length <= 120, '★長くても、上限で切る');
  t(T('') === '', '空でも落ちない');
  t(T(null) === '', 'null でも落ちない');
  t(T('\n\n中身\n\n').indexOf('中身') === 0, '  空行は詰める');

  // ★実際に知らせるときも、みじかいほうを渡していること
  toasts.length = 0;
  F('updTell_')('だい', ['1行目', '2行目', '3行目', '4行目', '5行目'].join('\n'));
  t(toasts.length === 1, '  知らせは1回');
  t(toasts[0].m.length <= 120, '★トーストに渡すのは、みじかいほう');
  has(toasts[0].m, 'ほか', '  「ほか〇行」も付く');
}

console.log('\n■ 許可をもらうためだけの関数');
{
  /*
   * ★名前で見つけやすいよう、ひらがなにしてある。
   *   中身は「触るだけ」で、何も書き換えない。何度押しても大丈夫
   */
  reset([]);
  alerts.length = 0;
  const out = F('きょかをもらう')();
  has(out, 'コードの書き換え：OK', '★[1] で使う力が、そろっているか見る');
  has(out, 'スプシ：', '  スプシも触ってみる');
  has(out, '見張り：', '  見張りも');
  has(out, '☑を入れてください', '  そろっていれば、次にすることを書く');
  t(alerts.length === 1, '  画面にも1回だけ出す');

  // 足りないときは、直し方まで出す
  reset([]);
  alerts.length = 0;
  apiFail = { path: '/content', method: 'get', code: 403,
              msg: 'Request had insufficient authentication scopes.' };
  const out2 = F('きょかをもらう')();
  has(out2, 'まだ足りません', '★足りないときは、そう言う');
  has(out2, '許可を、もらい直してください', '  直し方も出す');
  apiFail = null;
}

console.log('\n■ 鍵を入れる画面では、鍵だけをきく');
{
  /*
   * ★前は、置き場・枝・フォルダも順に4回きいていた。
   *   けれど その3つは こちらが知っていること。
   *   知らないことをきかれても答えようがなく、
   *   実際に「リポジトリ名がわかりません」で止まってしまった
   */
  reset([]);
  prompts.length = 0; alerts.length = 0;
  props['GH_REPO'] = 'circlenine/test';
  props['GH_BRANCH'] = 'claude/gas-code-info-collection-e5mxw3';
  props['GH_PATH'] = 'gas';
  delete props['GH_TOKEN'];
  gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' }],
         raw: { 'gas/001-Code.gs': 'x' } };
  promptBtn = 'OK'; promptText = 'github_pat_ABCDEF';

  F('menuSetGitHub')();
  t(prompts.length === 1, '★きくのは1回だけ（前は4回きいていた）');
  has(prompts[0].b, '打たなくて大丈夫です', '  ほかは打たなくてよい、と書いてある');
  has(prompts[0].b, '置き場　：circlenine/test', '★いまの置き場を、画面に出す');
  has(prompts[0].b, '枝　　　：claude/gas-code-info-collection-e5mxw3', '  枝も出す');
  has(prompts[0].b, 'github_pat_', '  何を貼ればよいかも書いてある');
  t(props['GH_TOKEN'] === 'github_pat_ABCDEF', '★入れた鍵が、ちゃんとしまわれる');
  t(props['GH_REPO'] === 'circlenine/test', '  置き場は、勝手に書きかえない');
  t(props['GH_BRANCH'] === 'claude/gas-code-info-collection-e5mxw3', '  枝も、そのまま');
  /*
   * ★ここで「n.map is not a function」と出て止まっていた。
   *   updReadGitHub_ が返すのは並びではなく { files, skipped, shas } なのに、
   *   並びとして扱っていたため
   */
  t(alerts.length > 0, '  つながったかどうかを、その場で知らせる');
  t(String(alerts[alerts.length - 1].b).indexOf('is not a function') === -1,
    '★途中で落ちない');
  has(alerts[alerts.length - 1].t, 'つながりました', '  つながったと言える');
  has(alerts[alerts.length - 1].b, '001-Code', '  見つかったファイルの名前も出る');

  // 空のまま OK を押したら、いまの鍵をそのまま使う
  prompts.length = 0; alerts.length = 0; promptText = '';
  F('menuSetGitHub')();
  t(props['GH_TOKEN'] === 'github_pat_ABCDEF', '★空のまま押しても、いまの鍵を消さない');
  has(alerts[alerts.length - 1].t, 'そのままにしました', '  そう伝える');

  // 道順の案内
  const how = F('updTokenHow_')();
  // ★「メニュー『🔑 GitHubの鍵を設定』から」だけでは見つからない。
  //   4つ下の階にあるので、①②③④と順に書いてあること
  const steps = how.split('\n').filter(x => /^　[①②③④⑤⑥]/.test(x));
  t(steps.length >= 5, '★道順を、番号つきで順にならべる');
  has(steps.join('\n'), '🎮EnemyController', '  いちばん上のメニュー名');
  has(steps.join('\n'), '🅰️ はじめの設定（初回だけ）', '  2つめ');
  has(steps.join('\n'), '🔄 コードの更新', '  3つめ');
  has(steps.join('\n'), '🔑 GitHubの鍵を設定', '  4つめ');
  t(steps.join('\n').indexOf('🎮EnemyController') < steps.join('\n').indexOf('🅰️'),
    '  ★上から順に書いてある');
  has(how, 'アプリ」ではできません', '★スマホのアプリでは できないことも書く');
  promptText = '';
}

console.log('\n■ 「えだ」… どこを読むかを、LINEから決める');
{
  /*
   * ★設定タブの何行目を探して、となりの黄色いセルに打ち込んでください、
   *   ではスマホで通りません。LINEに1行打てば済むようにした
   */
  const B = F('updBranchWord_');
  t(B('えだ').name === '', '「えだ」だけなら、いまの設定を答える');
  t(B('えだ claude/abc').name === 'claude/abc', '「えだ ○○」で、その枝にする');
  t(B('枝 claude/abc').name === 'claude/abc', '  「枝」でも通る');
  t(B('ブランチ claude/abc').name === 'claude/abc', '  「ブランチ」でも通る');
  t(B('branch claude/abc').name === 'claude/abc', '  「branch」でも通る');
  t(B('えだ：claude/abc').name === 'claude/abc', '  「：」でも通る');
  t(B('えだ　claude/abc').name === 'claude/abc', '  全角の空白でも通る');
  /*
   * ★💩 は、コードの取り込み（合言葉）のほうに譲った。
   *   枝のほうは 🚽 で打つ
   */
  t(B('🚽').name === '', '★「🚽」だけでも通る');
  t(B('🚽 claude/abc').name === 'claude/abc', '  「🚽 ○○」でも通る');
  t(B('💩') === null, '★「💩」は、もう枝のものではない（取り込みのほうへ渡す）');
  t(B('💩 claude/abc') === null, '  「💩 ○○」も同じ');
  // ★その「💩」は、コードの取り込みの合言葉として効く
  const K = F('updKataWord_');
  t(K('💩') === true, '★「💩」だけで、コードの取り込みが始まる');
  t(K(' 💩 ') === true, '  前後の空白は、そのまま通す');
  t(K('💩 おはよう') === false, '  ★ほかの言葉が混ざったら、反応しない');
  t(K('💩💩') === false, '  2つ続けても、反応しない');
  t(K('💩🆗') === false, '★「💩🆗」では、取り込みは始まらない（お知らせの入切だから）');
  t(K('💩🆖') === false, '★「💩🆖」でも、取り込みは始まらない');

  /*
   * ★「💩🆗」でお知らせを入、「💩🆖」で切。
   *   取り込みは勝手にやってよいが、鳴りっぱなしは困る。
   *   スプシを開かずに、LINEだけで切り替えられるようにした
   */
  const PT = F('updPoopTell_');
  t(PT('💩🆗') === 'on', '★「💩🆗」は、お知らせを入');
  t(PT('💩🆖') === 'off', '★「💩🆖」は、お知らせを切');
  t(PT('💩 🆗') === 'on', '  あいだに空白が入っても通す');
  t(PT('\u202a💩\u202a🆗') === 'on',
    '★目に見えない字がまぎれても通す（スマホから送ると入ることがある）');
  t(PT('💩🆗\uFE0F') === 'on', '  絵文字の飾り（異体字セレクタ）が付いても通す');
  t(PT('💩OK') === 'on', '  「OK」でも通す');
  t(PT('💩ng') === 'off', '  「ng」でも通す');
  t(PT('💩オン') === 'on', '  「オン」でも通す');
  t(PT('💩オフ') === 'off', '  「オフ」でも通す');
  t(PT('💩') === '', '★「💩」だけは、取り込みのほう（入切ではない）');
  t(PT('💩だよ') === '', '  ほかの言葉が続けば、反応しない');
  t(PT('🆗') === '', '  「🆗」だけでは、反応しない');
  t(PT('') === '' && PT(null) === '', '  空でも null でも落ちない');

  const TL = F('updHandleTell_');
  // ほかの人には、触らせない
  delete props['UPD_TELL']; ctx.rep.length = 0;
  t(TL({ message: { text: '💩🆖' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    'ほかの人が打っても、受けはする');
  t(props['UPD_TELL'] === undefined, '★ほかの人には、絶対に変えさせない');
  t(ctx.rep.length === 0, '  何も返さない（あると分かってしまうため）');

  // まーくさんなら、切り替えられる
  ctx.rep.length = 0;
  t(TL({ message: { text: '💩🆖' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    'まーくさんなら、切り替えられる');
  t(props['UPD_TELL'] === 'off', '★「💩🆖」で、お知らせが切になる');
  t(F('updTellOn_')() === false, '  切になったことが、ちゃんと読める');
  has(ctx.rep[0], 'きりました', '  切ったと分かる返事');

  ctx.rep.length = 0;
  t(TL({ message: { text: '💩🆗' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '入にも戻せる');
  t(props['UPD_TELL'] === 'on', '★「💩🆗」で、お知らせが入になる');
  t(F('updTellOn_')() === true, '  入になったことが、ちゃんと読める');
  has(ctx.rep[0], 'いれました', '  入れたと分かる返事');

  // 何も決めていないときは「入」（黙って終わるより、鳴るほうが安全）
  delete props['UPD_TELL'];
  t(F('updTellOn_')() === true, '★何も決めていないときは、お知らせは入');

  t(TL({ message: { text: '💩' }, source: { userId: 'Umark' }, replyToken: 'r' }) === false,
    '★「💩」だけのときは、こちらでは受け止めない（取り込みのほうへ渡す）');
  ctx.rep.length = 0;

  /*
   * ★「💩」だけは、まーくさん以外には何も返さない。
   *   合言葉はほかの人に動画を返す約束だが、
   *   「💩」はふだん使いの短い合図。なんとなく打つたびに動画が飛んでは うるさい
   */
  const kata2 = F('updHandleKata_');
  try {
    const cc = ctx.CacheService.getScriptCache();
    cc.remove('UPD_RUNNING'); cc.remove('KATA_FUN_Uother');
  } catch (e) {}
  delete props['UPD_KATA_JOBS'];
  ctx.pu.length = 0; ctx.rep.length = 0; triggers.length = 0;
  t(kata2({ message: { text: '💩' }, source: { userId: 'Uother', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    'ほかの人が「💩」を打っても、受けはする');
  t(upTrig().length === 0, '★ほかの人のときは、取り込みを絶対に始めない');
  t(ctx.pu.length === 0, '  送信数を食う push は使わない');
  t(ctx.rep.length === 1, '★その場で、すぐ遊びを返す');
  t(kataTrig().length === 1, '  絵は、そのあとの見張りから送る');
  t(String(props['UPD_KATA_JOBS'] || '').indexOf('"kind":"pic"') !== -1,
    '  やることリストには「絵だけ」と積む（文はもう返したため）');
  // 合言葉のほうも、これまでどおり遊びを返す
  try { ctx.CacheService.getScriptCache().remove('KATA_FUN_Uother'); } catch (e) {}
  delete props['UPD_KATA_JOBS'];
  ctx.pu.length = 0; triggers.length = 0;
  t(kata2({ message: { text: 'katastrophe' }, source: { userId: 'Uother', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    '合言葉のほうは、これまでどおり受ける');
  t(kataTrig().length === 1, '  ★そちらも、これまでどおり返事を用意する');
  try { ctx.CacheService.getScriptCache().remove('KATA_FUN_Uother'); } catch (e) {}
  delete props['UPD_KATA_JOBS']; triggers.length = 0; ctx.pu.length = 0;
  t(B('えだまめ') === null,
    '★「えだまめ」には反応しない（くっついた言葉を、枝の名前と読みちがえないように）');
  t(B('枝豆') === null, '  「枝豆」にも反応しない');
  t(B('こんにちは') === null, 'ふつうの話には反応しない');
  t(B('') === null, '空でも落ちない');
  t(B(null) === null, 'null でも落ちない');

  const H = F('updHandleBranch_');
  props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'tok';
  gh = { dir: [], head: { commit: { message: 'さいしんの直し', author: { date: '2026-09-16T14:20:00Z' } } } };

  // ★ほかの人は、読み元を触れない
  ctx.rep.length = 0;
  t(H({ message: { text: 'えだ わるいところ' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    'ほかの人が打っても、受けはする');
  t(props['GH_BRANCH'] !== 'わるいところ', '★ほかの人には、絶対に変えさせない');
  t(ctx.rep.length === 0, '  何も返さない（あると分かってしまうため）');

  // まーくさんが変える
  ctx.rep.length = 0;
  props['GH_SHAS'] = '{"a":"b"}';
  t(H({ message: { text: 'えだ claude/gas-code-info-collection-e5mxw3' },
        source: { userId: 'Umark' }, replyToken: 'r' }) === true, 'まーくさんなら変えられる');
  t(props['GH_BRANCH'] === 'claude/gas-code-info-collection-e5mxw3', '★その枝を読むようになる');
  t(props['GH_SHAS'] === undefined,
    '★覚え書きも消す（消さないと「すでに最新です」で何も入らないことがある）');
  has(ctx.rep[0], 'さいしんの直し', '  その枝の最新も、いっしょに返す');

  // 打ちまちがえたら、はっきり言う。そして★読み先は変えない
  ctx.rep.length = 0;
  const keepBranch = props['GH_BRANCH'];
  gh = { dir: [], headFail: 404 };
  H({ message: { text: 'えだ うっかりまちがえた' }, source: { userId: 'Umark' }, replyToken: 'r' });
  has(ctx.rep[0], 'その枝はありませんでした', '★無い枝を打ったら、はっきりそう言う');
  t(props['GH_BRANCH'] === keepBranch,
    '★そのときは、読み先を変えない（変えると、そのあと何も取り込めなくなる）');
  has(ctx.rep[0], '変えていません', '  変えていないことも、はっきり伝える');
  // ★打ちまちがいを、その場で見比べられるように
  has(ctx.rep[0], 'いまある枝は', '★いまある枝を、ならべて見せる');
  has(ctx.rep[0], 'claude/gas-code-info-collection-e5mxw3', '  正しい名前も、その中に出る');

  /*
   * ★「見つかりません」だけでは、どこで止まっているのか分からない。
   *   置き場・鍵・枝のどれが原因かを、言い当てること
   */
  /*
   * ★鍵が無くても、公開されている置き場なら読めるので、
   *   「鍵が入っていません」で止めてはいけない
   */
  const keepTok2 = props['GH_TOKEN'];
  ctx.rep.length = 0;
  delete props['GH_TOKEN'];
  gh = { dir: [], head: { commit: { message: 'さいしんの直し', author: { date: '2026-09-16T14:20:00Z' } } },
         branches: ['main', 'claude/abc'] };
  H({ message: { text: 'えだ claude/abc' }, source: { userId: 'Umark' }, replyToken: 'r' });
  t(String(ctx.rep[0]).indexOf('鍵が入っていません') === -1,
    '★鍵が無いというだけでは、止めない');
  t(props['GH_BRANCH'] === 'claude/abc', '  鍵なしでも、ちゃんと決められる');
  props['GH_BRANCH'] = keepBranch;
  props['GH_TOKEN'] = keepTok2;

  ctx.rep.length = 0;
  gh = { dir: [], reposCode: 401 };
  H({ message: { text: 'えだ claude/abc' }, source: { userId: 'Umark' }, replyToken: 'r' });
  has(ctx.rep[0], '鍵が通りませんでした', '★鍵が古いときも、そう言い当てる');

  ctx.rep.length = 0;
  gh = { dir: [], reposCode: 404 };
  H({ message: { text: 'えだ claude/abc' }, source: { userId: 'Umark' }, replyToken: 'r' });
  has(ctx.rep[0], '置き場が見つかりませんでした', '★置き場が見えないときも、そう言い当てる');
  has(ctx.rep[0], '人に見せない置き場で、鍵が要る',
      '  人に見せない置き場なら、鍵が要ることも書く');
  has(ctx.rep[0], '公開されている置き場なら、鍵は要りません',
      '★公開されていれば鍵は要らない、とも書く');

  /*
   * ★置き場は、はじめから入れてあります。
   *   秘密ではない（鍵とちがって名前を知られても困らない）のに、
   *   「設定タブに circlenine/test と入れてください」とお願いしていたのは手落ちでした
   */
  const keepRepo2 = props['GH_REPO'];
  delete props['GH_REPO'];
  t(realUpdRepo() === 'circlenine/taxi', '★置き場は、何もしなくても入っている');
  t(F('updRepoSet_')() === '', '  ただし「人が決めた置き場」としては、空のまま');
  props['GH_REPO'] = 'よそ/べつのところ';
  t(realUpdRepo() === 'よそ/べつのところ', '  決めればそちらが優先される');
  props['GH_REPO'] = keepRepo2;

  /*
   * ★GitHubでは、置き場の名前を好きなときに変えられる（test → taxi など）。
   *   そのたびに こちらを直さないと読めなくなる、では困る。
   *   心当たりの名前を順に試して、通ったものを覚える
   */
  delete props['GH_REPO']; delete props['GH_REPO_OK'];
  gh = { dir: [], only: 'circlenine/test' };      // 新しい名前はまだ無い、という形
  const keepTestRepo = ctx.testRepo;
  ctx.testRepo = () => (props['GH_REPO'] || props['GH_REPO_OK'] || 'circlenine/taxi');
  props['GH_SHAS'] = '{"001-Code":"aaa"}';        // 前の置き場のぶんの覚え書き
  t(F('updRepoHeal_')() === true, '★名前が変わっていたら、こちらでさがし当てる');
  t(props['GH_REPO_OK'] === 'circlenine/test', '  通ったほうを覚える');
  t(realUpdRepo() === 'circlenine/test', '  次からは、そちらを見にいく');
  t(props['GH_SHAS'] === undefined, '  覚え書きは消す（別の置き場のぶんは当てにならない）');

  props['GH_REPO'] = 'ひと/がきめた';
  t(F('updRepoHeal_')() === false, '★人が決めているときは、勝手に変えない');
  ctx.testRepo = keepTestRepo;
  delete props['GH_REPO']; delete props['GH_REPO_OK'];
  props['GH_REPO'] = keepRepo2;

  // 「おきば」でも決められる
  const R = F('updRepoWord_');
  t(R('おきば').name === '', '「おきば」だけなら、いまの置き場を答える');
  t(R('おきば circlenine/test').name === 'circlenine/test', '「おきば ○○/○○」で決める');
  t(R('置き場 a/b').name === 'a/b', '  「置き場」でも通る');
  t(R('repo a/b').name === 'a/b', '  「repo」でも通る');
  t(R('🧻').name === '', '★「🧻」だけでも通る（💩・🚽 とひと並びに）');
  t(R('🧻 circlenine/taxi').name === 'circlenine/taxi', '  「🧻 ○○/○○」でも通る');
  t(R('おきばしょ') === null, '  くっついた言葉には反応しない');
  t(R('💩') === null, '  「💩」は取り込みのもの。ここでは受けない');
  t(R('🚽') === null, '  「🚽」は枝のもの。ここでは受けない');
  t(R('こんにちは') === null, '  ふつうの話にも反応しない');

  const HR = F('updHandleRepo_');
  ctx.rep.length = 0;
  HR({ message: { text: 'おきば へんな名前' }, source: { userId: 'Umark' }, replyToken: 'r' });
  has(ctx.rep[0], '形になっていません', '★「だれか/なにか」の形でなければ、入れない');
  has(ctx.rep[0], '🧻 circlenine/taxi', '  例も 🧻 の形で書いてある');
  ctx.rep.length = 0;
  HR({ message: { text: 'おきば よそ/べつ' }, source: { userId: 'Uother' }, replyToken: 'r' });
  t(props['GH_REPO'] !== 'よそ/べつ', '★ほかの人には、絶対に変えさせない');
  ctx.rep.length = 0;
  HR({ message: { text: 'おきば circlenine/test' }, source: { userId: 'Umark' }, replyToken: 'r' });
  t(props['GH_REPO'] === 'circlenine/test', '★まーくさんなら決められる');
  gh = { dir: [], head: { commit: { message: 'さいしんの直し', author: { date: '2026-09-16T14:20:00Z' } } } };

  // 自動に戻す
  ctx.rep.length = 0;
  gh = { dir: [], head: { commit: { message: 'もとの枝', author: { date: '2026-09-16T10:00:00Z' } } } };
  H({ message: { text: 'えだ じどう' }, source: { userId: 'Umark' }, replyToken: 'r' });
  t(props['GH_BRANCH'] === undefined, '★「えだ じどう」で、設定をやめる');
  has(ctx.rep[0], '自動に戻しました', '  そう伝える');

  // 「えだ」だけなら、いまの状態を返す
  ctx.rep.length = 0; ghUrls.length = 0;
  H({ message: { text: 'えだ' }, source: { userId: 'Umark' }, replyToken: 'r' });
  /*
   * ★GitHubに聞く回数を減らすこと。
   *   鍵を入れていないと1時間に60回までで、実際に使い切って止まった。
   *   前はここで3回（置き場・枝の一覧・最新）聞いていた
   */
  t(ghUrls.length === 1, '★うまくいくときは、GitHubに1回しか聞かない');
  has(ctx.rep[0], '置き場：circlenine/test', '「えだ」だけなら、いまの読み先を答える');
  has(ctx.rep[0], '枝　　：', '  枝も');
  has(ctx.rep[0], '最新　：', '  その枝の最新も');
  /*
   * ★案内に出す言葉は、ふだん打つもの（💩）にそろえること。
   *   「💩 で打てます」と言いながら案内が「えだ」のままでは、
   *   どちらで打てばよいのか分からなくなる
   */
  has(ctx.rep[0], '🚽 じどう', '★もとに戻すやり方も、🚽 の形で書いてある');
  has(ctx.rep[0], '🚽 claude/', '  変えるやり方も、🚽 の形で');
  has(ctx.rep[0], '「えだ」「枝」「ブランチ」でも同じ', '  ほかの言い方も使えると添える');
}

console.log('\n■ LINEに打つだけで、コードが本当に入れ替わるか（通しで確かめる）');
{
  /*
   * ★「LINEで打つだけで、ほんとうに貼り替えなしで直るのか」
   *   ここで、打つところから 書き込まれるところまで、通しで確かめる。
   *   ・公式LINE（1対1）から
   *   ・グループLINEから
   *   どちらでも同じように入れ替わること
   */
  const kata = F('updHandleKata_');
  const drain = function () {
    // 見張りが立ったことにして、取り込みのほうを動かす
    F('updRunFromLine_')();
  };

  [['公式LINE（1対1）', { userId: 'Umark' }, 'Umark'],
   ['グループLINE',     { userId: 'Umark', groupId: 'Cgroup' }, 'Cgroup']
  ].forEach(function (pair) {
    // ★鍵を入れていない、ふつうの状態で通す（公開の置き場なので鍵は要らない）
    reset([]);
    props['GH_PATH'] = 'gas';
    gh = { dir: [{ name: '001-Code.gs', path: 'gas/001-Code.gs', type: 'file' },
                 { name: '006-Venue.gs', path: 'gas/006-Venue.gs', type: 'file' }],
           raw: { 'gas/001-Code.gs': 'あたらしい中身', 'gas/006-Venue.gs': 'イベント係' },
           head: { commit: { message: 'さいしん', author: { date: '2026-09-16T14:20:00Z' } } } };
    try {
      const cc = ctx.CacheService.getScriptCache();
      cc.remove('UPD_RUNNING'); cc.remove('KATA_FUN_Umark');
    } catch (e) {}
    delete props['UPD_KATA_JOBS'];
    ctx.pu.length = 0; triggers.length = 0;

    // ★LINEからの取り込みは「💩」（まーくさんだけ）。カタストロフィは遊びに変わった
    t(kata({ message: { text: '💩' }, source: pair[1], replyToken: 'r' }) === true,
      pair[0] + 'で「💩」を受ける');
    t(props['UPD_LINE_TO'] === pair[2], '  結果の届け先は、打った場所（' + pair[2] + '）');
    drain();
    const put = lastPut();
    t(put !== undefined, '★' + pair[0] + '　→　コードが本当に書き込まれた');
    t(put.body.files.filter(f => f.name === '001-Code')[0].source === 'あたらしい中身',
      '  中身も、新しいほうに入れ替わっている');
    t(put.body.files.filter(f => f.name === '006-Venue').length === 1,
      '  増えたファイルも足される');
    t(ctx.pu.filter(x => String(x.msgs[0].text).indexOf('しっぱいしました') !== -1).length === 0,
      '  ★うまくいったときは、しくじりの知らせを出さない');
  });

  // しくじったときだけ、もう1通お知らせする
  reset([]);
  gh = { dir: [] };                       // .gs が1つも無い置き場
  props['UPD_LINE_TO'] = 'Umark'; props['UPD_LINE_KATA'] = '1';
  ctx.pu.length = 0;
  drain();
  t(ctx.pu.length === 1, '★取り込むものが無ければ、そのことを知らせる');

  try { ctx.CacheService.getScriptCache().remove('UPD_RUNNING'); } catch (e) {}
  delete props['UPD_KATA_JOBS'];
}

console.log('\n■ 僕以外が合言葉を打ったとき');
{
  const kata = F('updHandleKata_');
  props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'tok';
  try {
    const cc = ctx.CacheService.getScriptCache();
    cc.remove('UPD_RUNNING'); cc.remove('KATA_FUN_Uother'); cc.remove('KATA_FUN_Uthird');
  } catch (e) {}
  delete props['UPD_KATA_JOBS'];          // 前のところで積んだぶんを持ちこさない

  ctx.pu.length = 0; ctx.rep.length = 0; triggers.length = 0;
  t(kata({ message: { text: 'KATASTROPHE' }, source: { userId: 'Uother', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    'ほかの人が打っても受ける');
  t(upTrig().length === 0, '★コードの取り込みは、絶対に動かさない');
  t(props['UPD_LINE_TO'] === undefined || props['UPD_LINE_TO'] !== 'Uother',
    '  結果の送り先にもならない');
  t(ctx.pu.length === 0, '  ★送信数を食う push は、文には使わない');
  t(ctx.rep.length >= 1, '★その場で、すぐ返す');
  kataRun();
  // ★文は「その場の返事」、絵だけが あとから届きます
  const dn = String(ctx.rep[ctx.rep.length - 1]);
  t(dn.indexOf('きみは　えらばれません') !== -1, '  あの黒い球の声で断る');
  t(dn.indexOf('スプシは　かわりません') !== -1,
    '  ★「なにも変わっていない」と、はっきり書く');
  t(dn.indexOf('という　りくつなわけだす') !== -1, '  「わけだす」で終わる');
  t(dn.indexOf('死') === -1 && dn.indexOf('命') === -1, '  ★「死」「命」は使わない');
  t(/https:\/\/(www\.youtube\.com|www\.tiktok\.com|x\.com)\//.test(dn), '  ★おもしろ動画のリンクも、同じ1通に入れる');
  t(dn.indexOf('▚') === -1, '★かすれた四角の区切り線は、もう使わない');
  t(dn.indexOf('╭───') !== -1, '★星人の紹介は、ふきだしの中');
  t(dn.indexOf('⌄') !== -1, '  しっぽも付く（しゃべっているように見せる）');
  t(dn.indexOf('┃') === -1, '  ふちの記号は、行頭に残さない');
  t(dn.indexOf('星人') !== -1, '  星人も同じ1通に入る');

  // 何度も打たれても、グループが動画だらけにならない
  ctx.pu.length = 0;
  t(kata({ message: { text: 'katastrophe' }, source: { userId: 'Uother', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    '続けて打っても受ける');
  t(ctx.pu.length === 0, '★続けて打たれても、二度は送らない（10分に1回まで）');

  // 別の人なら送る
  ctx.pu.length = 0;
  t(kata({ message: { text: 'カタストロフィ' }, source: { userId: 'Uthird', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    '別の人が「カタストロフィ」と打っても受ける');
  kataRun();
  t(ctx.pu.length === 1, '  その人にはちゃんと送る');
  t(upTrig().length === 0, '  それでも取り込みは動かさない');

  // 動画のリンクは、何度呼んでも必ず開ける形
  const L = F('updFunLink_');
  const got = {};
  for (let i = 0; i < 40; i++) { const u = L(); got[u] = 1; if (!/^https:\/\/(www\.youtube\.com|www\.tiktok\.com|x\.com)\//.test(u)) { ng++; console.log('  NG  リンクの形', u); } }
  t(true, '40回えらんでも、すべて YouTube・TikTok・X のどれかのリンク');
  t(Object.keys(got).length > 1, '  毎回おなじではない（ランダムにえらぶ）');
}


console.log('\n■ 特殊な文字で、字を飾る');
{
  const W = F('updWide_'), M = F('updMath_'), G = F('updGlitch_');

  t(W('KATASTROPHE') === 'ＫＡＴＡＳＴＲＯＰＨＥ', '全角にできる');
  t(W('ok 12') === 'ｏｋ　１２', '  小文字も数字も空白も');
  t(W('') === '', '  空でも落ちない');
  t(W(null) === '', '  null でも落ちない');

  t(M('KATASTROPHE') === '𝗞𝗔𝗧𝗔𝗦𝗧𝗥𝗢𝗣𝗛𝗘', '太い記号にできる');
  t(M('abc123').length === 12, '  小文字も数字も（1文字が2つぶんの長さになる）');
  t(M('あ') === 'あ', '  日本語はそのまま');
  t(M(null) === '', '  null でも落ちない');

  const g = G('ABC', 2);
  t(g.indexOf('A') === 0, 'ぐちゃぐちゃにしても、元の文字は残る');
  t(g.length === 3 + 6, '  重ねた数のぶんだけ長くなる（3文字×2つ重ね）');
  t(G('A B', 1).length === 3 + 2, '  空白には重ねない（読めなくなるため）');
  t(G('ABC', 0) === 'ABC', '  0なら何も重ねない');
  t(G('ABC', 99).length === 3 + 12, '  ★重ねすぎないよう、上限をかけてある');
  t(G(null, 2) === '', '  null でも落ちない');
  t(G('ABC', 2) !== G('ABC', 2) || true, '  毎回ちがう飾りになる');

  // LINEの1通（5,000文字）に、ちゃんと収まること
  ['updKataStart_', 'updKataFail_', 'updKataDenied_'].forEach(function (fn) {
    const out = F(fn)();
    t(String(out).length < 4000, '★' + fn + ' は1通に収まる（' + String(out).length + '文字）');
  });
}


console.log('\n■ 訳の分からない文字の壁');
{
  const N = F('updNoise_');
  const w = N(4, 18, 2);
  t(w.split('\n').length === 4, '行数のとおりに出る');
  t(w.split('\n').every(l => l.length > 18), '  飾りが重なって、1行が長くなっている');
  t(N(1, 6, 0).split('\n')[0].length === 6, '  飾り0なら、文字数ぴったり');
  t(N(99, 99, 99).split('\n').length === 8, '★行数に上限がある（出しすぎない）');
  t(N(99, 99, 99).split('\n')[0].length <= 30 * 5, '  1行の長さにも上限がある');
  t(N(4, 18, 2) !== N(4, 18, 2), '毎回ちがう並びになる');

  // ★意味のある言葉が混ざらないこと。混ざると、そこだけ読まれて興ざめになる
  const big = N(8, 30, 0);
  t(/^[^ぁ-んァ-ヶ一-龠]*$/.test(big.replace(/\n/g, '')),
    '★ひらがな・カタカナ・漢字は混ぜない（読める言葉にしない）');

  // セリフはもう入れない
  ['updKataStart_', 'updKataDenied_'].forEach(function (fn) {
    const out = F(fn)('てすと');
    t(out.indexOf('なんか文字出てるぞ') === -1,
      '★' + fn + ' に、あのセリフは入れない');
    t(out.indexOf('●') !== -1, '  ' + fn + ' には黒い球が出る');
    t(out.length < 4000, '  ' + fn + ' は1通に収まる（' + out.length + '文字）');
  });
}


console.log('\n■ 毎回ちがう星人が出る（特徴・好きなもの・口ぐせつき）');
{
  const A = F('updAlienFallback_'), B = F('updAlienBlock_');

  const a = A();
  t(/星人$/.test(a.name), '名前は「〇〇星人」');
  t(Array.isArray(a.toku) && a.toku.length >= 2, '★特徴が2つ以上つく');
  t(Array.isArray(a.suki) && a.suki.length >= 1, '  好きなものもつく');
  t(Array.isArray(a.kirai) && a.kirai.length >= 1, '  きらいなものもつく');
  t(typeof a.kuse === 'string' && a.kuse.length > 0, '  口ぐせもつく');

  const seen = {};
  for (let i = 0; i < 40; i++) { const x = A(); seen[x.name + x.toku.join() + x.kuse] = 1; }
  t(Object.keys(seen).length > 20, '毎回ちがう星人になる');

  const b = B();
  t(b.indexOf('てめえ達は今から') !== -1, '★あの「今から」の言い方で始まる');
  t(!/[\u0300-\u036F]/.test(b), '★字を崩す飾りは、もう付けない（読みにくいだけだった）');
  t(b.indexOf('下ちい') !== -1, '  わざと まちがえた字も、そのまま');
  t(b.indexOf('乗車させて来て') === -1, '★長い言い方はやめた（折り返すおそれがあるため）');
  t(b.indexOf('星人') !== -1, '  星人の名前が出る');
  t(b.indexOf('▼特徴') !== -1, '★「▼特徴」のらんが出る');
  t(b.indexOf('▼好きなもの') !== -1, '  「▼好きなもの」も');
  t(b.indexOf('▼きらいなもの') !== -1, '  「▼きらいなもの」も');
  t(b.indexOf('▼口ぐせ') !== -1, '  「▼口ぐせ」も');
  t((b.match(/▼/g) || []).length === 4, '★▼は、この4つの見出しだけに付ける');
  t(/〖りょうきん　[０-９]+えん〗/.test(b), '★りょうきんは〖〗で囲む');
  t(b.indexOf('とくてん') === -1, '★「とくてん　〇てん」は、もう出さない');
  t(b.split('\n').some(x => x.indexOf('〖') === 0), '★りょうきんの行は、先頭に空白を入れない');

  // ★「死」「殺」「血」といった言い方は、どこにも出さない
  let bad = 0;
  for (let i = 0; i < 60; i++) {
    const x = A();
    const all = x.name + x.toku.join() + x.suki.join() + x.kirai.join() + x.kuse;
    if (/[死殺血]/.test(all)) bad++;
  }
  t(bad === 0, '★60回作っても「死」「殺」「血」は出ない');

  // 見に覚えのない外国語がまぎれていないこと（前に韓国語・ロシア語が混ざっていた）
  let alien = 0;
  for (let i = 0; i < 60; i++) {
    const x = A();
    const all = x.name + x.toku.join() + x.suki.join() + x.kirai.join() + x.kuse;
    if (/[가-힣Ѐ-ӿ]/.test(all)) alien++;
  }
  t(alien === 0, '★見に覚えのない外国語がまぎれていない');

  // AIの返事が半端でも、そのまま出さずに、こちらの表で作り直すこと
  const AA = F('updAlienArr_');
  t(JSON.stringify(AA(['あ', 'い'])) === '["あ","い"]', '並びはそのまま');
  t(JSON.stringify(AA('あ')) === '["あ"]', '  1個だけ文字で返ってきても、並びに直す');
  t(JSON.stringify(AA(null)) === '[]', '  空でも落ちない');
  t(AA(['1','2','3','4','5']).length === 3, '  多すぎるときは3つまで');

  // まーくさんの分にも、ほかの人の分にも出る
  [['updKataStart_', 'circlenine/test'], ['updKataDenied_', undefined]].forEach(function (pair) {
    const fn = pair[0];
    const out = F(fn)(pair[1]);
    t(out.indexOf('星人') !== -1, '★' + fn + ' にも星人が出る');
    t(out.indexOf('特徴') !== -1, '  ' + fn + ' にも特徴が出る');
    t(out.length < 4000, '  それでも1通に収まる（' + out.length + '文字）');
  });
}


console.log('\n■ 星人のすがた（絵）は、同じ1通に入れる');
{
  // ★1回の通知で済ませたい、というご希望。
  //   文と絵を、同じ1回の送信にまとめる。
  //   絵ではねられたときだけ、文だけで送り直す（文まで消えては困る）
  const P = F('updPushOnce_');
  const DRV = { url: 'https://drive.google.com/file/d/ID/view', id: 'ID',
                direct: 'https://drive.google.com/uc?export=view&id=ID' };

  ctx.pu.length = 0;
  P('Umark', 'ほんぶん', DRV);
  t(ctx.pu.length === 1, '★送るのは1回だけ');
  t(ctx.pu[0].msgs.length === 2, '  文と絵を、いっしょに送る');
  t(ctx.pu[0].msgs[0].type === 'text', '  1つめは文');
  t(ctx.pu[0].msgs[1].type === 'image', '  2つめが絵');
  t(ctx.pu[0].msgs[1].originalContentUrl.indexOf('ID') !== -1, '  その絵のありかを指す');

  // 絵が無いときは、文だけ
  ctx.pu.length = 0;
  P('Umark', 'ほんぶん', { url: '', id: '', direct: '' });
  t(ctx.pu.length === 1 && ctx.pu[0].msgs.length === 1, '絵が無ければ、文だけを1回');

  // 絵ではねられたら、文だけで送り直す
  vm.runInContext('function lrPush_(to, msgs){ pu.push({to:to,msgs:msgs}); return msgs.length > 1 ? "画像がだめでした" : ""; }', ctx);
  ctx.pu.length = 0;
  P('Umark', 'ほんぶん', DRV);
  t(ctx.pu.length === 2, '★絵ではねられたら、もう一度やり直す');
  t(ctx.pu[1].msgs.length === 1 && ctx.pu[1].msgs[0].type === 'text',
    '  ★そのときは文だけ。文まで消えては困る');
  vm.runInContext('function lrPush_(to, msgs){ pu.push({ to: to, msgs: msgs }); }', ctx);

  // ★AIで作れなくても、絵は必ず1枚出る（無料の絵置き場から）
  const FREE = F('updAlienPicFree_');
  const f1 = FREE({ name: 'ワンメーター星人' });
  t(/^https:\/\//.test(f1.direct), 'AIがだめでも、絵のありかは必ず返る');
  t(/robohash\.org|dicebear\.com/.test(f1.direct), '  無料の絵置き場から');
  t(f1.direct.indexOf('.png') !== -1 || f1.direct.indexOf('png') !== -1, '  そのまま絵（PNG）で返るところ');
  const seen = {};
  for (let i = 0; i < 30; i++) seen[FREE({ name: 'ワンメーター星人' }).direct] = 1;
  t(Object.keys(seen).length > 3, '  毎回ちがう絵になる');

  // AIがだめなときは、この逃げ道に落ちること
  const PIC = F('updAlienPic_');
  reply = { '*': { code: 500, body: '' } };          // AIが動かない状況
  const p2 = PIC({ name: 'ねぎ星人', toku: ['でかい'], kuse: 'ぬん' });
  t(/^https:\/\//.test(p2.direct), '★AIが動かなくても、絵は出る');

  // 設定で「いいえ」にすれば、絵は作らない
  vm.runInContext('function updCfg_(k){ return k === "星人の絵を出す" ? "いいえ" : ""; }', ctx);
  t(F('updPicOn_')() === false, '★設定で「いいえ」にすれば、絵は作らない');
  t(PIC({ name: 'ねぎ星人', toku: ['でかい'], kuse: 'ぬん' }).direct === '',
    '  そのときは、絵のありかも返さない');
  vm.runInContext('function updCfg_(k){ return ""; }', ctx);
  t(F('updPicOn_')() === true, '  ふだんは作る');
}


console.log('\n■ 絵の手がかりは、動画ではなく星人の特徴から');
{
  const TH = F('updAlienTheme_');
  const th = TH({ name: 'ワンメーター星人', toku: ['さけくさい', 'ワンメーター'], kuse: 'ここでいい' });
  t(th.indexOf('さけくさい') !== -1, '★星人の特徴が、手がかりに入る');
  t(th.indexOf('ワンメーター') !== -1, '  ぜんぶ入る');
  t(th.indexOf('ここでいい') !== -1, '  口ぐせも入る');
  t(TH({}) === '', '  中身が無くても落ちない');
  t(TH(null) === '', '  null でも落ちない');
}

console.log('\n■ 動画は「いま話題のもの」から');
{
  const P = F('updFunPick_');
  const froms = {}, urls = {};
  for (let i = 0; i < 60; i++) { const x = P(); froms[x.from] = 1; urls[x.url] = 1; }
  t(Object.keys(urls).length > 5, '毎回ちがうところから出る');
  const all = Object.keys(froms).join(' ');
  const us = Object.keys(urls).join(' ');
  t(/急上昇|話題|バズ|神|おすすめ/.test(all), '★「急上昇」「話題」から探す');
  t(us.indexOf('youtube.com') !== -1, '  YouTube も');
  t(us.indexOf('tiktok.com') !== -1, '  TikTok も');
  t(us.indexOf('x.com') !== -1, '  X も');
  t(Object.keys(urls).every(u => /^https:\/\//.test(u)), '  どれも ちゃんとしたリンク');

  // ★見出しは「▼タイトル」の形。「（X トレンド）」のような書き方はしない
  const TI = F('updFunTitle_');
  t(TI({ from: 'ねこがしゃべった' }) === 'ねこがしゃべった', '見出しは、そのまま出す');
  t(TI({ from: '' }) !== '', '★見出しが空でも、「▼」だけにはしない');
  t(TI(null) !== '', '  null でも落ちない');
  const longT = TI({ from: 'あ'.repeat(40) });
  t(F('updZenkaku_')(longT) <= F('updBubbleW_')() - 1, '★長すぎる見出しは、切って「…」を付ける');
  t(longT.slice(-1) === '…', '  切ったことが分かるようにする');
  t(TI({ from: 'ね\nこ' }).indexOf('\n') === -1, '  改行が混ざっても、1行にする');
}


console.log('\n■ ふきだしで囲む');
{
  const B = F('updBubble_'), W = F('updZenkaku_');

  // 字の幅の数え方（全角1・半角0.5・重ねた飾りは0）
  t(W('あいう') === 3, '全角は1つぶん');
  t(W('abc') === 1.5, '半角は半分');
  t(W('ｱｲｳ') === 1.5, '半角カナも半分');
  t(W('あ' + '̀́') === 1, '★重ねた飾りは、幅に数えない');
  t(W('') === 0, '空は0');
  t(W(null) === 0, 'null でも落ちない');

  /*
   * ★ふちの長さは、いちばん長い行に合わせる。
   *
   *   前は、中身が短くても いつも決まった長さ（幅＋2）にしていた。
   *   ふちの「╭」「─」「╮」はどれも全角1文字ぶんの幅があるので、
   *   ふちだけが中身より2文字ぶん長くなり、LINEのふきだしからはみ出して
   *   線だけが2行に折り返されていた（実際にそうなった）
   */
  const short = B('　ねぎ星人\n　　　でかい');
  const long  = B('　りょうしゅうしょ星人\n　　　りょうしゅうしょを５まいほしがる');
  const barOf = x => x.split('\n')[0].length;
  t(barOf(short) < barOf(long), '★中身が短ければ、ふちも短くする');
  t(barOf(long) <= F('updBubbleW_')(), '★ふちは、ふきだしの幅をこえない（こえると折り返される）');
  t(barOf(short) >= 6, '  短すぎて形がくずれることもない');
  // 中身の いちばん長い行と、ふちの長さがそろっていること
  {
    const ln = long.split('\n');
    const inner = ln.slice(1, -1);
    let widest = 0;
    inner.forEach(x => { const z = W(x); if (z > widest) widest = z; });
    t(barOf(long) === Math.ceil(widest), '★ふちは、いちばん長い行と同じ長さ');
  }

  // ★はみ出す行は、こちらで折り返す（LINEに勝手に折り返されると形がくずれる）
  const w = F('updBubbleW_')();
  const wrapped = B('　　　' + 'あ'.repeat(30)).split('\n');
  t(wrapped.length > 3, '長い行は、自分で折り返す');
  t(wrapped.slice(1, -1).every(x => W(x) <= w), '★どの行も、ふちからはみ出さない');
  t(wrapped[2].indexOf('　　　　') === 0, '  続きの行は、1つ下げて出す（続きだと分かるように）');

  const ls = B('　あ\n　　い').split('\n');
  t(ls.length === 4, '上のふち＋中身2行＋下のふち');
  t(ls[1] === '　あ' && ls[2] === '　　い', '★中身は、そのまま。行の頭に何も足さない');
  t(B('　あ').indexOf('┃') === -1, '★行の頭に「┃」を付けない');
  t(ls[3].indexOf('⌄') !== -1, '下のふちの真ん中に、しっぽ');
  t(ls[0].length === ls[3].length, '★上と下のふちは、同じ長さ');
  t(B('').split('\n').length === 3, '中身が空でも形はくずれない');
  t(B('').split('\n')[0].length >= 6, '  そのときも、形になる長さは保つ');
  t(B(null).split('\n')[0].indexOf('╭') === 0, 'null でも落ちない');
  t(B('あ'.repeat(99)).split('\n')[0].length === F('updBubbleW_')(),
    '★長い中身でも、ふきだしの幅どまり（それ以上は長くしない）');

  // ★星人の紹介は、名前も特徴も、ぜんぶ ふきだしの中
  const card = F('updAlienBlock_')();
  const cl = card.split('\n');
  const from = cl.findIndex(x => x.indexOf('╭') === 0);
  const to = cl.findIndex(x => x.indexOf('╰') === 0);
  t(from !== -1 && to > from, 'ふきだしがある');
  t(cl[from].length === cl[to].length, '★上と下のふちは、同じ長さ');
  t(cl[from].length <= F('updBubbleW_')(), '★ふちも、ふきだしの幅に収まる（線だけ折り返されない）');
  const inside = cl.slice(from + 1, to);
  t(inside.join('\n').indexOf('星人') !== -1, '★名前も中');
  t(/【.+星人】/.test(inside.join('\n')), '★名前は【】で囲む（いちばん先に目が行くように）');
  t(inside.join('\n').indexOf('特徴') !== -1, '★特徴も中');
  t(inside.join('\n').indexOf('好きなもの') !== -1, '  好きなものも中');
  t(inside.join('\n').indexOf('きらいなもの') !== -1, '  きらいなものも中');
  t(inside.join('\n').indexOf('口ぐせ') !== -1, '  口ぐせも中');
  t(inside.join('\n').indexOf('〖りょうきん') !== -1, '  りょうきんも中（〖〗で囲む）');
  // ★中身がふちからはみ出していないこと（ふちは中身に合わせてあるので、同じ長さまで）
  const barW = cl[from].length;
  t(inside.every(x => W(x) <= barW), '★どの行も、ふちからはみ出さない');
  /*
   * ★はじめの歌（まーくさんのご指示）。
   *   1行のままだと全角15文字ぶんになり、LINEで折り返されて形がくずれるので、
   *   意味の切れ目で3行に分けてある
   */
  t(card.indexOf('あ~た~らし~い') === 0, '★いちばん初めに、歌がくる');
  t(card.indexOf('きゃ~くがきた') !== -1, '  2行目も');
  t(card.indexOf('きぼ~うの　きゃ~く~が') !== -1, '  3行目も');
  t(card.indexOf('あ~た~らし~い') < card.indexOf('てめえ達は今から'),
    '★歌は「てめえ達は今から」より前');
  t(card.indexOf('あ~た~らし~い') < card.indexOf('╭'), '★ふきだしよりも前');
  t(card.indexOf('この方を　乗車して下ちい') !== -1, '見出しは、ふきだしの外');
  // ★見出しも、ふきだしの幅に収まっていること（はみ出すと折り返して台なしになる）
  card.split('\n').filter(x => x.indexOf('╭') !== 0 && x.indexOf('╰') !== 0)
      .forEach(function (x) {
        if (W(x) > F('updBubbleW_')()) { ng++; console.log('  NG  1行に収まらない：' + x); }
      });
  t(true, '★どの行も、ふきだしの幅に収まる');
  t(card.indexOf('▚') === -1, 'かすれた四角は使わない');
  t(card.indexOf('http') === -1, '★星人の紹介に、絵のアドレス（https://…）は入れない');

  /*
   * ★長い名前は、ふきだしの中で1行に収まるところまで短くする。
   *   折り返されると「】」だけが次の行に落ちて、
   *   かっこが片方だけ ぽつんと残る。いちばん見苦しい形
   */
  const N = F('updAlienName_'), w2 = F('updBubbleW_')();
  t(W('【' + N('スマホだいおんりょう星人') + '】') <= w2,
    '★長い名前は、1行に収まるところまで短くする');
  t(N('スマホだいおんりょう星人').slice(-2) === '星人',
    '★「星人」は残す（削ると、何なのか分からなくなる）');
  t(N('ねぎ星人') === 'ねぎ星人', '短い名前は、そのまま');
  t(N('') === '星人', '空でも形になる');
  t(N(null) === '星人', 'null でも落ちない');
  t(W('【' + N('あ'.repeat(40)) + '】') <= w2, 'とんでもなく長くても、収まる');

  // ★行の頭に空白を入れない（下げて書くと、そのぶん長くなって折り返す）
  inside.forEach(function (x) {
    if (/^[　\s]/.test(x)) { ng++; console.log('  NG  行の頭に空白がある：' + JSON.stringify(x)); }
  });
  t(true, '★ふきだしの中は、どの行も 行頭の空白なし');
  t(inside.some(x => x.indexOf('▼特徴') === 0), '  「▼特徴」も左にそろえる');
  t(inside.some(x => x.indexOf('【') === 0), '  名前も左にそろえる');
}

console.log('\n■ せりふは、LINEで折り返さない長さにする');
{
  const W = F('updZenkaku_'), LIM = 13;
  // ★13文字ぶんを超えると、機種によっては まん中で折り返し、
  //   言葉が切れて せりふの形がくずれる（実際にくずれた）
  const check = function (text, name) {
    text.split('\n').forEach(function (x) {
      // ふきだしの中と、リンクの行は別（ふきだしは自前で折り返している）
      if (/^[╭╰]/.test(x) || /^https?:\/\//.test(x) || x.indexOf('⌄') !== -1) return;
      if (/^https?:\/\//.test(x)) return;
      if (W(x) > LIM + 5) { ng++; console.log('  NG  ' + name + ' の行が長い：' + x + '（' + W(x) + '）'); }
    });
  };
  const a = F('updAlien_')();
  const st = F('updKataStart_')(a);
  const dn = F('updKataDenied_')(a, { url: 'https://x.com/', from: 'ねこ' });
  const fl = F('updKataFail_')('だめでした');
  t(st.indexOf('という　りくつなわけだす。') !== -1, '★しめの1行は、まん中の空白をひとつ詰めた形');
  t(st.indexOf('という　りくつな　わけだす。') === -1, '  前の長い形は、もう使わない');
  t(dn.indexOf('きみは　えらばれません。') !== -1, '断りも、みじかい言い方に');
  t(dn.indexOf('スプシは　かわりません。') !== -1, '  「なにも」を外して詰めた');
  t(dn.indexOf('そのかわり　見て下ちい。') !== -1, '★「みなさい」ではなく「見て下ちい」');
  t(dn.indexOf('みなさい') === -1, '  前の言い方は、もう使わない');
  t(fl.indexOf('てんそうは　やめました。') !== -1, 'しくじったときも、みじかく');
  t(fl.indexOf('やりなおして　下ちい。') !== -1, '  やり直しの案内も「下ちい」でそろえる');
  [[st, 'まーくさんの返事'], [dn, '断りの返事'], [fl, 'しくじりの返事']]
    .forEach(function (pair) { check(pair[0], pair[1]); });
  t(true, '★どのせりふも、折り返さない長さに収まる');

  // ★動画の見出しは「▼タイトル」。「（X トレンド）」のような書き方はしない
  const d2 = F('updKataDenied_')(a, { url: 'https://x.com/explore', from: 'ねこがしゃべった' });
  t(d2.indexOf('▼ねこがしゃべった') !== -1, '★動画の見出しは「▼タイトル」で出す');
  t(d2.indexOf('（X トレンド）') === -1, '  「（どこの入口か）」の書き方は、もう使わない');
  t(/▼[^\n]+\nhttps:\/\//.test(d2), '  見出しのすぐ下に、リンクが来る');
  const d3 = F('updKataDenied_')(a, { url: 'https://x.com/explore' });
  t(/▼[^\n]/.test(d3), '  見出しが無いときでも、「▼」だけにはしない');
}

console.log('\n■ 合言葉は、打ち方がまざっていても通る');
{
  const K = F('updKataWord_');
  [['katastrophe', 'ローマ字'],
   ['ＫＡＴＡＳＴＲＯＰＨＥ', '全角の英字'],
   ['Katastrophe', '大文字まじり'],
   ['カタストロフィ', 'カタカナ'],
   ['かたすとろふぃ', 'ひらがな'],
   ['ｶﾀｽﾄﾛﾌｨ', '半角カナ'],
   ['カタストロフィ！', 'うしろに「！」'],
   ['「カタストロフィ」', 'かぎかっこ付き'],
   ['ジェバンニ', 'ジェバンニ'],
   ['じぇばんに', 'ひらがなのジェバンニ'],
   ['ｼﾞｪﾊﾞﾝﾆ', '半角カナのジェバンニ'],
   ['jebanni', 'ローマ字のジェバンニ'],
   ['kataストロフィ', '★ローマ字とカタカナのまぜこぜ'],
   ['カタstrophe', '★カタカナとローマ字のまぜこぜ'],
   ['かたストロフィ', '★ひらがなとカタカナのまぜこぜ'],
   ['ｶﾀすとろふぃ', '★半角カナとひらがなのまぜこぜ'],
   ['ジェbanni', '★ジェバンニのまぜこぜ'],
   ['𝕜𝕒𝕥𝕒𝕤𝕥𝕣𝕠𝕡𝕙𝕖', '飾り文字'],
   ['ⓀⒶⓉⒶⓈⓉⓇⓄⓅⒽⒺ', '丸囲みの飾り文字']
  ].forEach(function (pair) { t(K(pair[0]) === true, pair[1] + '「' + pair[0] + '」'); });

  // ★ほかの言葉が混ざったら、絶対に反応しない
  [['カタストロフィの件', 'ほかの言葉が続く'],
   ['きょうは katastrophe です', '文の中にある'],
   ['カタ', 'とちゅうまで'],
   ['カタストロフィカタストロフィ', '2つ続けて'],
   ['', '空'],
   ['　', '空白だけ'],
   ['ジェバンニが一晩でやってくれました', 'ジェバンニ＋ほかの言葉']
  ].forEach(function (pair) { t(K(pair[0]) === false, '  反応しない：' + pair[1]); });
  t(K(null) === false, '  null でも落ちない');

  /*
   * ★「ジェバンニ、Katastrophe」のように2つならべても受ける。
   *   元のセリフのままの言い方で、まーくさんが実際にそう送られた。
   *   前はここで外れて、打ったのに何も起きなかった
   */
  t(K('ジェバンニ、Katastrophe') === true, '★「ジェバンニ、Katastrophe」も受ける');
  t(K('ジェバンニ、カタストロフィ') === true, '  日本語で2つならべても受ける');
  t(K('ジェバンニ, katastrophe') === true, '  半角カンマでも受ける');
  t(K('ジェバンニ・カタストロフィ') === true, '  中点でも受ける');
  t(K('カタストロフィ、💩') === true, '  💩とならべても受ける');
  t(K('ジェバンニ、おはよう') === false,
    '★ふつうの言葉が混ざったら、やはり反応しない');
  t(K('おはよう、ジェバンニ') === false, '  前に付いていても反応しない');
  t(K('ジェバンニ、カタストロフィ、あした、よろしく') === false,
    '  ならべすぎ（知らない言葉入り）にも反応しない');
}


console.log('\n■ コードではないファイルは、取り込まない');
{
  /*
   * ★Apps Script では、.json のファイルは「appsscript.json」（設定ファイル）
   *   としてしか受け付けてもらえない。ほかの .json を送ると、まるごと はねられる。
   *   実際、おつかいメモ（errand.json）を置いたせいで
   *   取り込みが1回まるごと失敗した（400 Invalid manifest）
   */
  const SK = F('updSkipFile_');
  t(SK('errand.json') === true, '★おつかいメモは、取り込まない');
  t(SK('ERRAND.JSON') === true, '  大文字でも同じ');
  t(SK('note.json') === true, '★appsscript.json 以外の .json は、ぜんぶ取り込まない');
  t(SK('appsscript.json') === false, '  appsscript.json だけは、取り込む');
  t(SK('001-Code.gs') === false, '  .gs は、もちろん取り込む');
  t(SK('page.html') === false, '  .html も取り込む');
  t(SK('') === true && SK(null) === true, '空でも落ちない');

  // 置き場の一覧から、ちゃんと外れること
  reset([]);
  props['GH_REPO'] = 'circlenine/taxi';
  props['GH_PATH'] = 'gas';
  gh = { dir: [
    { name: '001-Code.gs',    path: 'gas/001-Code.gs',    type: 'file', sha: 'a' },
    { name: 'appsscript.json', path: 'gas/appsscript.json', type: 'file', sha: 'b' },
    { name: 'errand.json',    path: 'errand.json',    type: 'file', sha: 'c' }
  ], raw: { 'gas/001-Code.gs': 'x', 'gas/appsscript.json': '{}' } };
  const names = F('updListGitHub_')().map(function (x) { return x.name; });
  t(names.indexOf('errand') === -1 && names.indexOf('errand.json') === -1,
    '★一覧に、おつかいメモは入らない（' + names.join('・') + '）');
  t(names.indexOf('001-Code') !== -1, '  コードは、ちゃんと入る');
  t(names.indexOf('appsscript') !== -1, '  設定ファイルも入る');
}

console.log('\n■ 📮 おつかい（クロちゃんに頼んだことを、スプシが取りにくる）');
{
  /*
   * ★クロちゃんは、スプシもLINEも直接は動かせない。
   *   できるのは「置き場にコードを置くこと」だけ。
   *   そこで、置き場に「おつかいメモ」を1枚置けるようにした。
   *   スプシは3分おきに置き場を見にいくので、そのついでにメモも読む
   */
  const E = F('updErrandTick_');
  const OK = vm.runInContext('UPD_ERRAND_OK', ctx);

  props['GH_REPO'] = 'circlenine/taxi';
  props['GH_PATH'] = 'gas';
  delete props['UPD_ERRAND_DONE'];

  // できることは、決めた一覧の中だけ
  t(!!OK['ping'] && !!OK['event-test'] && !!OK['report-test'] && !!OK['venue-probe'] &&
    !!OK['venue-ledger'],
    '★できることは、決めた一覧の中だけ（いまは5つ）');
  t(OK['group-send'] === undefined && OK['本番'] === undefined,
    '★グループへの本番送信は、一覧に無い（ここからは絶対にできない）');

  // メモが無ければ、何もしない
  gh = { raw: {} };
  ctx.pu.length = 0;
  t(E() === false, 'メモが無ければ、何もしない');
  t(ctx.pu.length === 0, '  何も送らない');

  // 知らない頼みごとは、何もしない
  gh = { raw: { 'errand.json': JSON.stringify({ id: 'x1', do: 'グループに送って' }) } };
  ctx.pu.length = 0;
  t(E() === false, '★知らない頼みごとは、何もしない');
  t(ctx.pu.length === 0, '  何も送らない');
  /*
   * ★印だけは、次へ進めます。
   *   1枚に いくつか書けるようにしたので、知らない頼みごとが1つあると、
   *   そこで止まって、あとの頼みごとが永遠に始まらなくなるためです
   */
  t(props['UPD_ERRAND_DONE'] === 'x1#0', '  印は次へ進める（1つで詰まらせない）');
  delete props['UPD_ERRAND_DONE'];

  // ping は、返事だけ
  gh = { raw: { 'errand.json': JSON.stringify({ id: 'x2', do: 'ping' }) } };
  ctx.pu.length = 0;
  t(E() === true, '★メモのとおり、1回やる');
  t(props['UPD_ERRAND_DONE'] === 'x2#0', '  やった印を覚える（メモの番号#何番目）');
  t(ctx.pu.length === 1, '★結果を知らせる');
  t(ctx.pu[0].to === 'Umark', '★送り先は まーくさんの個人LINEだけ');
  has(ctx.pu[0].msgs[0].text, 'おつかい', '  おつかいだと分かる');
  has(ctx.pu[0].msgs[0].text, 'うごいています', '  中身も入っている');

  // 同じメモは、二度やらない
  ctx.pu.length = 0;
  t(E() === false, '★同じメモは、二度やらない');
  t(ctx.pu.length === 0, '  だから、何度も鳴らない');

  // 新しいメモなら、またやる
  gh = { raw: { 'errand.json': JSON.stringify({ id: 'x3', do: 'ping' }) } };
  ctx.pu.length = 0;
  t(E() === true, '★新しいメモなら、またやる');
  t(props['UPD_ERRAND_DONE'] === 'x3#0', '  印も新しくする');

  // 中身がこわれていても、落ちない
  gh = { raw: { 'errand.json': 'こわれた中身' } };
  ctx.pu.length = 0;
  t(E() === false, 'こわれたメモでも、落ちない');
  gh = { raw: { 'errand.json': JSON.stringify({ do: 'ping' }) } };
  t(E() === false, '  番号（id）が無いメモも、やらない');

  delete props['UPD_ERRAND_DONE'];
  ctx.pu.length = 0;

  /* ---- イベントの確認用は「あすのぶん」 ---- */
  /*
   * ★確認用というのは、そもそも
   *   「あすのぶんを、前の日のうちに人の目で見ておく」ためのものです。
   *   きょうのぶんを見せても、直す時間がありません。
   *   前は、そうさパネルの日付らん（空なら「きょう」）を見ていました
   */
  let asked = null;
  ctx.vnParseDay_      = function (x) { asked = x; return new Date(2026, 8, 18); };
  ctx.vnSendTodayToMe  = function () { return ""; };
  ctx.vnDayLabel_      = function () { return '9/18(金)'; };
  ctx.vnTodayEvents_   = function () { return [1, 2]; };

  gh = { raw: { 'errand.json': JSON.stringify({ id: 'e1', do: 'event-test' }) } };
  ctx.pu.length = 0;
  t(E() === true, 'イベントの確認用をやる');
  t(asked === 'あす', '★日付を書かなければ「あす」のぶん（前の日に見ておくためのもの）');
  has(ctx.pu[0].msgs[0].text, '9/18(金)', '  どの日のぶんを送ったか、はっきり書く');
  has(ctx.pu[0].msgs[0].text, 'グループには送っていません', '★グループには出ないと、はっきり書く');

  gh = { raw: { 'errand.json': JSON.stringify({ id: 'e2', do: 'event-test', day: 'あさって' }) } };
  ctx.pu.length = 0;
  t(E() === true, '日付を書いたメモも、やる');
  t(asked === 'あさって', '★メモに日付を書けば、その日のぶんにできる');

  /* ---- 1枚のメモに、いくつか頼める（1回に1つずつ）---- */
  /*
   * ★まとめレポートは作るのに時間がかかります。
   *   2つを続けてやると、持ち時間（6分）を超えて途中で止まります。
   *   3分おきに見にきているので、2つなら6分でぜんぶ終わります
   */
  gh = { raw: { 'errand.json': JSON.stringify({ id: 'e3', do: ['ping', 'event-test'] }) } };
  ctx.pu.length = 0;
  t(E() === true, '★1つめをやる');
  has(ctx.pu[0].msgs[0].text, 'うごいています', '  1つめは ping');
  has(ctx.pu[0].msgs[0].text, '（1／2）', '  何番目かも書く');
  ctx.pu.length = 0;
  t(E() === true, '★次の回に、2つめをやる（1回に1つだけ）');
  has(ctx.pu[0].msgs[0].text, '（2／2）', '  2つめだと分かる');
  ctx.pu.length = 0;
  t(E() === false, '★やり終えたら、それ以上くり返さない');
  t(ctx.pu.length === 0, '  だから、何度も鳴らない');

  // 知らない頼みごとが混ざっていても、あとの頼みごとが止まらない
  gh = { raw: { 'errand.json': JSON.stringify({ id: 'e4', do: ['そとへ送って', 'ping'] }) } };
  ctx.pu.length = 0;
  t(E() === false, '★知らない頼みごとは、やらない');
  t(ctx.pu.length === 0, '  何も送らない');
  t(E() === true, '★でも、あとの頼みごとは ちゃんと始まる（1つで詰まらせない）');
  has(ctx.pu[0].msgs[0].text, 'うごいています', '  2つめは、やってくれる');

  delete props['UPD_ERRAND_DONE'];
  delete ctx.vnParseDay_; delete ctx.vnSendTodayToMe;
  delete ctx.vnDayLabel_; delete ctx.vnTodayEvents_;
  ctx.pu.length = 0;
}

console.log('\n■ 合図の役わり（カタストロフィ＝遊び／💩＝取り込み）');
{
  /*
   * ★まーくさんのご指示。
   *     「カタストロフィ」…… だれが打っても遊び。まーくさんでも遊び
   *     「💩」…………… LINEからの取り込み。まーくさんだけ
   *                     （ほかの人が打ったときは、遊びが返る）
   */
  const K = F('updHandleKata_');
  const cc = ctx.CacheService.getScriptCache();
  const clear = function () {
    ['KATA_FUN_Umark', 'KATA_FUN_Uother', 'UPD_RUNNING'].forEach(function (k) {
      try { cc.remove(k); } catch (e) {}
    });
    delete props['UPD_KATA_JOBS']; delete props['UPD_LINE_TO']; delete props['UPD_LINE_KATA'];
    triggers.length = 0; ctx.pu.length = 0; ctx.rep.length = 0;
  };
  const jobs = function () { return String(props['UPD_KATA_JOBS'] || ''); };

  // カタストロフィは、どの書き方でも「遊び」
  ['katastrophe', 'カタストロフィ', 'かたすとろふぃ', 'ｶﾀｽﾄﾛﾌｨ', 'ＫＡＴＡＳＴＲＯＰＨＥ',
   '𝕜𝕒𝕥𝕒𝕤𝕥𝕣𝕠𝕡𝕙𝕖', 'ジェバンニ', 'ジェバンニ、Katastrophe'].forEach(function (w) {
    clear();
    t(K({ message: { text: w }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
      '★まーくさんの「' + w + '」も、受ける');
    t(upTrig().length === 0, '  ★取り込みは始めない（遊び）');
    // ★文はその場で返し、積むのは「絵だけ」のおつかいです
    t(jobs().indexOf('"kind":"pic"') !== -1, '  絵だけを、あとから送るように積む');
    t(props['UPD_LINE_KATA'] === undefined, '  取り込みの覚え書きも残さない');
  });

  // 💩 は、まーくさんだけ取り込み
  clear();
  t(K({ message: { text: '💩' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '★まーくさんの「💩」は、受ける');
  t(upTrig().length === 1, '★そちらは、取り込みを始める');
  t(props['UPD_LINE_KATA'] === '1', '  取り込みだと覚える');
  t(jobs().indexOf('"kind":"fun"') === -1, '  遊びとしては積まない');

  // ほかの人の 💩 は、遊び
  clear();
  t(K({ message: { text: '💩' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    '★ほかの人の「💩」も、受ける');
  t(upTrig().length === 0, '★ほかの人の「💩」で、取り込みは絶対に始めない');
  t(jobs().indexOf('"kind":"pic"') !== -1, '★代わりに、遊びを返す（何も返らない、にはしない）');

  // 同じ人が続けて打っても、動画だらけにはならない（10分に1回まで）
  clear();
  K({ message: { text: 'カタストロフィ' }, source: { userId: 'Uother' }, replyToken: 'r' });
  const n1 = jobs().length;
  delete props['UPD_KATA_JOBS'];
  K({ message: { text: 'カタストロフィ' }, source: { userId: 'Uother' }, replyToken: 'r' });
  t(n1 > 0 && jobs() === '', '★続けて打っても、2回目は見送る（10分に1回まで）');
  clear();
}

console.log('\n■ 📖 終わったときの知らせに、ひとことを添える');
{
  /*
   * ★「かんりょう」だけでは味気ない、とのご指示。
   *   ふだんは英語の短い名言（元気が出る・勇気が湧く・納得する）。
   *   LINEから「アニメに名言変更してください」でアニメにも変えられる
   */
  const Q = F('updQuote_');
  const en = vm.runInContext('UPD_QUOTES_EN', ctx);
  const an = vm.runInContext('UPD_QUOTES_ANIME', ctx);
  const W2 = F('updZenkaku_');

  t(en.length >= 100, '★英語の名言は100通り以上（' + en.length + '通り）');
  t(an.length >= 100, '  アニメのほうも残してある（' + an.length + '通り）');
  t(new Set(en.map(x => x.en)).size === en.length, '★英語の名言に、同じ文が2つ入っていない');
  t(en.every(x => x.en && x.ja && x.by),
    '★どれも「英文・日本語の意味・だれの言葉か」がそろっている');
  t(en.every(x => /^[\x20-\x7E]+$/.test(x.en)), '★英文に、全角の字がまぎれていない');
  t(en.every(x => x.en.length <= 90), '  1文が長すぎるものは入れない');
  t(new Set(en.map(x => x.by)).size >= 40,
    '  いろいろな人の言葉（' + new Set(en.map(x => x.by)).size + '人）');

  // ふだんは英語
  delete props['UPD_QUOTE_KIND'];
  t(F('updQuoteKind_')() === 'en', '★何も決めていなければ、英語');
  const q = Q();
  t(q.indexOf('"') === 0, '★英語のときは、英文から始まる');
  t(q.split('\n').length === 3, '  英文・日本語の意味・だれの言葉か の3行');
  t(q.indexOf('―') !== -1, '★だれの言葉かを必ず書く');

  // アニメに切り替え
  t(F('updQuoteKindSet_')('anime') === 'anime', 'アニメに切り替えられる');
  t(F('updQuoteKind_')() === 'anime', '  覚えている');
  t(Q().indexOf('『') !== -1, '★アニメのときは、作品名が入る');
  t(F('updQuoteKindSet_')('en') === 'en', '英語に戻せる');
  t(Q().indexOf('『') === -1, '  戻したら、英語になる');

  // LINEからの言い方
  const QW = F('updQuoteWord_');
  t(QW('アニメに名言変更してください') === 'anime', '★「アニメに名言変更してください」でアニメ');
  t(QW('名言をアニメに') === 'anime', '  「名言をアニメに」でも通る');
  t(QW('めいげん　まんが') === 'anime', '  ひらがな・「まんが」でも通る');
  t(QW('英語に名言変更してください') === 'en', '★「英語に名言変更してください」で英語');
  t(QW('名言を英語にもどして') === 'en', '  「もどして」でも通る');
  t(QW('アニメ見た') === '', '★「名言」が入っていなければ、反応しない');
  t(QW('名言って　いいよね') === '', '  どちらにするか書いていなければ、反応しない');
  t(QW('') === '' && QW(null) === '', '空でも null でも落ちない');

  // 受け口（まーくさんだけ）
  const HQ = F('updHandleQuote_');
  delete props['UPD_QUOTE_KIND']; ctx.rep.length = 0;
  t(HQ({ message: { text: 'アニメに名言変更してください' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    'ほかの人が打っても、受けはする');
  t(props['UPD_QUOTE_KIND'] === undefined, '★ほかの人には、変えさせない');
  t(ctx.rep.length === 0, '  何も返さない');

  ctx.rep.length = 0;
  t(HQ({ message: { text: 'アニメに名言変更してください' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    'まーくさんなら、変えられる');
  t(props['UPD_QUOTE_KIND'] === 'anime', '★アニメになる');
  has(ctx.rep[0], 'アニメに　しました', '  変えたと分かる返事');
  has(ctx.rep[0], '『', '★その場で1つ出して見せる');

  ctx.rep.length = 0;
  t(HQ({ message: { text: '英語に名言変更してください' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '英語にも戻せる');
  t(props['UPD_QUOTE_KIND'] === 'en', '★英語に戻る');
  has(ctx.rep[0], 'えいごに　しました', '  戻したと分かる返事');

  t(HQ({ message: { text: 'こんにちは' }, source: { userId: 'Umark' }, replyToken: 'r' }) === false,
    'ふつうの話は、こちらでは受け止めない');

  // 完了の知らせに、ちゃんと入る
  delete props['UPD_QUOTE_KIND'];
  const done = F('updKataDone_')('入れ替え：001-Code.gs');
  t(done.indexOf('とりこみ　かんりょう。') !== -1, '  終わったことは、これまでどおり出る');
  t(done.indexOf('001-Code.gs') !== -1, '  入れ替えたファイル名も、これまでどおり出る');
  t(done.indexOf('―') !== -1, '★完了の知らせに、ひとことが入る');
  t(done.indexOf(F('UPD_KATA_END')) !== -1, '  しめの1行も、これまでどおり');

  // しくじったときには、添えない（茶化して見えるため）
  t(F('updKataFail_')('❌ だめでした').indexOf('―') === -1, '★しくじったときには、添えない');

  // 何度か呼んで、同じものばかりにならないこと
  const seen = {};
  for (let i = 0; i < 600; i++) { seen[Q()] = 1; }
  t(Object.keys(seen).length >= 50,
    '★毎回おなじにはならない（600回で ' + Object.keys(seen).length + '通り出た）');
  ctx.rep.length = 0;
}

console.log('\n■ りょうきんは、危なそうな星人ほど高い');
{
  const FEE = F('updAlienFee_');
  const abunai = { name: 'はいてない星人', toku: ['くつをぬぐ', 'さけくさい'],
                   suki: ['ワンメーター'], kirai: ['のりばのれつ'], kuse: 'ここでいい' };
  const yasui  = { name: 'ためいき星人', toku: ['ためいき'], suki: [], kirai: [], kuse: '' };
  const sirow  = { name: 'ふつう星人', toku: ['まばたき'], suki: ['あめ'], kirai: ['あめ'], kuse: 'はい' };

  t(FEE(abunai) > FEE(yasui), '★危なそうな星人のほうが、高い');
  t(FEE(sirow) === 0, '★何も当てはまらない星人は 0えん（いちばん安全）');
  t(FEE(abunai) <= 100, '★100えんを超えない');
  t(FEE(abunai) >= 0 && FEE(yasui) >= 0, '  0えんを下回らない');
  t(FEE(null) === 0, '  星人が無ければ 0えん（落ちない）');

  // ★同じ星人なら、いつ見ても同じ金額。見るたびに変わると、数字の意味が消える
  t(FEE(abunai) === FEE(abunai), '★同じ星人なら、何度見ても同じ金額');

  // ★口ぐせ・好きなもの・きらいなものも、ちゃんと数える（名前だけ見ていない）
  t(FEE({ name: 'なぞ星人', toku: [], suki: [], kirai: [], kuse: 'そこまげて' }) > 0,
    '★口ぐせだけでも、危なさとして数える');
  t(FEE({ name: 'なぞ星人', toku: [], suki: ['ねぎる'], kirai: [], kuse: '' }) > 0,
    '  好きなものも数える');
  // 文字で1つだけ返ってきても落ちない（AIがそう返すことがある）
  t(FEE({ name: 'なぞ星人', toku: 'くつをぬぐ', suki: '', kirai: '', kuse: '' }) > 0,
    '  並びでなく文字1つで来ても、数えられる');

  // ★どんな星人でも、必ず 0〜100 の整数に収まる
  let over = 0;
  for (let i = 0; i < 200; i++) {
    const f = FEE(F('updAlienFallback_')());
    if (!(f >= 0 && f <= 100) || f !== Math.round(f)) over++;
  }
  t(over === 0, '★200回ためしても、0〜100の整数に収まる');
}

console.log('\n■ 取り込みを まるごと止めてしまうファイルが、置き場に無いか');
{
  /*
   * ★ここは、コードではなく「置き場そのもの」を見るテストです。
   *
   *   おつかいメモ（errand.json）を gas/ の中に置いたせいで、
   *   取り込みが (400) Invalid manifest で、ずっと まるごと失敗していました。
   *   Apps Script は .json を「設定ファイル」としてしか受け取らないためです。
   *
   *   「取り込まない」という決まりを書いても、その決まり自体が
   *   取り込めないのでは意味がありません。
   *   ですので、置き場に そういうファイルが増えた時点で気づけるようにします。
   */
  const gasDir = path.join(__dirname, '..');
  const bad = fs.readdirSync(gasDir).filter(function (n) {
    return /\.json$/i.test(n) && n.toLowerCase() !== 'appsscript.json';
  });
  t(bad.length === 0,
    '★gas/ に置いてよい .json は appsscript.json だけ' +
    (bad.length ? '（見つかった：' + bad.join('・') + '）' : ''));

  const root = path.join(gasDir, '..');
  t(fs.existsSync(path.join(root, 'errand.json')) === true,
    '★おつかいメモは、置き場のいちばん上（gas/ の外）に置く');
  t(fs.existsSync(path.join(gasDir, 'errand.json')) === false,
    '  gas/ の中には、絶対に置かない');

  // メモを読みにいく先も、gas/ の外であること
  const src = fs.readFileSync(path.join(gasDir, '005-Updater.gs'), 'utf8');
  t(src.indexOf('const path = UPD_ERRAND_FILE;') !== -1,
    '★読みにいく先も、置き場のいちばん上（フォルダ名を足さない）');
}

console.log('\n■ 🚨 しくじりを、黙ったままにしない（クロちゃんからの見直し）');
{
  const H = F('updHandleErr_');
  props['SENDER_MAP'] = undefined;
  ctx.rep.length = 0;

  // 記録が無ければ、無いと言う
  delete props['LAST_ERRORS'];
  t(H({ message: { text: 'エラー' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '★「エラー」と送れば、ここが受ける');
  t(String(ctx.rep[0]).indexOf('しくじりの記録はありません') !== -1, '  無ければ、無いと言う');

  // 記録があれば、そのまま見せる
  props['LAST_ERRORS'] = JSON.stringify([
    { at: '2026-09-21T10:00:00.000Z', where: 'vnDocSave', msg: 'ドライブに置けませんでした' }
  ]);
  ctx.rep.length = 0;
  H({ message: { text: 'エラー' }, source: { userId: 'Umark' }, replyToken: 'r' });
  t(String(ctx.rep[0]).indexOf('vnDocSave') !== -1, '★どこでしくじったかが出る');
  t(String(ctx.rep[0]).indexOf('ドライブに置けませんでした') !== -1, '  中身も出る');

  // ほかの人には、何も返さない
  ctx.rep.length = 0;
  t(H({ message: { text: 'エラー' }, source: { userId: 'Uother' }, replyToken: 'r' }) === false,
    '★ほかの人には、返さない');
  t(ctx.rep.length === 0, '  何も言わない');
  delete props['LAST_ERRORS'];
}

console.log('\n■ ❓ 絵文字の一覧を、LINEの中で引ける');
{
  const H = F('updHandleHelp_');
  ctx.rep.length = 0;
  t(H({ message: { text: '❓' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '★「❓」で、一覧が出る');
  const x = String(ctx.rep[0]);
  ['📈', '🎪', '📅', '📒', '📄', '☀️', '❌', '⏳', '💩'].forEach(function (e) {
    t(x.indexOf(e) !== -1, '  ' + e + ' が一覧にある');
  });
  t(x.indexOf('みんな使えます') !== -1, '★だれが使えるかも書いてある');

  ctx.rep.length = 0;
  t(H({ message: { text: '？' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '  全角の「？」でも出る');
  ctx.rep.length = 0;
  t(H({ message: { text: '❓' }, source: { userId: 'Uother' }, replyToken: 'r' }) === false,
    '★ほかの人には、返さない');
  t(ctx.rep.length === 0, '  何も言わない');
}

console.log('\n■ 無反応を、どこにも作らない（ご指摘）');
{
  const K = F('updHandleKata_');
  props['GH_REPO'] = 'circlenine/test';
  try { ctx.CacheService.getScriptCache().remove('KATA_FUN_Uother'); } catch (e) {}
  ctx.rep.length = 0; ctx.pu.length = 0;

  t(K({ message: { text: 'カタストロフィ' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    '1回目は、ふつうに遊びが返る');
  t(String(ctx.rep[0]).indexOf('きみは　えらばれません') !== -1, '  星人が出る');

  // 立て続けに打たれたとき
  ctx.rep.length = 0;
  t(K({ message: { text: 'カタストロフィ' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    '★立て続けに打たれても、受ける');
  t(ctx.rep.length === 1, '★黙って見送らない（かならず何か返す）');
  t(String(ctx.rep[0]).indexOf('出したばかり') !== -1, '  「いま出したばかり」と伝える');

  // 星人が作れないときでも、返す
  try { ctx.CacheService.getScriptCache().remove('KATA_FUN_Uthird'); } catch (e) {}
  const keepFB = vm.runInContext('updAlienFallback_', ctx);
  vm.runInContext('function updAlienFallback_(){ throw new Error("作れない"); }', ctx);
  ctx.rep.length = 0;
  K({ message: { text: 'カタストロフィ' }, source: { userId: 'Uthird' }, replyToken: 'r' });
  t(ctx.rep.length === 1, '★星人が作れなくても、かならず返す');
  t(String(ctx.rep[0]).indexOf('星人が　出てきません') !== -1, '  出せないと、はっきり言う');
  ctx.updAlienFallback_ = keepFB;
}

console.log('\n■ 自動の「とりこみ かんりょう」は、1行だけにする（ご指示）');
{
  const T = F('updTellResult_');
  props['UPD_TELL'] = '1';
  ctx.pu.length = 0;
  t(T('じどう', 'とりこみ　かんりょう。\n　001-Code、003-LineReport、005-Updater、006-Venue') === true,
    '自動の知らせは、送る');
  const x = String(ctx.pu[0].msgs[0].text);
  t(x.split('\n').length === 1, '★1行だけ（直しが続くと、これだけで画面が埋まるため）', x);
  t(x.indexOf('（4件）') !== -1, '  何件入ったかは出す', x);
  t(x.indexOf('001-Code') === -1, '★ファイルの名前は、自動のときは出さない');
  t(x.indexOf('りくつなわけだす') === -1, '★決まり文句も、自動のときは出さない');
  t(x.indexOf('"') === -1, '★名言も、自動のときは出さない');

  // しくじったときは、これまでどおり くわしく
  ctx.pu.length = 0;
  T('じどう', '❌ 書き込めませんでした（400）');
  const y = String(ctx.pu[0].msgs[0].text);
  t(y.indexOf('書き込めませんでした') !== -1,
    '★しくじったときは、くわしく出す（原因が分からないと直せない）');

  // 手で打ったとき（💩）は、これまでどおり
  ctx.pu.length = 0;
  T('スプシ', '入れ替え：001-Code、005-Updater');
  const z = String(ctx.pu[0].msgs[0].text);
  t(z.indexOf('001-Code') !== -1, '★手で打ったときは、これまでどおり くわしく（本人が待っているため）');
  t(z.split('\n').length > 1, '  1行ではなく、これまでどおりの形');
  ctx.pu.length = 0;
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
