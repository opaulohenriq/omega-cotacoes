"use strict";

var CID = '74348086108-mhu984t8osii57p052q6dgarfolopbkj.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive.readonly profile email';
var tok = null, allFiles = [], cDB = {}, pDB = {}, nxt = 992, ic = 0, acI = -1, curFile = null, drawerMode = 'clientes';

function sf(id, v) { var e = document.getElementById(id); if (e) e.value = (v || ''); }
function gv(id) { var e = document.getElementById(id); return (e ? (e.value || '') : ''); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function br(n) { return Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fd(d) { if (!d) return '-'; var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function ini(s) { s = s.trim(); return s.length >= 2 ? (s[0] + s[1]).toUpperCase() : s[0].toUpperCase(); }

function saveL() {
  try { localStorage.setItem('ocdb', JSON.stringify(cDB)); localStorage.setItem('opdb', JSON.stringify(pDB)); localStorage.setItem('onum', String(nxt)); } catch(e) {}
}
function loadL() {
  try {
    var c = localStorage.getItem('ocdb'); if (c) cDB = JSON.parse(c);
    var p = localStorage.getItem('opdb'); if (p) pDB = JSON.parse(p);
    var n = localStorage.getItem('onum'); if (n) nxt = parseInt(n) || 992;
  } catch(e) {}
}

// WIRE BUTTONS
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-so').addEventListener('click', signOut);
document.getElementById('btn-sync').addEventListener('click', syncDrive);
document.getElementById('btn-addprod').addEventListener('click', openProds);
document.getElementById('btn-additem').addEventListener('click', function() { addItem(); });
document.getElementById('btn-pdf-cot').addEventListener('click', function() { genPDF('c'); });
document.getElementById('btn-pdf-ped').addEventListener('click', function() { genPDF('p'); });
document.getElementById('btn-msg').addEventListener('click', copyMsg);
document.getElementById('btn-view').addEventListener('click', function() { openView(''); });
document.getElementById('btn-nova').addEventListener('click', novaCot);
document.getElementById('btn-limpar').addEventListener('click', function() { limpar(false); });
document.getElementById('btn-vercots').addEventListener('click', function() {
  openView(document.getElementById('cli-banner').dataset.emp || '');
});
document.getElementById('btn-cli-clear').addEventListener('click', clearClient);
document.getElementById('btn-close-view').addEventListener('click', function() { document.getElementById('modal-view').classList.remove('open'); });
document.getElementById('btn-close-prods').addEventListener('click', function() { document.getElementById('modal-prods').classList.remove('open'); });
document.getElementById('btn-cancel-prods').addEventListener('click', function() { document.getElementById('modal-prods').classList.remove('open'); });
document.getElementById('btn-save-prods').addEventListener('click', saveProds);
document.getElementById('btn-addprow').addEventListener('click', addProw);
document.getElementById('btn-back').addEventListener('click', backToList);
document.getElementById('btn-editar').addEventListener('click', loadForEdit);
document.getElementById('vsearch').addEventListener('input', function() { renderVL(this.value); });
document.getElementById('btn-cnpj').addEventListener('click', buscarCNPJ);
document.getElementById('f-cnpj').addEventListener('input', function() { fmtC(this); });
document.getElementById('f-nome').addEventListener('input', function() { onNome(this.value); });
document.getElementById('d-search').addEventListener('input', function() { renderDrawer(this.value.toLowerCase()); });

// DRAWER
document.getElementById('btn-clientes').addEventListener('click', function() { openDrawer('clientes'); });
document.getElementById('btn-prods-hdr').addEventListener('click', function() { openDrawer('produtos'); });
document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);

function openDrawer(mode) {
  drawerMode = mode;
  document.getElementById('drawer-title').textContent = mode === 'clientes' ? 'Clientes' : 'Produtos';
  document.getElementById('d-search').value = '';
  document.getElementById('d-search').placeholder = mode === 'clientes' ? 'Buscar cliente...' : 'Buscar produto...';
  document.getElementById('btn-addprod').style.display = mode === 'produtos' ? 'inline-flex' : 'none';
  renderDrawer('');
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('d-search').focus();
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}

function renderDrawer(q) {
  var el = document.getElementById('dlist');
  if (drawerMode === 'clientes') {
    var groups = {};
    allFiles.forEach(function(f) {
      if (q && f.empresa.toLowerCase().indexOf(q) === -1 && f.num.indexOf(q) === -1) return;
      if (!groups[f.empresa]) groups[f.empresa] = [];
      groups[f.empresa].push(f);
    });
    var ents = Object.entries(groups);
    if (!ents.length) { el.innerHTML = '<div class="empty-state">Nenhum cliente encontrado</div>'; return; }
    el.innerHTML = ents.map(function(kv) {
      var emp = kv[0], its = kv[1], cd = cDB[emp];
      var hasData = cd && (cd.fone || cd.email);
      return '<div class="si" data-emp="' + esc(emp) + '">'
        + '<div class="si-av">' + ini(emp) + '</div>'
        + '<div class="si-info"><div class="si-name">' + emp + '</div>'
        + '<div class="si-meta">' + its.length + 'x &nbsp;·&nbsp; ult. ' + (its[0].ddmm || '-') + (hasData ? ' &nbsp;✓' : '') + '</div>'
        + '</div></div>';
    }).join('');
    el.querySelectorAll('.si[data-emp]').forEach(function(e) {
      e.addEventListener('click', function() { selCli(this, this.dataset.emp); closeDrawer(); });
    });
  } else {
    var prods = Object.entries(pDB).filter(function(kv) { return !q || kv[0].toLowerCase().indexOf(q) !== -1; });
    prods.sort(function(a, b) { return b[1].count - a[1].count; });
    if (!prods.length) { el.innerHTML = '<div class="empty-state">Nenhum produto cadastrado</div>'; return; }
    el.innerHTML = prods.map(function(kv) {
      var n = kv[0], d = kv[1];
      return '<div class="si" data-n="' + esc(n) + '" data-p="' + (d.preco || 0) + '" data-pz="' + esc(d.prazo || '') + '">'
        + '<div class="si-av" style="background:var(--green-dim);color:var(--green);">P</div>'
        + '<div class="si-info"><div class="si-name">' + n + '</div>'
        + '<div class="si-meta si-price">' + (d.preco > 0 ? 'R$ ' + br(d.preco) : 'sem preco') + (d.prazo ? ' · ' + d.prazo : '') + '</div>'
        + '</div></div>';
    }).join('');
    el.querySelectorAll('.si[data-n]').forEach(function(e) {
      e.addEventListener('click', function() {
        var p = parseFloat(this.dataset.p) || 0;
        addItem(this.dataset.n, '', p > 0 ? p : '', '', this.dataset.pz);
        closeDrawer();
        toast('Item adicionado', 'success');
      });
    });
  }
}

// AUTH
function signIn() {
  var btn = document.getElementById('btn-login');
  btn.disabled = true; btn.textContent = 'Aguarde...';
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.onload = function() {
    setTimeout(function() {
      try {
        var tc = google.accounts.oauth2.initTokenClient({
          client_id: CID, scope: SCOPES,
          callback: function(resp) {
            btn.disabled = false; btn.textContent = 'Entrar com Google';
            if (resp.error) { toast('Erro: ' + resp.error, 'error'); return; }
            tok = resp.access_token;
            getUI();
            document.getElementById('lscreen').style.display = 'none';
            document.getElementById('btn-so').style.display = 'flex';
            loadL(); syncDrive();
          }
        });
        tc.requestAccessToken({ prompt: 'select_account' });
      } catch(err) {
        btn.disabled = false; btn.textContent = 'Entrar com Google';
        toast('Erro: ' + err.message, 'error');
      }
    }, 500);
  };
  s.onerror = function() { btn.disabled = false; btn.textContent = 'Entrar com Google'; toast('Erro ao carregar Google', 'error'); };
  document.head.appendChild(s);
}

function signOut() {
  tok = null; allFiles = [];
  document.getElementById('lscreen').style.display = 'flex';
  document.getElementById('btn-so').style.display = 'none';
  document.getElementById('user-chip').style.display = 'none';
  document.getElementById('num-badge').style.display = 'none';
}

function getUI() {
  fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: 'Bearer ' + tok } })
    .then(function(r) { return r.json(); })
    .then(function(u) {
      document.getElementById('user-av').textContent = (u.name || u.email || 'U')[0].toUpperCase();
      document.getElementById('user-name').textContent = u.email;
      document.getElementById('user-chip').style.display = 'flex';
    }).catch(function() {});
}

