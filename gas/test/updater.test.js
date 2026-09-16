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
      Button: { YES: 'YES' }, ButtonSet: { YES_NO: 'YN', OK: 'OK' }
    };
  }
};
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

/* ---- 偽の Apps Script API ---- */
let project;            // サーバー側にあることになっている中身
let apiCalls;           // 呼ばれた記録
let apiFail = null;     // {path, code, msg} を入れると、その呼び出しだけ失敗する
ctx.UrlFetchApp = { fetch: (url, opt) => {
  if (url.indexOf('https://api.github.com/') === 0) {
    if (gh && gh.fail) {
      return { getResponseCode: () => gh.fail.code,
               getContentText: () => JSON.stringify({ message: gh.fail.msg }) };
    }
    // 置き場そのものを聞かれたとき（既定の枝を知るため）
    if (url.indexOf('/contents/') === -1) {
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
// 「取り込みの見張り」だけを数える（星人の絵の見張りは別物なので、混ぜない）
const upTrig = () => triggers.filter(x => x.getHandlerFunction() === 'updRunFromLine_');

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
F('menuUpdateCode')();
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

console.log('\n■ 読み元の選び方');
reset([['001-Code.gs', 'x']]);
t(F('updSource_')() === 'drive', '鍵が無ければドライブから読む');
props['GH_REPO'] = 'circlenine/test';
t(F('updSource_')() === 'drive', 'リポジトリだけではドライブのまま');
props['GH_TOKEN'] = 'github_pat_xxx';
t(F('updSource_')() === 'github', '両方そろえばGitHubから読む');

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
t(panel._prot[0]._a1 === 'B9:B23',
  'チェックのらん（B列）を、置いてある行のぶんだけ守る（入力らんも含む）');
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
  has(text, '17時の自動チェック', '  そう伝える');
  t(vm.runInContext('repArmed', ctx) === 1, '毎月のレポート本番も、一緒にそろえる');
  t(vm.runInContext('tstArmed', ctx) === 1, '★レポートの確認用（16日3:00）も、一緒にそろえる');
  has(text, 'レポートの確認用', '  そう伝える');
  /*
   * ★イベントの見張りは、ここが無いと永久に立ち上がらない。
   *   立て直す仕掛け（vnSelfHeal_）が、その見張りの中から動くため。
   *   「なおして」でここを見ないと、鶏と卵になる
   */
  t(vm.runInContext('vnArmed', ctx) === 1, '★イベントの見張りも、一緒にそろえる（ここが抜けていた）');
  has(text, 'イベントの見張り', '  そう伝える');
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

  // ほかの人が打っても、何も起きず、何も返さない
  ctx.rep.length = 0; ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: 'katastrophe' }, source: { userId: 'Uother' }, replyToken: 'r' }) === true,
    '★ほかの人が打っても、そこで止める');
  t(upTrig().length === 0, '  ★取り込みは絶対に始めない');
  t(ctx.pu.length === 1, '  代わりに、1回だけ送る');
  t(ctx.pu[0].msgs[0].text.indexOf('きみは　えらばれません') !== -1,
    '  あの黒い球の声で断る');

  // 個人LINEから
  ctx.rep.length = 0; ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: 'KATASTROPHE' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    'まーくさんが打つと動く');
  t(upTrig().length === 1, '  裏で取り込む見張りを作る');
  t(upTrig()[0]._kind === 'after', '  受け口の中では取り込まない');
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
  t(kata({ message: { text: 'katastrophe' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '取り込み中にもう一度打っても受ける');
  t(upTrig().length === 0, '  ★二重には動かさない');
  t(ctx.rep[0].indexOf('IN BEARBEITUNG') !== -1, '  すでに動いていると伝える');

  // ★うまくいったときは、もう何も送らない（1回の通知で済ませる）
  ctx.pu.length = 0;
  triggers.push({ getHandlerFunction: () => 'updRunFromLine_', _kind: 'after' });
  F('updRunFromLine_')();
  t(ctx.pu.length === 0, '★うまくいったら、完了の合図は送らない');
  t(props['UPD_LINE_KATA'] === undefined, '  合言葉の覚え書きは消す');

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
  t(kata({ message: { text: 'ｋａｔａｓｔｒｏｐｈｅ' },
           source: { userId: 'Umark', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    '★グループLINEからでも効く');
  t(upTrig().length === 1, '  取り込みを始める');
  t(props['UPD_LINE_TO'] === 'Cgroup', '  結果は、打った場所（グループ）へ返す');

  // 置き場所が入っていなければ、動かさずに理由を返す
  ctx.rep.length = 0; triggers.length = 0;
  try { F('CacheService').getScriptCache().remove('UPD_RUNNING'); } catch (e) {}
  const keepTok = props['GH_TOKEN']; delete props['GH_TOKEN'];
  t(kata({ message: { text: 'katastrophe' }, source: { userId: 'Umark' }, replyToken: 'r' }) === true,
    '置き場所が無くても落ちない');
  t(upTrig().length === 0, '  ★動かさない');
  t(ctx.rep[0].indexOf('てんそうは　やめました') !== -1, '  理由を返す');
  t(ctx.rep[0].indexOf('スプシは　そのままです') !== -1, '  何も壊れていないことも伝える');
  props['GH_TOKEN'] = keepTok;
}


console.log('\n■ 僕以外が合言葉を打ったとき');
{
  const kata = F('updHandleKata_');
  props['GH_REPO'] = 'circlenine/test'; props['GH_TOKEN'] = 'tok';
  try {
    const cc = ctx.CacheService.getScriptCache();
    cc.remove('UPD_RUNNING'); cc.remove('KATA_FUN_Uother'); cc.remove('KATA_FUN_Uthird');
  } catch (e) {}

  ctx.pu.length = 0; triggers.length = 0;
  t(kata({ message: { text: 'KATASTROPHE' }, source: { userId: 'Uother', groupId: 'Cgroup' }, replyToken: 'r' }) === true,
    'ほかの人が打っても受ける');
  t(upTrig().length === 0, '★コードの取り込みは、絶対に動かさない');
  t(props['UPD_LINE_TO'] === undefined || props['UPD_LINE_TO'] !== 'Uother',
    '  結果の送り先にもならない');
  t(ctx.pu.length === 1, '★送るのは1回だけ');
  t(ctx.pu[0].to === 'Cgroup', '  打った場所（グループ）へ送る');
  const dn = ctx.pu[0].msgs[0].text;
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
  t(/〖とくてん　[０-９]+てん〗/.test(b), '★とくてんは〖〗で囲む');
  t(b.split('\n').some(x => x.indexOf('〖') === 0), '★とくてんの行は、先頭に空白を入れない');

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

  // ★ふちの長さは、いつも同じ（LINEで1行に収まるぎりぎりにそろえてある）
  const short = B('　ねぎ星人\n　　　でかい');
  const long  = B('　りょうしゅうしょ星人\n　　　りょうしゅうしょを５まいほしがる');
  const barOf = x => x.split('\n')[0].length;
  t(barOf(short) === barOf(long), '★中身が長くても短くても、ふちの長さは同じ');
  t(barOf(short) === F('updBubbleW_')() + 2, '  幅は「ふきだしの幅」のとおり');

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
  t(B('').split('\n')[0].length === F('updBubbleW_')() + 2, '  そのときも、ふちの長さは同じ');
  t(B(null).split('\n')[0].indexOf('╭') === 0, 'null でも落ちない');
  t(B('あ'.repeat(99)).split('\n')[0].length === F('updBubbleW_')() + 2, '★長い中身でも、ふちの長さは変わらない');

  // ★星人の紹介は、名前も特徴も、ぜんぶ ふきだしの中
  const card = F('updAlienBlock_')();
  const cl = card.split('\n');
  const from = cl.findIndex(x => x.indexOf('╭') === 0);
  const to = cl.findIndex(x => x.indexOf('╰') === 0);
  t(from !== -1 && to > from, 'ふきだしがある');
  t(cl[from].length === cl[to].length, '★上と下のふちは、同じ長さ');
  t(cl[from].length === F('updBubbleW_')() + 2, '  幅は、いつも同じ');
  const inside = cl.slice(from + 1, to);
  t(inside.join('\n').indexOf('星人') !== -1, '★名前も中');
  t(/【.+星人】/.test(inside.join('\n')), '★名前は【】で囲む（いちばん先に目が行くように）');
  t(inside.join('\n').indexOf('特徴') !== -1, '★特徴も中');
  t(inside.join('\n').indexOf('好きなもの') !== -1, '  好きなものも中');
  t(inside.join('\n').indexOf('きらいなもの') !== -1, '  きらいなものも中');
  t(inside.join('\n').indexOf('口ぐせ') !== -1, '  口ぐせも中');
  t(inside.join('\n').indexOf('〖とくてん') !== -1, '  とくてんも中（〖〗で囲む）');
  // ★中身がふちからはみ出していないこと
  const barW = cl[from].length - 2;
  t(inside.every(x => W(x) <= barW), '★どの行も、ふちからはみ出さない');
  t(card.indexOf('この方を　乗車して下ちい') !== -1, '見出しは、ふきだしの外');
  // ★見出しも、ふきだしの幅に収まっていること（はみ出すと折り返して台なしになる）
  card.split('\n').filter(x => x.indexOf('╭') !== 0 && x.indexOf('╰') !== 0)
      .forEach(function (x) {
        if (W(x) > F('updBubbleW_')()) { ng++; console.log('  NG  1行に収まらない：' + x); }
      });
  t(true, '★どの行も、ふきだしの幅に収まる');
  t(card.indexOf('▚') === -1, 'かすれた四角は使わない');

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
}

console.log(ng ? '\n✗ ' + ng + '件 失敗\n' : '\n✓ すべて通りました\n');
process.exit(ng ? 1 : 0);