// DRIVE
function setLoad(on) {
  document.getElementById('sync-sp').style.display = on ? 'inline-block' : 'none';
  var b = document.getElementById('lbar');
  b.style.width = on ? '70%' : '100%';
  if (!on) setTimeout(function() { b.style.width = '0'; }, 400);
}

function syncDrive() {
  if (!tok) return; setLoad(true);
  var q = encodeURIComponent("mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false");
  fetch('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name,webViewLink,modifiedTime)&pageSize=500&orderBy=name+desc', { headers: { Authorization: 'Bearer ' + tok } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      allFiles = (data.files || []).map(pF).filter(function(f) { return f.num; });
      var nums = allFiles.map(function(f) { return parseInt(f.num); }).filter(function(n) { return !isNaN(n); });
      if (nums.length) { var mx = Math.max.apply(null, nums); if (mx >= nxt) nxt = mx + 1; }
      sf('f-num', String(nxt));
      var nb = document.getElementById('num-badge');
      nb.textContent = 'Prox: N' + nxt; nb.style.display = 'inline-block';
      return rdFiles(allFiles.slice(0, 60));
    })
    .then(function() {
      saveL();
      toast(allFiles.length + ' cotacoes · ' + Object.keys(cDB).length + ' clientes · ' + Object.keys(pDB).length + ' produtos', 'success');
      setLoad(false);
    })
    .catch(function(e) { toast('Erro Drive: ' + e.message, 'error'); setLoad(false); });
}

function pF(f) {
  var n = f.name.replace(/\.xlsx$/i, '');
  var m = n.match(/^(\d+)\s+(.+?)\s+(\d{3,4})$/);
  return { id: f.id, raw: n, num: m ? m[1] : '', empresa: m ? m[2] : n, ddmm: m ? m[3] : '', link: f.webViewLink };
}

function rdFiles(files) {
  var seen = {}, tr = [];
  files.forEach(function(f) { if (!seen[f.empresa]) { seen[f.empresa] = true; tr.push(f); } });
  var ps = [];
  for (var i = 0; i < Math.min(tr.length, 25); i++) ps.push(rdOne(tr[i]));
  return Promise.all(ps);
}

function rdOne(fo) {
  return fetch('https://www.googleapis.com/drive/v3/files/' + fo.id + '?alt=media', { headers: { Authorization: 'Bearer ' + tok } })
    .then(function(r) { return r.ok ? r.arrayBuffer() : null; })
    .then(function(buf) {
      if (!buf) return;
      return pXlsx(buf).then(function(d) {
        if (!d) return;
        var emp = fo.empresa;
        if (!cDB[emp]) cDB[emp] = { cotacoes: [] };
        var cd = cDB[emp];
        if (d.nome && !cd.nome) cd.nome = d.nome;
        if (d.fone && !cd.fone) cd.fone = d.fone;
        if (d.email && !cd.email) cd.email = d.email;
        if (d.cidade && !cd.cidade) cd.cidade = d.cidade;
        if (d.comp && !cd.comp) cd.comp = d.comp;
        if (d.nfe && !cd.nfe) cd.nfe = d.nfe;
        if (d.bol && !cd.bol) cd.bol = d.bol;
        var ex = cd.cotacoes.find(function(c) { return c.num === fo.num; });
        if (!ex) cd.cotacoes.push({ num: fo.num, ddmm: fo.ddmm, id: fo.id, link: fo.link, itens: d.itens || [] });
        (d.itens || []).forEach(function(it) {
          if (!it.desc || it.desc.trim().length < 3) return;
          var k = it.desc.trim();
          if (!pDB[k]) pDB[k] = { preco: 0, prazo: '', count: 0 };
          if (it.preco > 0) pDB[k].preco = it.preco;
          pDB[k].count++;
        });
      });
    }).catch(function() {});
}

var ffL = null;
function loadFF() {
  if (ffL) return Promise.resolve(ffL);
  return new Promise(function(res, rej) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fflate/0.8.2/fflate.min.js';
    s.onload = function() { ffL = fflate; res(fflate); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

function pXlsx(buf) {
  return loadFF().then(function(fl) {
    try {
      var files = fl.unzipSync(new Uint8Array(buf));
      var keys = Object.keys(files);
      var ssK = keys.find(function(k) { return k.indexOf('sharedStrings') !== -1; });
      var shK = keys.find(function(k) { return k.match(/worksheets\/sheet2/) || k.match(/worksheets\/sheet1/); });
      if (!shK) return null;
      var dec = new TextDecoder();
      var shX = dec.decode(files[shK]);
      var ss = [];
      if (ssK) ss = pSS(dec.decode(files[ssK]));
      var cells = pCells(shX, ss);
      function g(r) { return cells[r] || ''; }
      var itens = [];
      for (var row = 16; row <= 33; row++) {
        var desc = g('C' + row), pr = parseFloat(g('D' + row)) || 0;
        if (desc && desc.trim().length > 2) itens.push({ qtde: g('B' + row), desc: desc.trim(), preco: pr });
      }
      return { nome: g('B11') || g('C11'), fone: g('D11') || g('E11'), email: g('D12') || g('E12'), cidade: g('B12') || g('C12'), comp: g('B13') || g('C13'), nfe: g('B14') || g('C14'), bol: g('D14') || g('E14'), itens: itens };
    } catch(e) { return null; }
  });
}

function pSS(xml) {
  var ss = [], re = /<si>([\s\S]*?)<\/si>/g, m;
  while ((m = re.exec(xml)) !== null) {
    var t = '', tr = /<t[^>]*>([\s\S]*?)<\/t>/g, tm;
    while ((tm = tr.exec(m[1])) !== null) t += tm[1];
    ss.push(t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  }
  return ss;
}

function pCells(xml, ss) {
  var c = {}, re = /<c r="([A-Z]+\d+)"[^>]*(?:t="([^"]*)")?[^>]*>[\s\S]*?(?:<v>([\s\S]*?)<\/v>)?[\s\S]*?<\/c>/g, m;
  while ((m = re.exec(xml)) !== null) {
    var ref = m[1], type = m[2], val = m[3] || '';
    if (type === 's') c[ref] = ss[parseInt(val)] || ''; else if (val) c[ref] = val;
  }
  return c;
}

// CLIENT
function selCli(el, emp) {
  document.querySelectorAll('.si').forEach(function(e) { e.classList.remove('active'); });
  if (el) el.classList.add('active');
  var cd = cDB[emp];
  sf('f-nome', emp);
  if (cd) {
    sf('f-fone', cd.fone || ''); sf('f-email', cd.email || '');
    sf('f-cidade', cd.cidade || ''); sf('f-comp', cd.comp || '');
    sf('f-nfe', cd.nfe || ''); sf('f-bol', cd.bol || '');
  }
  showBanner(emp, cd);
  toast('Cliente carregado', 'success');
}

function showBanner(emp, cd) {
  var banner = document.getElementById('cli-banner');
  document.getElementById('cli-av-ini').textContent = ini(emp);
  document.getElementById('cli-bn-name').textContent = emp;
  var cots = (cd && cd.cotacoes) ? cd.cotacoes : [];
  var detail = [];
  if (cd && cd.fone) detail.push(cd.fone);
  if (cd && cd.email) detail.push(cd.email);
  if (cots.length) detail.push(cots.length + ' cotacao(oes)');
  document.getElementById('cli-bn-detail').textContent = detail.join(' · ');
  banner.dataset.emp = emp;
  banner.classList.add('show');
  document.getElementById('btn-vercots').style.display = cots.length ? 'inline' : 'none';
  document.getElementById('btn-cli-clear').style.display = 'inline-flex';
}

function clearClient() {
  document.getElementById('cli-banner').classList.remove('show');
  document.getElementById('btn-vercots').style.display = 'none';
  document.getElementById('btn-cli-clear').style.display = 'none';
  ['f-cnpj','f-nome','f-fone','f-email','f-cidade','f-comp','f-nfe','f-bol'].forEach(function(id) { sf(id, ''); });
}

function onNome(val) {
  if (!val || val.length < 2) return;
  var m = Object.keys(cDB).find(function(k) { return k.toLowerCase() === val.toLowerCase(); });
  if (m && cDB[m]) {
    var cd = cDB[m];
    if (!gv('f-fone') && cd.fone) sf('f-fone', cd.fone);
    if (!gv('f-email') && cd.email) sf('f-email', cd.email);
    if (!gv('f-cidade') && cd.cidade) sf('f-cidade', cd.cidade);
    if (!gv('f-comp') && cd.comp) sf('f-comp', cd.comp);
    showBanner(m, cd);
  }
}

// CNPJ
function fmtC(inp) {
  var v = inp.value.replace(/\D/g, '');
  if (v.length > 14) v = v.slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  inp.value = v;
}

function buscarCNPJ() {
  var raw = gv('f-cnpj').replace(/\D/g, '');
  if (raw.length !== 14) { setSt('CNPJ invalido', 'err'); return; }
  var btn = document.getElementById('btn-cnpj');
  btn.disabled = true; btn.textContent = '...'; setSt('Buscando...', '');
  fetch('https://brasilapi.com.br/api/cnpj/v1/' + raw)
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(d) {
      var nome = d.razao_social || '', cidade = (d.municipio && d.uf) ? d.municipio + ' / ' + d.uf : '', email = d.email || '';
      sf('f-nome', nome); sf('f-cidade', cidade); sf('f-email', email);
      if (nome) {
        if (!cDB[nome]) cDB[nome] = { cotacoes: [] };
        Object.assign(cDB[nome], { cnpj: raw, cidade: cidade, email: email });
        saveL(); showBanner(nome, cDB[nome]);
      }
      setSt('Preenchido automaticamente', 'ok'); toast('CNPJ encontrado!', 'success');
    })
    .catch(function() { setSt('CNPJ nao encontrado', 'err'); })
    .finally(function() { btn.disabled = false; btn.textContent = 'Buscar'; });
}

function setSt(m, c) { var e = document.getElementById('cnpj-st'); e.textContent = m; e.className = c; }

// ITEMS
function addItem(desc, qtde, unit, dif, prazo) {
  desc = desc || ''; qtde = qtde || ''; unit = unit || ''; dif = dif || ''; prazo = prazo || '';
  var id = ++ic;
  var body = document.getElementById('ibody');
  var row = document.createElement('div');
  row.className = 'irow'; row.id = 'row-' + id;
  row.innerHTML =
    '<div class="irow-m">'
    + '<input type="number" min="0" placeholder="0" value="' + qtde + '" id="q-' + id + '">'
    + '<div class="dwrap"><input type="text" placeholder="Descricao do item" value="' + esc(desc) + '" id="d-' + id + '" autocomplete="off"><div class="acl" id="ac-' + id + '"></div></div>'
    + '<input type="text" placeholder="—" value="' + dif + '" id="dif-' + id + '" style="text-align:center">'
    + '<input type="text" placeholder="14 DDL" value="' + prazo + '" id="pz-' + id + '" style="text-align:center">'
    + '<input type="number" min="0" step="0.01" placeholder="0,00" value="' + unit + '" id="u-' + id + '" style="text-align:right">'
    + '<div class="itot zero" id="t-' + id + '">—</div>'
    + '<button class="rmb" data-id="' + id + '">&times;</button>'
    + '</div>'
    + '<div class="irow-x" id="x-' + id + '">'
    + '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px">Desenho Tecnico</div>'
    + '<div class="uwrap"><button class="btn btn-outline btn-xs">Anexar imagem / PDF</button><input type="file" accept="image/*,application/pdf" multiple data-id="' + id + '"></div>'
    + '<div class="iprev" id="imgs-' + id + '"></div></div>';
  body.appendChild(row);
  row.querySelector('#q-' + id).addEventListener('input', function() { cR(id); });
  row.querySelector('#u-' + id).addEventListener('input', function() { cR(id); });
  var di = row.querySelector('#d-' + id);
  di.addEventListener('input', function() { shAC(id, this.value); });
  di.addEventListener('blur', function() { setTimeout(function() { var a = document.getElementById('ac-' + id); if (a) a.classList.remove('open'); }, 150); });
  di.addEventListener('keydown', function(e) { acKey(e, id); });
  row.querySelector('.rmb').addEventListener('click', function() { var r = document.getElementById('row-' + this.dataset.id); if (r) r.remove(); cT(); });
  row.querySelector('input[type=file]').addEventListener('change', function() { hUp(this.dataset.id, this); });
  row.querySelector('.irow-m').addEventListener('dblclick', function() { document.getElementById('x-' + id).classList.toggle('show'); });
  cR(id);
  if (!desc) row.querySelector('#q-' + id).focus();
}

function hUp(id, inp) {
  var pv = document.getElementById('imgs-' + id); if (!pv) return;
  Array.from(inp.files).forEach(function(f) {
    if (f.type.startsWith('image/')) {
      var rd = new FileReader();
      rd.onload = function(e) {
        var d = document.createElement('div'); d.className = 'ithumb';
        d.innerHTML = '<img src="' + e.target.result + '" alt="img"><button class="xbtn">&times;</button>';
        d.querySelector('.xbtn').addEventListener('click', function() { d.remove(); });
        pv.appendChild(d);
      };
      rd.readAsDataURL(f);
    } else {
      var d = document.createElement('div'); d.className = 'pthumb';
      d.innerHTML = '&#128196; ' + f.name;
      var xb = document.createElement('button'); xb.className = 'btn btn-xs btn-danger'; xb.style.marginLeft = '6px'; xb.textContent = 'x';
      xb.addEventListener('click', function() { d.remove(); });
      d.appendChild(xb); pv.appendChild(d);
    }
  });
  document.getElementById('x-' + id).classList.add('show');
}

function cR(id) {
  var qEl = document.getElementById('q-' + id), uEl = document.getElementById('u-' + id);
  var q = qEl ? parseFloat(qEl.value) || 0 : 0, u = uEl ? parseFloat(uEl.value) || 0 : 0;
  var t = q * u, el = document.getElementById('t-' + id);
  if (el) { el.textContent = t > 0 ? 'R$ ' + br(t) : '—'; el.className = 'itot' + (t === 0 ? ' zero' : ''); }
  cT();
  var dn = document.getElementById('d-' + id);
  if (dn && u > 0 && pDB[dn.value]) { pDB[dn.value].preco = u; saveL(); }
}

function cT() {
  var s = 0;
  document.querySelectorAll('[id^="q-"]').forEach(function(el) {
    var id = el.id.replace('q-', ''), u = document.getElementById('u-' + id);
    s += (parseFloat(el.value) || 0) * (u ? parseFloat(u.value) || 0 : 0);
  });
  document.getElementById('gtotal').textContent = 'R$ ' + br(s);
}

// AUTOCOMPLETE
function shAC(id, val) {
  var list = document.getElementById('ac-' + id);
  if (!val || val.length < 1) { list.classList.remove('open'); return; }
  var ms = Object.entries(pDB).filter(function(kv) { return kv[0].toLowerCase().indexOf(val.toLowerCase()) !== -1; }).slice(0, 12);
  if (!ms.length) { list.classList.remove('open'); return; }
  acI = -1;
  list.innerHTML = ms.map(function(kv) {
    var n = kv[0], d = kv[1];
    return '<div class="aci" data-n="' + esc(n) + '" data-p="' + (d.preco || 0) + '" data-pz="' + esc(d.prazo || '') + '">'
      + '<span>' + n + '</span>' + (d.preco > 0 ? '<span class="acpr">R$ ' + br(d.preco) + '</span>' : '') + '</div>';
  }).join('');
  list.querySelectorAll('.aci').forEach(function(el) {
    el.addEventListener('mousedown', function() { pkAC(id, this.dataset.n, parseFloat(this.dataset.p) || 0, this.dataset.pz); });
  });
  list.classList.add('open');
}

function pkAC(id, n, p, pz) {
  var d = document.getElementById('d-' + id); if (d) d.value = n;
  if (p > 0) { var u = document.getElementById('u-' + id); if (u) u.value = p.toFixed(2); }
  if (pz) { var pzEl = document.getElementById('pz-' + id); if (pzEl) pzEl.value = pz; }
  var ac = document.getElementById('ac-' + id); if (ac) ac.classList.remove('open');
  cR(id); if (pDB[n]) pDB[n].count = (pDB[n].count || 0) + 1;
}

function acKey(e, id) {
  var list = document.getElementById('ac-' + id), items = list.querySelectorAll('.aci');
  if (e.key === 'ArrowDown') acI = Math.min(acI + 1, items.length - 1);
  else if (e.key === 'ArrowUp') acI = Math.max(acI - 1, 0);
  else if (e.key === 'Enter' && acI >= 0) { e.preventDefault(); items[acI].dispatchEvent(new MouseEvent('mousedown')); }
  items.forEach(function(el, i) { el.classList.toggle('sel', i === acI); });
}

// VIEW MODAL
function openView(q) {
  renderVL(q);
  document.getElementById('vlist').style.display = 'block';
  document.getElementById('vdetail').style.display = 'none';
  document.getElementById('vsearch').value = q;
  document.getElementById('modal-view').classList.add('open');
}

function renderVL(q) {
  q = q || '';
  var f = allFiles.filter(function(f) { return !q || f.empresa.toLowerCase().indexOf(q.toLowerCase()) !== -1 || f.num.indexOf(q) !== -1; });
  var el = document.getElementById('vlist');
  if (!f.length) { el.innerHTML = '<div class="empty-state">Nenhuma cotacao encontrada</div>'; return; }
  el.innerHTML = f.slice(0, 100).map(function(fi) {
    return '<div class="vitem" data-id="' + fi.id + '">'
      + '<div class="vitem-av">' + ini(fi.empresa) + '</div>'
      + '<div style="flex:1;min-width:0"><div class="vitem-t">' + fi.empresa + '</div><div class="vitem-m">Data: ' + (fi.ddmm || '-') + '</div></div>'
      + '<div class="vnum">N' + fi.num + '</div></div>';
  }).join('');
  el.querySelectorAll('.vitem').forEach(function(e) { e.addEventListener('click', function() { openVD(this.dataset.id); }); });
}

function openVD(fid) {
  var fo = allFiles.find(function(f) { return f.id === fid; }); if (!fo) return;
  curFile = fo;
  document.getElementById('vlist').style.display = 'none';
  document.getElementById('vdetail').style.display = 'block';
  document.getElementById('vd-title').textContent = fo.empresa + ' — N' + fo.num;
  document.getElementById('vd-link').href = fo.link || '#';
  var c = document.getElementById('vd-content');
  c.innerHTML = '<div style="color:var(--tx3);padding:20px;text-align:center">Carregando...</div>';
  fetch('https://www.googleapis.com/drive/v3/files/' + fid + '?alt=media', { headers: { Authorization: 'Bearer ' + tok } })
    .then(function(r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
    .then(function(buf) { return pXlsx(buf); })
    .then(function(d) {
      if (!d) { c.innerHTML = '<div style="color:var(--red)">Nao foi possivel ler o arquivo.</div>'; return; }
      var ih = (d.itens || []).map(function(it) {
        return '<tr style="border-bottom:1px solid var(--b2)">'
          + '<td style="padding:7px 8px;color:var(--tx2);width:50px">' + (it.qtde || '-') + '</td>'
          + '<td style="padding:7px 8px;font-weight:500">' + it.desc + '</td>'
          + '<td style="padding:7px 8px;text-align:right;font-family:var(--mono);color:var(--navy);font-weight:600">' + (it.preco > 0 ? 'R$ ' + br(it.preco) : '-') + '</td></tr>';
      }).join('');
      c.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px;padding:12px;background:var(--bg);border-radius:var(--r);font-size:13px">'
        + '<div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:2px">Nome</div><strong>' + (d.nome || fo.empresa) + '</strong></div>'
        + '<div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:2px">Telefone</div>' + (d.fone || '-') + '</div>'
        + '<div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:2px">Email</div>' + (d.email || '-') + '</div>'
        + '<div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:2px">Cidade</div>' + (d.cidade || '-') + '</div>'
        + '</div>'
        + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:400px">'
        + '<thead><tr style="background:var(--navy)"><th style="padding:7px 8px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase">Qtde</th>'
        + '<th style="padding:7px 8px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase">Descricao</th>'
        + '<th style="padding:7px 8px;text-align:right;font-size:10px;color:white;font-weight:700;text-transform:uppercase">Unitario</th></tr></thead>'
        + '<tbody>' + (ih || '<tr><td colspan="3" style="padding:12px;color:var(--tx3);text-align:center">Sem itens encontrados</td></tr>') + '</tbody></table></div>';
    }).catch(function() { c.innerHTML = '<div style="color:var(--red)">Erro ao carregar arquivo.</div>'; });
}

function backToList() {
  document.getElementById('vlist').style.display = 'block';
  document.getElementById('vdetail').style.display = 'none';
}

function loadForEdit() {
  if (!curFile) return;
  fetch('https://www.googleapis.com/drive/v3/files/' + curFile.id + '?alt=media', { headers: { Authorization: 'Bearer ' + tok } })
    .then(function(r) { return r.arrayBuffer(); })
    .then(function(b) { return pXlsx(b); })
    .then(function(d) {
      if (!d) { toast('Erro ao ler arquivo', 'error'); return; }
      limpar(true);
      sf('f-nome', d.nome || curFile.empresa); sf('f-fone', d.fone || '');
      sf('f-email', d.email || ''); sf('f-cidade', d.cidade || '');
      sf('f-comp', d.comp || ''); sf('f-nfe', d.nfe || ''); sf('f-bol', d.bol || '');
      (d.itens || []).forEach(function(it) { addItem(it.desc, it.qtde, it.preco > 0 ? it.preco : ''); });
      showBanner(d.nome || curFile.empresa, cDB[d.nome || curFile.empresa]);
      document.getElementById('modal-view').classList.remove('open');
      toast('Cotacao carregada para edicao', 'success');
    }).catch(function() { toast('Erro ao carregar', 'error'); });
}

// PRODUCTS
function openProds() { rProws(); document.getElementById('modal-prods').classList.add('open'); }

function rProws() {
  var el = document.getElementById('prows'), ents = Object.entries(pDB);
  if (!ents.length) { el.innerHTML = '<div style="color:var(--tx3);font-size:13px;padding:10px 0">Nenhum produto. Sincronize o Drive ou adicione manualmente.</div>'; return; }
  el.innerHTML = ents.map(function(kv, i) {
    return '<div class="prow" id="pr-' + i + '">'
      + '<input type="text" value="' + esc(kv[0]) + '" id="pn-' + i + '" placeholder="Nome">'
      + '<input type="number" value="' + (kv[1].preco || '') + '" id="pp-' + i + '" placeholder="0,00" step="0.01">'
      + '<input type="text" value="' + esc(kv[1].prazo || '') + '" id="ppz-' + i + '" placeholder="14 DDL">'
      + '<button class="rmb" data-k="' + esc(kv[0]) + '" data-r="pr-' + i + '">&times;</button></div>';
  }).join('');
  el.querySelectorAll('.rmb').forEach(function(b) {
    b.addEventListener('click', function() { delete pDB[this.dataset.k]; var r = document.getElementById(this.dataset.r); if (r) r.remove(); });
  });
}

function addProw() {
  var id = 'np-' + Date.now(), el = document.getElementById('prows');
  var d = document.createElement('div'); d.className = 'prow'; d.id = id;
  d.innerHTML = '<input type="text" id="pn-' + id + '" placeholder="Nome"><input type="number" id="pp-' + id + '" placeholder="0,00" step="0.01"><input type="text" id="ppz-' + id + '" placeholder="14 DDL"><button class="rmb">&times;</button>';
  d.querySelector('.rmb').addEventListener('click', function() { d.remove(); });
  el.appendChild(d); d.querySelector('input').focus();
}

function saveProds() {
  var nb = {};
  document.querySelectorAll('.prow').forEach(function(row) {
    var ins = row.querySelectorAll('input');
    var n = ins[0].value.trim(), p = parseFloat(ins[1].value) || 0, pz = ins[2].value.trim();
    if (n) nb[n] = { preco: p, prazo: pz, count: pDB[n] ? pDB[n].count || 0 : 0 };
  });
  pDB = nb; saveL();
  document.getElementById('modal-prods').classList.remove('open');
  toast('Banco de produtos salvo!', 'success');
}

// PDF
function gRows() {
  var rows = [];
  document.querySelectorAll('[id^="q-"]').forEach(function(el) {
    var id = el.id.replace('q-', '');
    var q = el.value, d = gv('d-' + id), dif = gv('dif-' + id), pz = gv('pz-' + id);
    var u = parseFloat(gv('u-' + id)) || 0, t = (parseFloat(q) || 0) * u;
    var imgs = [];
    document.querySelectorAll('#imgs-' + id + ' .ithumb img').forEach(function(i) { imgs.push(i.src); });
    if (q || d) rows.push({ q: q, d: d, dif: dif, pz: pz, u: u, t: t, imgs: imgs });
  });
  return rows;
}

function i2d(src, cb) {
  var img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = function() { var cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); cb(cv.toDataURL('image/png')); };
  img.onerror = function() { cb(src); };
  img.src = src;
}

function genPDF(tipo) {
  var num = gv('f-num'), dt = fd(gv('f-data')), vl = fd(gv('f-val'));
  var nome = gv('f-nome'), fone = gv('f-fone'), email = gv('f-email'), cid = gv('f-cidade');
  var comp = gv('f-comp'), vend = gv('f-vend'), nfe = gv('f-nfe'), bol = gv('f-bol');
  var prazo = gv('f-prazo'), frete = gv('f-frete'), final = gv('f-final');
  var pcn = gv('f-pcn'), pcc = gv('f-pcc');
  var rows = gRows(), tot = 0; rows.forEach(function(r) { tot += r.t; });
  var isC = tipo === 'c';

  i2d('logo.png', function(logoD) {
    i2d('mola.png', function(molaD) {
      i2d('banco.png', function(bancoD) {

        var rH = rows.map(function(r, idx) {
          return '<tr style="' + (idx % 2 === 1 ? 'background:#F8F7F4' : '') + '">'
            + '<td style="padding:6px 8px;border-bottom:1px solid #E8E6E0;text-align:center;font-size:11px">' + r.q + '</td>'
            + '<td style="padding:6px 8px;border-bottom:1px solid #E8E6E0;font-size:11px">'
            + r.d + (r.imgs.length ? '<br><img src="' + r.imgs[0] + '" style="max-width:70px;max-height:55px;margin-top:4px;border-radius:4px;border:1px solid #ddd">' : '')
            + '</td>'
            + (isC ? '<td style="padding:6px 8px;border-bottom:1px solid #E8E6E0;text-align:center;font-size:11px;color:#888">' + (r.dif || '—') + '</td>' : '')
            + '<td style="padding:6px 8px;border-bottom:1px solid #E8E6E0;text-align:center;font-size:10px;color:#555">' + (r.pz || prazo) + '</td>'
            + '<td style="padding:6px 8px;border-bottom:1px solid #E8E6E0;text-align:right;font-size:11px">R$ ' + br(r.u) + '</td>'
            + '<td style="padding:6px 8px;border-bottom:1px solid #E8E6E0;text-align:right;font-size:11px;font-weight:700;color:#1a3a6b">R$ ' + br(r.t) + '</td>'
            + '</tr>';
        }).join('');

        var pcSec = (!isC && (pcn || pcc))
          ? '<div style="background:#e8eef8;border:1px solid #85B7EB;border-radius:4px;padding:8px 12px;margin-bottom:12px;font-size:10px">'
            + (pcn ? '<strong>Pedido Omega:</strong> ' + pcn + '&nbsp;&nbsp;&nbsp;' : '')
            + (pcc ? '<strong>Ped. Cliente:</strong> ' + pcc : '') + '</div>' : '';

        var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
          + '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
          + '<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Inter,Arial,sans-serif;font-size:11px;color:#1a1a1a;}</style></head><body>'
          + '<div style="padding:20px 24px;">'

          // Top bar
          + '<div style="height:5px;background:#1a3a6b;border-radius:3px 3px 0 0;margin-bottom:0"></div>'

          // Header
          + '<div style="display:flex;align-items:center;gap:14px;padding:14px 0 12px;border-bottom:2px solid #1a3a6b;margin-bottom:14px">'
          + '<img src="' + logoD + '" style="width:56px;height:56px;object-fit:contain;border-radius:6px">'
          + '<div style="flex:1">'
          + '<div style="font-size:13px;font-weight:700;color:#1a3a6b">Omega Elementos Para Ferramentaria LTDA</div>'
          + '<div style="font-size:9px;color:#666;margin-top:2px">Rua Cabreuva, 125 - Leocadia · Sorocaba SP · CEP 18085-340</div>'
          + '<div style="font-size:9px;color:#666">(11) 9 8573-9784 · (15) 3346-7164 · paulo@omegafix.com.br</div>'
          + '<div style="font-size:9px;color:#666">CNPJ: 11.551.105/0001-55 · Insc. Est.: 370.132.600.111</div>'
          + '</div>'
          + '<div style="background:#1a3a6b;color:white;border-radius:8px;padding:10px 14px;text-align:center;min-width:84px">'
          + '<div style="font-size:8px;font-weight:600;color:#85B7EB;text-transform:uppercase;letter-spacing:1px">' + (isC ? 'Orcamento' : 'Ped.Compra') + '</div>'
          + '<div style="font-size:24px;font-weight:700;font-family:monospace;line-height:1.2;margin-top:2px">' + num + '</div>'
          + '</div>'
          + '<div style="opacity:.08;position:absolute;right:20px;top:14px;"><img src="' + molaD + '" style="width:70px"></div>'
          + '</div>'

          + pcSec

          // 2 columns: cliente + condicoes
          + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'
          + '<div style="background:#F8F7F4;border-radius:6px;padding:10px 12px">'
          + '<div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Cliente</div>'
          + '<div style="font-size:13px;font-weight:700;color:#1a3a6b;margin-bottom:3px">' + nome + '</div>'
          + (gv('f-cnpj') ? '<div style="font-size:9px;color:#666">CNPJ: ' + gv('f-cnpj') + '</div>' : '')
          + (fone ? '<div style="font-size:9px;color:#666">' + fone + '</div>' : '')
          + (email ? '<div style="font-size:9px;color:#666">' + email + '</div>' : '')
          + (cid ? '<div style="font-size:9px;color:#666">' + cid + '</div>' : '')
          + (comp ? '<div style="font-size:9px;color:#333;margin-top:3px">Comprador: <strong>' + comp + '</strong></div>' : '')
          + (vend ? '<div style="font-size:9px;color:#333">Vendedor: <strong>' + vend + '</strong></div>' : '')
          + '</div>'
          + '<div style="background:#F8F7F4;border-radius:6px;padding:10px 12px">'
          + '<div style="font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Condicoes</div>'
          + '<div style="font-size:9px;color:#555;line-height:2">'
          + '<div><strong>Data:</strong> ' + dt + ' &nbsp;·&nbsp; <strong>Validade:</strong> ' + vl + '</div>'
          + '<div><strong>Faturamento:</strong> ' + prazo + '</div>'
          + '<div><strong>Frete:</strong> ' + frete + '</div>'
          + '<div><strong>Finalidade:</strong> ' + final + '</div>'
          + (nfe ? '<div><strong>Email NF-e:</strong> ' + nfe + '</div>' : '')
          + (bol ? '<div><strong>Email Bol.:</strong> ' + bol + '</div>' : '')
          + '</div></div></div>'

          // Table
          + '<table style="width:100%;border-collapse:collapse;margin-bottom:10px">'
          + '<thead><tr style="background:#1a3a6b">'
          + '<th style="padding:7px 8px;text-align:center;font-size:9px;font-weight:700;color:white;text-transform:uppercase;width:40px">Qtde</th>'
          + '<th style="padding:7px 8px;text-align:left;font-size:9px;font-weight:700;color:white;text-transform:uppercase">Descricao</th>'
          + (isC ? '<th style="padding:7px 8px;text-align:center;font-size:9px;font-weight:700;color:white;text-transform:uppercase;width:65px">Dif.Aliq.</th>' : '')
          + '<th style="padding:7px 8px;text-align:center;font-size:9px;font-weight:700;color:white;text-transform:uppercase;width:65px">Prazo</th>'
          + '<th style="padding:7px 8px;text-align:right;font-size:9px;font-weight:700;color:white;text-transform:uppercase;width:80px">Unitario</th>'
          + '<th style="padding:7px 8px;text-align:right;font-size:9px;font-weight:700;color:white;text-transform:uppercase;width:80px">Total</th>'
          + '</tr></thead><tbody>' + rH
          + '<tr style="background:#1a3a6b">'
          + '<td colspan="' + (isC ? 5 : 4) + '" style="padding:7px 10px;text-align:right;font-size:10px;font-weight:700;color:#85B7EB">VALOR TOTAL DOS PRODUTOS:</td>'
          + '<td style="padding:7px 10px;text-align:right;font-size:15px;font-weight:700;color:white;font-family:monospace">R$ ' + br(tot) + '</td>'
          + '</tr></tbody></table>'

          // Notes
          + '<div style="font-size:8px;color:#888;margin-bottom:10px;line-height:1.8">'
          + 'Faturamento minimo: R$ 400,00 / 14 dias (sem frete) &nbsp;·&nbsp; Valor minimo NF: R$ 150,00 &nbsp;·&nbsp; Optante pelo Simples Nacional'
          + '</div>'

          // Dados bancarios
          + (isC
            ? '<div style="background:#EAF3DE;border:1px solid #C0DD97;border-radius:6px;padding:10px 14px;display:flex;align-items:center;gap:16px">'
              + '<div style="flex:1">'
              + '<div style="font-size:8px;font-weight:700;color:#3B6D11;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Dados Bancarios — Banco do Brasil</div>'
              + '<div style="font-size:9px;color:#555;font-weight:600">Omega Elementos Para Ferramentaria LTDA · CNPJ: 11.551.105/0001-55</div>'
              + '<div style="font-size:9px;color:#555">AG: 2168-7 &nbsp;·&nbsp; C/C: 66936-9 &nbsp;·&nbsp; PIX: 11.551.105/0001-55</div>'
              + '</div>'
              + '<img src="' + bancoD + '" style="height:40px;object-fit:contain">'
              + '</div>'
            : '')

          // Bottom bar
          + '<div style="height:5px;background:#1a3a6b;border-radius:0 0 3px 3px;margin-top:14px"></div>'
          + '</div></body></html>';

        var w = window.open('', '_blank');
        if (!w) { toast('Permita popups para gerar PDF', 'error'); return; }
        w.document.write(html); w.document.close();
        setTimeout(function() { w.print(); }, 800);
        if (isC) { nxt++; sf('f-num', String(nxt)); document.getElementById('num-badge').textContent = 'Prox: N' + nxt; saveL(); }
      });
    });
  });
}

function copyMsg() {
  var msg = 'Ola! Segue em anexo o orcamento n' + gv('f-num') + ' conforme solicitado.\n\nTotal: '
    + document.getElementById('gtotal').textContent + '\nPrazo: ' + gv('f-prazo') + ' | Frete: ' + gv('f-frete')
    + '\n\nQualquer duvida estamos a disposicao!\n\nAtt.,\nPaulo Henrique\nOmega Fix - (15) 3346-7164\nPIX: 11.551.105/0001-55';
  navigator.clipboard.writeText(msg).then(function() { toast('Mensagem copiada!', 'success'); });
}

function novaCot() { limpar(true); toast('Nova cotacao — N' + nxt, 'success'); }

function limpar(silent) {
  if (!silent && !confirm('Limpar todos os campos?')) return;
  ['f-cnpj','f-nome','f-fone','f-email','f-cidade','f-comp','f-nfe','f-bol','f-pcn','f-pcc'].forEach(function(id) { sf(id, ''); });
  document.getElementById('ibody').innerHTML = '';
  document.getElementById('cli-banner').classList.remove('show');
  document.getElementById('btn-vercots').style.display = 'none';
  document.getElementById('btn-cli-clear').style.display = 'none';
  document.getElementById('cnpj-st').textContent = '';
  document.getElementById('gtotal').textContent = 'R$ 0,00';
  ic = 0; setDef();
}

var tt;
function toast(msg, type) {
  var el = document.getElementById('toast'); el.textContent = msg; el.className = 'show ' + (type || 'info');
  clearTimeout(tt); tt = setTimeout(function() { el.className = ''; }, 3500);
}

function setDef() {
  var t = new Date(), p = function(d) { return d.toISOString().split('T')[0]; }, v = new Date(t);
  v.setDate(v.getDate() + 15);
  sf('f-data', p(t)); sf('f-val', p(v)); sf('f-num', String(nxt));
  addItem(); addItem(); addItem();
}

loadL();
setDef();
