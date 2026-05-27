"use strict";


var CID = '74348086108-mhu984t8osii57p052q6dgarfolopbkj.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive.readonly profile email';
var tok = null, allFiles = [], cDB = {}, pDB = {}, nxt = 992, ic = 0, acI = -1, curTab = 'clientes', curFile = null;

//  HELPERS 
function sf(id,v){var e=document.getElementById(id);if(e)e.value=(v||'');}
function gv(id){var e=document.getElementById(id);return (e ? (e.value || '') : '');}
function saveL(){try{localStorage.setItem('ocdb',JSON.stringify(cDB));localStorage.setItem('opdb',JSON.stringify(pDB));localStorage.setItem('onum',String(nxt));}catch(e){}}
function loadL(){try{var c=localStorage.getItem('ocdb');if(c)cDB=JSON.parse(c);var p=localStorage.getItem('opdb');if(p)pDB=JSON.parse(p);var n=localStorage.getItem('onum');if(n)nxt=parseInt(n)||992;}catch(e){}}
function enc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function br(n){return Number(n).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function fd(d){if(!d)return'-';var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0];}

//  WIRE BUTTONS 
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-so').addEventListener('click', signOut);
document.getElementById('btn-sync').addEventListener('click', syncDrive);
document.getElementById('btn-addprod').addEventListener('click', openProds);
document.getElementById('btn-additem').addEventListener('click', function(){addItem();});
document.getElementById('btn-pdf-cot').addEventListener('click', function(){genPDF('c');});
document.getElementById('btn-pdf-ped').addEventListener('click', function(){genPDF('p');});
document.getElementById('btn-msg').addEventListener('click', copyMsg);
document.getElementById('btn-view').addEventListener('click', function(){openView('');});
document.getElementById('btn-nova').addEventListener('click', novaCot);
document.getElementById('btn-limpar').addEventListener('click', function(){limpar(false);});
document.getElementById('btn-vercots').addEventListener('click', function(){openView(document.getElementById('hbanner').dataset.emp||'');});
document.getElementById('btn-close-view').addEventListener('click', function(){document.getElementById('modal-view').classList.remove('open');});
document.getElementById('btn-close-prods').addEventListener('click', function(){document.getElementById('modal-prods').classList.remove('open');});
document.getElementById('btn-cancel-prods').addEventListener('click', function(){document.getElementById('modal-prods').classList.remove('open');});
document.getElementById('btn-save-prods').addEventListener('click', saveProds);
document.getElementById('btn-addprow').addEventListener('click', addProw);
document.getElementById('btn-back').addEventListener('click', backToList);
document.getElementById('btn-editar').addEventListener('click', loadForEdit);
document.getElementById('tab-cli').addEventListener('click', function(){switchTab('clientes');});
document.getElementById('tab-cot').addEventListener('click', function(){switchTab('cotacoes');});
document.getElementById('tab-prod').addEventListener('click', function(){switchTab('produtos');});
document.getElementById('s-search').addEventListener('input', function(){renderSB(this.value.toLowerCase());});
document.getElementById('vsearch').addEventListener('input', function(){renderVL(this.value);});
document.getElementById('btn-cnpj').addEventListener('click', buscarCNPJ);
document.getElementById('f-cnpj').addEventListener('input', function(){fmtC(this);});
document.getElementById('f-nome').addEventListener('input', function(){onNome(this.value);});

//  AUTH 
function signIn(){
  var btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Aguarde...';
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.onload = function(){
    setTimeout(function(){
      try {
        var tc = google.accounts.oauth2.initTokenClient({
          client_id: CID,
          scope: SCOPES,
          callback: function(resp){
            btn.disabled = false;
            btn.textContent = 'Entrar com Google';
            if(resp.error){ toast('Erro: '+resp.error,'error'); return; }
            tok = resp.access_token;
            getUI();
            document.getElementById('lscreen').style.display = 'none';
            document.getElementById('btn-so').style.display = 'flex';
            loadL();
            syncDrive();
          }
        });
        tc.requestAccessToken({prompt:'select_account'});
      } catch(err){
        btn.disabled = false;
        btn.textContent = 'Entrar com Google';
        toast('Erro ao inicializar Google: ' + err.message, 'error');
      }
    }, 500);
  };
  s.onerror = function(){
    btn.disabled = false;
    btn.textContent = 'Entrar com Google';
    toast('Falha ao carregar Google. Verifique sua conexao.','error');
  };
  document.head.appendChild(s);
}

function signOut(){
  tok=null; allFiles=[];
  document.getElementById('lscreen').style.display='flex';
  document.getElementById('btn-so').style.display='none';
  document.getElementById('user-chip').style.display='none';
  document.getElementById('num-badge').style.display='none';
  renderSB('');
}

function getUI(){
  fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+tok}})
  .then(function(r){return r.json();})
  .then(function(u){
    document.getElementById('user-av').textContent=(u.name||u.email||'U')[0].toUpperCase();
    document.getElementById('user-name').textContent=u.email;
    document.getElementById('user-chip').style.display='flex';
  }).catch(function(){});
}

//  DRIVE 
function setLoad(on){
  document.getElementById('sync-sp').style.display=on?'inline-block':'none';
  var b=document.getElementById('lbar');
  b.style.width=on?'70%':'100%';
  if(!on) setTimeout(function(){b.style.width='0';},400);
}

function syncDrive(){
  if(!tok) return;
  setLoad(true);
  var q=encodeURIComponent("mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false");
  fetch('https://www.googleapis.com/drive/v3/files?q='+q+'&fields=files(id,name,webViewLink,modifiedTime)&pageSize=500&orderBy=name+desc',
    {headers:{Authorization:'Bearer '+tok}})
  .then(function(r){return r.json();})
  .then(function(data){
    allFiles=(data.files||[]).map(pF).filter(function(f){return f.num;});
    var nums=allFiles.map(function(f){return parseInt(f.num);}).filter(function(n){return!isNaN(n);});
    if(nums.length){var mx=Math.max.apply(null,nums);if(mx>=nxt)nxt=mx+1;}
    sf('f-num',String(nxt));
    var nb=document.getElementById('num-badge');
    nb.textContent='Proximo: N'+nxt; nb.style.display='inline-block';
    return rdFiles(allFiles.slice(0,60));
  })
  .then(function(){
    saveL(); renderSB('');
    toast(allFiles.length+' cotacoes | '+Object.keys(cDB).length+' clientes | '+Object.keys(pDB).length+' produtos','success');
    setLoad(false);
  })
  .catch(function(e){toast('Erro: '+e.message,'error');setLoad(false);});
}

function pF(f){
  var n=f.name.replace(/\.xlsx$/i,'');
  var m=n.match(/^(\d+)\s+(.+?)\s+(\d{3,4})$/);
  return{id:f.id,raw:n,num:m?m[1]:'',empresa:m?m[2]:n,ddmm:m?m[3]:'',link:f.webViewLink};
}

function rdFiles(files){
  var seen={};var tr=[];
  files.forEach(function(f){if(!seen[f.empresa]){seen[f.empresa]=true;tr.push(f);}});
  var ps=[];
  for(var i=0;i<Math.min(tr.length,25);i++) ps.push(rdOne(tr[i]));
  return Promise.all(ps);
}

function rdOne(fo){
  return fetch('https://www.googleapis.com/drive/v3/files/'+fo.id+'?alt=media',{headers:{Authorization:'Bearer '+tok}})
  .then(function(r){return r.ok?r.arrayBuffer():null;})
  .then(function(buf){
    if(!buf) return;
    return pXlsx(buf).then(function(d){
      if(!d) return;
      var emp=fo.empresa;
      if(!cDB[emp]) cDB[emp]={cotacoes:[]};
      var cd=cDB[emp];
      if(d.nome&&!cd.nome) cd.nome=d.nome;
      if(d.fone&&!cd.fone) cd.fone=d.fone;
      if(d.email&&!cd.email) cd.email=d.email;
      if(d.cidade&&!cd.cidade) cd.cidade=d.cidade;
      if(d.comp&&!cd.comp) cd.comp=d.comp;
      if(d.nfe&&!cd.nfe) cd.nfe=d.nfe;
      if(d.bol&&!cd.bol) cd.bol=d.bol;
      var ex=cd.cotacoes.find(function(c){return c.num===fo.num;});
      if(!ex) cd.cotacoes.push({num:fo.num,ddmm:fo.ddmm,id:fo.id,link:fo.link,itens:d.itens||[]});
      (d.itens||[]).forEach(function(it){
        if(!it.desc||it.desc.trim().length<3) return;
        var k=it.desc.trim();
        if(!pDB[k]) pDB[k]={preco:0,prazo:'',count:0};
        if(it.preco>0) pDB[k].preco=it.preco;
        pDB[k].count++;
      });
    });
  }).catch(function(){});
}

var ffL=null;
function loadFF(){
  if(ffL) return Promise.resolve(ffL);
  return new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/fflate/0.8.2/fflate.min.js';
    s.onload=function(){ffL=fflate;res(fflate);};
    s.onerror=rej;
    document.head.appendChild(s);
  });
}

function pXlsx(buf){
  return loadFF().then(function(fl){
    try{
      var files=fl.unzipSync(new Uint8Array(buf));
      var keys=Object.keys(files);
      var ssK=keys.find(function(k){return k.indexOf('sharedStrings')!==-1;});
      var shK=keys.find(function(k){return k.match(/worksheets\/sheet2/)||k.match(/worksheets\/sheet1/);});
      if(!shK) return null;
      var dec=new TextDecoder();
      var shX=dec.decode(files[shK]);
      var ss=[]; if(ssK) ss=pSS(dec.decode(files[ssK]));
      var cells=pCells(shX,ss);
      function g(r){return cells[r]||'';}
      var itens=[];
      for(var row=16;row<=33;row++){
        var desc=g('C'+row); var pr=parseFloat(g('D'+row))||0;
        if(desc&&desc.trim().length>2) itens.push({qtde:g('B'+row),desc:desc.trim(),preco:pr});
      }
      return{nome:g('B11')||g('C11'),fone:g('D11')||g('E11'),email:g('D12')||g('E12'),
             cidade:g('B12')||g('C12'),comp:g('B13')||g('C13'),nfe:g('B14')||g('C14'),
             bol:g('D14')||g('E14'),itens:itens};
    }catch(e){return null;}
  });
}

function pSS(xml){
  var ss=[];var re=/<si>([\s\S]*?)<\/si>/g;var m;
  while((m=re.exec(xml))!==null){
    var t='';var tr=/<t[^>]*>([\s\S]*?)<\/t>/g;var tm;
    while((tm=tr.exec(m[1]))!==null) t+=tm[1];
    ss.push(t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
  }
  return ss;
}

function pCells(xml,ss){
  var c={};
  var re=/<c r="([A-Z]+\d+)"[^>]*(?:t="([^"]*)")?[^>]*>[\s\S]*?(?:<v>([\s\S]*?)<\/v>)?[\s\S]*?<\/c>/g;
  var m;
  while((m=re.exec(xml))!==null){
    var ref=m[1],type=m[2],val=m[3]||'';
    if(type==='s') c[ref]=ss[parseInt(val)]||'';
    else if(val) c[ref]=val;
  }
  return c;
}

//  SIDEBAR 
function switchTab(t){
  curTab=t;
  document.getElementById('tab-cli').classList.toggle('active',t==='clientes');
  document.getElementById('tab-cot').classList.toggle('active',t==='cotacoes');
  document.getElementById('tab-prod').classList.toggle('active',t==='produtos');
  document.getElementById('s-search').value='';
  renderSB('');
}

function renderSB(q){
  var el=document.getElementById('slist');
  if(curTab==='clientes'){
    var grps={};
    allFiles.forEach(function(f){
      if(q&&f.empresa.toLowerCase().indexOf(q)===-1&&f.num.indexOf(q)===-1) return;
      if(!grps[f.empresa]) grps[f.empresa]=[];
      grps[f.empresa].push(f);
    });
    var ents=Object.entries(grps);
    if(!ents.length){el.innerHTML='<div class="empty">Nenhum cliente</div>';return;}
    el.innerHTML=ents.map(function(kv){
      var emp=kv[0],its=kv[1];var cd=cDB[emp];var hd=cd&&(cd.fone||cd.email);
      return '<div class="si" data-emp="'+enc(emp)+'">'
        +'<div class="si-name">'+emp+'</div>'
        +'<div class="si-meta"><span class="badge">'+its.length+'x</span>'
        +'<span>ult: '+(its[0].ddmm||'-')+'</span>'
        +(hd?'<span class="badge badge-blue">dados</span>':'')
        +'</div></div>';
    }).join('');
    el.querySelectorAll('.si').forEach(function(e){e.addEventListener('click',function(){selCli(this,this.dataset.emp);});});
  } else if(curTab==='cotacoes'){
    var filt=allFiles.filter(function(f){return!q||f.empresa.toLowerCase().indexOf(q)!==-1||f.num.indexOf(q)!==-1;});
    if(!filt.length){el.innerHTML='<div class="empty">Nenhuma cotacao</div>';return;}
    el.innerHTML=filt.map(function(f){
      return '<div class="si" data-id="'+f.id+'">'
        +'<div class="si-name">N'+f.num+' - '+f.empresa+'</div>'
        +'<div class="si-meta"><span class="badge badge-or">'+(f.ddmm||'-')+'</span></div></div>';
    }).join('');
    el.querySelectorAll('.si').forEach(function(e){e.addEventListener('click',function(){openVD(this.dataset.id);});});
  } else {
    var prods=Object.entries(pDB).filter(function(kv){return!q||kv[0].toLowerCase().indexOf(q)!==-1;});
    if(!prods.length){el.innerHTML='<div class="empty">Nenhum produto</div>';return;}
    prods.sort(function(a,b){return b[1].count-a[1].count;});
    el.innerHTML=prods.map(function(kv){
      var n=kv[0],d=kv[1];
      return '<div class="si" data-n="'+enc(n)+'" data-p="'+(d.preco||0)+'" data-pz="'+enc(d.prazo||'')+'">'
        +'<div class="si-name">'+n+'</div>'
        +'<div class="si-meta">'
        +'<span style="color:var(--accent);font-family:DM Mono,monospace">'+(d.preco>0?'R$ '+br(d.preco):'sem preco')+'</span>'
        +'<span>'+(d.prazo||'')+'</span>'
        +'<span class="badge">'+d.count+'x</span></div></div>';
    }).join('');
    el.querySelectorAll('.si').forEach(function(e){
      e.addEventListener('click',function(){addItem(this.dataset.n,'',(parseFloat(this.dataset.p)||0)>0?parseFloat(this.dataset.p):'','',this.dataset.pz);});
    });
  }
}

function selCli(el,emp){
  document.querySelectorAll('.si').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
  var cd=cDB[emp]; sf('f-nome',emp);
  if(cd){
    sf('f-fone',cd.fone||''); sf('f-email',cd.email||''); sf('f-cidade',cd.cidade||'');
    sf('f-comp',cd.comp||''); sf('f-nfe',cd.nfe||''); sf('f-bol',cd.bol||'');
    var cots=cd.cotacoes||[];
    var bn=document.getElementById('hbanner');
    document.getElementById('hbanner-txt').innerHTML='<strong>'+cots.length+' cotacao(oes)</strong>  ult: '+(cots[0]?cots[0].ddmm:'-');
    bn.dataset.emp=emp; bn.classList.add('show');
  }
  toast('Cliente carregado','success');
}

function onNome(val){
  if(!val||val.length<2) return;
  var m=Object.keys(cDB).find(function(k){return k.toLowerCase()===val.toLowerCase();});
  if(m&&cDB[m]){
    var cd=cDB[m];
    if(!gv('f-fone')&&cd.fone) sf('f-fone',cd.fone);
    if(!gv('f-email')&&cd.email) sf('f-email',cd.email);
    if(!gv('f-cidade')&&cd.cidade) sf('f-cidade',cd.cidade);
    if(!gv('f-comp')&&cd.comp) sf('f-comp',cd.comp);
  }
}

//  CNPJ 
function fmtC(inp){
  var v=inp.value.replace(/\D/g,'');
  if(v.length>14) v=v.slice(0,14);
  v=v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
     .replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
  inp.value=v;
}

function buscarCNPJ(){
  var raw=gv('f-cnpj').replace(/\D/g,'');
  if(raw.length!==14){setSt('CNPJ invalido (14 digitos)','err');return;}
  var btn=document.getElementById('btn-cnpj'); btn.disabled=true; btn.textContent='...';
  setSt('Buscando...','');
  fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw)
  .then(function(r){if(!r.ok)throw new Error();return r.json();})
  .then(function(d){
    var nome=d.razao_social||'',cidade=(d.municipio&&d.uf)?d.municipio+' / '+d.uf:'',email=d.email||'';
    sf('f-nome',nome); sf('f-cidade',cidade); sf('f-email',email);
    if(nome){if(!cDB[nome])cDB[nome]={cotacoes:[]};Object.assign(cDB[nome],{cnpj:raw,cidade:cidade,email:email});saveL();}
    setSt('Preenchido automaticamente','ok'); toast('CNPJ encontrado!','success');
  })
  .catch(function(){setSt('CNPJ nao encontrado','err');})
  .finally(function(){btn.disabled=false;btn.textContent='Buscar';});
}

function setSt(m,c){var e=document.getElementById('cnpj-st');e.textContent=m;e.className=c;}

//  ITENS 
function addItem(desc,qtde,unit,dif,prazo){
  desc=desc||''; qtde=qtde||''; unit=unit||''; dif=dif||''; prazo=prazo||'';
  var id=++ic;
  var body=document.getElementById('ibody');
  var row=document.createElement('div'); row.className='irow'; row.id='row-'+id;
  row.innerHTML=
    '<div class="irow-m">'
    +'<input type="number" min="0" placeholder="0" value="'+qtde+'" id="q-'+id+'">'
    +'<div class="dwrap">'
    +'<input type="text" placeholder="Descricao" value="'+enc(desc)+'" id="d-'+id+'" autocomplete="off">'
    +'<div class="acl" id="ac-'+id+'"></div></div>'
    +'<input type="text" placeholder="-" value="'+dif+'" id="dif-'+id+'" style="text-align:center">'
    +'<input type="text" placeholder="14 DDL" value="'+prazo+'" id="pz-'+id+'" style="text-align:center;font-size:11px">'
    +'<input type="number" min="0" step="0.01" placeholder="0,00" value="'+unit+'" id="u-'+id+'">'
    +'<div class="itot zero" id="t-'+id+'">R$ 0,00</div>'
    +'<button class="rmb" data-id="'+id+'">x</button></div>'
    +'<div class="irow-x" id="x-'+id+'">'
    +'<div style="font-size:10px;color:var(--text3);font-weight:600;text-transform:uppercase">Desenho tecnico</div>'
    +'<div class="uwrap"><button class="btn btn-ghost btn-xs">Anexar imagem/PDF</button>'
    +'<input type="file" accept="image/*,application/pdf" multiple data-id="'+id+'"></div>'
    +'<div class="iprev" id="imgs-'+id+'"></div></div>';
  body.appendChild(row);
  row.querySelector('#q-'+id).addEventListener('input',function(){cR(id);});
  row.querySelector('#u-'+id).addEventListener('input',function(){cR(id);});
  var di=row.querySelector('#d-'+id);
  di.addEventListener('input',function(){shAC(id,this.value);});
  di.addEventListener('blur',function(){setTimeout(function(){var a=document.getElementById('ac-'+id);if(a)a.classList.remove('open');},150);});
  di.addEventListener('keydown',function(e){acKey(e,id);});
  row.querySelector('.rmb').addEventListener('click',function(){var r=document.getElementById('row-'+this.dataset.id);if(r)r.remove();cT();});
  row.querySelector('input[type=file]').addEventListener('change',function(){hUp(this.dataset.id,this);});
  row.querySelector('.irow-m').addEventListener('dblclick',function(){document.getElementById('x-'+id).classList.toggle('show');});
  cR(id);
  if(!desc) row.querySelector('#q-'+id).focus();
}

function hUp(id,inp){
  var pv=document.getElementById('imgs-'+id); if(!pv) return;
  Array.from(inp.files).forEach(function(f){
    if(f.type.startsWith('image/')){
      var rd=new FileReader();
      rd.onload=function(e){
        var d=document.createElement('div'); d.className='ithumb';
        d.innerHTML='<img src="'+e.target.result+'" alt="img"><button class="xbtn">x</button>';
        d.querySelector('.xbtn').addEventListener('click',function(){d.remove();});
        pv.appendChild(d);
      };
      rd.readAsDataURL(f);
    } else {
      var d=document.createElement('div'); d.className='pthumb';
      d.textContent='PDF: '+f.name;
      var xb=document.createElement('button'); xb.className='btn btn-xs btn-danger'; xb.textContent='x';
      xb.addEventListener('click',function(){d.remove();}); d.appendChild(xb); pv.appendChild(d);
    }
  });
  document.getElementById('x-'+id).classList.add('show');
}

function cR(id){
  var q=parseFloat((document.getElementById('q-'+id)||{}).value)||0;
  var u=parseFloat((document.getElementById('u-'+id)||{}).value)||0;
  var t=q*u;
  var el=document.getElementById('t-'+id);
  if(el){el.textContent='R$ '+br(t); el.className='itot'+(t===0?' zero':'');}
  cT();
  var dn=document.getElementById('d-'+id); if(dn&&u>0&&pDB[dn.value]){pDB[dn.value].preco=u; saveL();}
}

function cT(){
  var s=0;
  document.querySelectorAll('[id^="q-"]').forEach(function(el){
    var id=el.id.replace('q-','');
    var u=document.getElementById('u-'+id);
    s+=(parseFloat(el.value)||0)*(u?parseFloat(u.value)||0:0);
  });
  document.getElementById('gtotal').textContent='R$ '+br(s);
}

//  AUTOCOMPLETE 
function shAC(id,val){
  var list=document.getElementById('ac-'+id);
  if(!val||val.length<1){list.classList.remove('open');return;}
  var ms=Object.entries(pDB).filter(function(kv){return kv[0].toLowerCase().indexOf(val.toLowerCase())!==-1;}).slice(0,12);
  if(!ms.length){list.classList.remove('open');return;}
  acI=-1;
  list.innerHTML=ms.map(function(kv){
    var n=kv[0],d=kv[1];
    return '<div class="aci" data-n="'+enc(n)+'" data-p="'+(d.preco||0)+'" data-pz="'+enc(d.prazo||'')+'">'
      +'<span>'+n+'</span>'+(d.preco>0?'<span class="acpr">R$ '+br(d.preco)+'</span>':'')+'</div>';
  }).join('');
  list.querySelectorAll('.aci').forEach(function(el){el.addEventListener('mousedown',function(){pkAC(id,this.dataset.n,parseFloat(this.dataset.p)||0,this.dataset.pz);});});
  list.classList.add('open');
}

function pkAC(id,n,p,pz){
  var d=document.getElementById('d-'+id); if(d) d.value=n;
  if(p>0){var u=document.getElementById('u-'+id); if(u) u.value=p.toFixed(2);}
  if(pz){var pzEl=document.getElementById('pz-'+id); if(pzEl) pzEl.value=pz;}
  var ac=document.getElementById('ac-'+id); if(ac) ac.classList.remove('open');
  cR(id);
  if(pDB[n]) pDB[n].count=(pDB[n].count||0)+1;
}

function acKey(e,id){
  var list=document.getElementById('ac-'+id);
  var items=list.querySelectorAll('.aci');
  if(e.key==='ArrowDown') acI=Math.min(acI+1,items.length-1);
  else if(e.key==='ArrowUp') acI=Math.max(acI-1,0);
  else if(e.key==='Enter'&&acI>=0){e.preventDefault();items[acI].dispatchEvent(new MouseEvent('mousedown'));}
  items.forEach(function(el,i){el.classList.toggle('sel',i===acI);});
}

//  VER COTACOES 
function openView(q){
  renderVL(q);
  document.getElementById('vlist').style.display='block';
  document.getElementById('vdetail').style.display='none';
  document.getElementById('vsearch').value=q;
  document.getElementById('modal-view').classList.add('open');
}

function renderVL(q){
  q=q||'';
  var f=allFiles.filter(function(f){return!q||f.empresa.toLowerCase().indexOf(q.toLowerCase())!==-1||f.num.indexOf(q)!==-1;});
  var el=document.getElementById('vlist');
  if(!f.length){el.innerHTML='<div class="empty">Nenhuma cotacao</div>';return;}
  el.innerHTML=f.slice(0,100).map(function(fi){
    return '<div class="vitem" data-id="'+fi.id+'">'
      +'<div class="vitem-t">N'+fi.num+' - '+fi.empresa+'</div>'
      +'<div class="vitem-m">'+(fi.ddmm||'-')+'</div></div>';
  }).join('');
  el.querySelectorAll('.vitem').forEach(function(e){e.addEventListener('click',function(){openVD(this.dataset.id);});});
}

function openVD(fid){
  var fo=allFiles.find(function(f){return f.id===fid;}); if(!fo) return;
  curFile=fo;
  document.getElementById('vlist').style.display='none';
  document.getElementById('vdetail').style.display='block';
  document.getElementById('vd-title').textContent='N'+fo.num+' - '+fo.empresa+' - '+(fo.ddmm||'');
  document.getElementById('vd-link').href=fo.link||'#';
  var c=document.getElementById('vd-content');
  c.innerHTML='<div style="color:var(--text3)">Carregando...</div>';
  fetch('https://www.googleapis.com/drive/v3/files/'+fid+'?alt=media',{headers:{Authorization:'Bearer '+tok}})
  .then(function(r){if(!r.ok)throw new Error();return r.arrayBuffer();})
  .then(function(buf){return pXlsx(buf);})
  .then(function(d){
    if(!d){c.innerHTML='<div style="color:var(--red)">Nao foi possivel ler.</div>';return;}
    var ih=(d.itens||[]).map(function(it){
      return '<tr>'
        +'<td style="padding:4px 8px;border-bottom:1px solid var(--border)">'+(it.qtde||'-')+'</td>'
        +'<td style="padding:4px 8px;border-bottom:1px solid var(--border)">'+it.desc+'</td>'
        +'<td style="padding:4px 8px;border-bottom:1px solid var(--border);text-align:right">'+(it.preco>0?'R$ '+br(it.preco):'-')+'</td></tr>';
    }).join('');
    c.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:12px;font-size:12px">'
      +'<div><span style="color:var(--text3)">Nome: </span>'+(d.nome||fo.empresa)+'</div>'
      +'<div><span style="color:var(--text3)">Fone: </span>'+(d.fone||'-')+'</div>'
      +'<div><span style="color:var(--text3)">Email: </span>'+(d.email||'-')+'</div>'
      +'<div><span style="color:var(--text3)">Cidade: </span>'+(d.cidade||'-')+'</div>'
      +'<div><span style="color:var(--text3)">Comp: </span>'+(d.comp||'-')+'</div></div>'
      +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
      +'<thead><tr style="background:var(--bg4)">'
      +'<th style="padding:5px 8px;text-align:left;font-size:9px;color:var(--text3)">QTDE</th>'
      +'<th style="padding:5px 8px;text-align:left;font-size:9px;color:var(--text3)">DESCRICAO</th>'
      +'<th style="padding:5px 8px;text-align:right;font-size:9px;color:var(--text3)">UNITARIO</th></tr></thead>'
      +'<tbody>'+(ih||'<tr><td colspan="3" style="padding:8px;color:var(--text3)">Sem itens</td></tr>')+'</tbody></table>';
  }).catch(function(){c.innerHTML='<div style="color:var(--red)">Erro ao carregar.</div>';});
}

function backToList(){
  document.getElementById('vlist').style.display='block';
  document.getElementById('vdetail').style.display='none';
}

function loadForEdit(){
  if(!curFile) return;
  fetch('https://www.googleapis.com/drive/v3/files/'+curFile.id+'?alt=media',{headers:{Authorization:'Bearer '+tok}})
  .then(function(r){return r.arrayBuffer();})
  .then(function(b){return pXlsx(b);})
  .then(function(d){
    if(!d){toast('Erro','error');return;}
    limpar(true);
    sf('f-nome',d.nome||curFile.empresa); sf('f-fone',d.fone||''); sf('f-email',d.email||'');
    sf('f-cidade',d.cidade||''); sf('f-comp',d.comp||''); sf('f-nfe',d.nfe||''); sf('f-bol',d.bol||'');
    (d.itens||[]).forEach(function(it){addItem(it.desc,it.qtde,it.preco>0?it.preco:'');});
    document.getElementById('modal-view').classList.remove('open');
    toast('Cotacao carregada','success');
  }).catch(function(){toast('Erro','error');});
}

//  PRODUTOS 
function openProds(){rProws(); document.getElementById('modal-prods').classList.add('open');}

function rProws(){
  var el=document.getElementById('prows');
  var ents=Object.entries(pDB);
  if(!ents.length){el.innerHTML='<div style="color:var(--text3);font-size:12px;margin-bottom:8px">Nenhum produto. Adicione ou sincronize o Drive.</div>';return;}
  el.innerHTML=ents.map(function(kv,i){
    return '<div class="prow" id="pr-'+i+'">'
      +'<input type="text" value="'+enc(kv[0])+'" id="pn-'+i+'" placeholder="Nome">'
      +'<input type="number" value="'+(kv[1].preco||'')+'" id="pp-'+i+'" placeholder="Preco" step="0.01">'
      +'<input type="text" value="'+enc(kv[1].prazo||'')+'" id="ppz-'+i+'" placeholder="Prazo">'
      +'<button class="rmb" data-k="'+enc(kv[0])+'" data-r="pr-'+i+'">x</button></div>';
  }).join('');
  el.querySelectorAll('.rmb').forEach(function(b){b.addEventListener('click',function(){delete pDB[this.dataset.k];var r=document.getElementById(this.dataset.r);if(r)r.remove();});});
}

function addProw(){
  var id='np-'+Date.now();
  var el=document.getElementById('prows');
  var d=document.createElement('div'); d.className='prow'; d.id=id;
  d.innerHTML='<input type="text" id="pn-'+id+'" placeholder="Nome"><input type="number" id="pp-'+id+'" placeholder="Preco" step="0.01"><input type="text" id="ppz-'+id+'" placeholder="Prazo"><button class="rmb">x</button>';
  d.querySelector('.rmb').addEventListener('click',function(){d.remove();});
  el.appendChild(d); d.querySelector('input').focus();
}

function saveProds(){
  var nb={};
  document.querySelectorAll('.prow').forEach(function(row){
    var ins=row.querySelectorAll('input');
    var n=ins[0].value.trim(), p=parseFloat(ins[1].value)||0, pz=ins[2].value.trim();
    if(n) nb[n]={preco:p,prazo:pz,count:pDB[n]?pDB[n].count||0:0};
  });
  pDB=nb; saveL(); renderSB('');
  document.getElementById('modal-prods').classList.remove('open');
  toast('Banco salvo!','success');
}

//  PDF 
function gRows(){
  var rows=[];
  document.querySelectorAll('[id^="q-"]').forEach(function(el){
    var id=el.id.replace('q-','');
    var q=el.value, d=gv('d-'+id), dif=gv('dif-'+id), pz=gv('pz-'+id);
    var u=parseFloat(gv('u-'+id))||0, t=(parseFloat(q)||0)*u;
    var imgs=[]; document.querySelectorAll('#imgs-'+id+' .ithumb img').forEach(function(i){imgs.push(i.src);});
    if(q||d) rows.push({q:q,d:d,dif:dif,pz:pz,u:u,t:t,imgs:imgs});
  });
  return rows;
}

function ir(l,v){return v?'<div class="irow"><span class="ilabel">'+l+'</span>'+v+'</div>':'';}

function getImgDataUrl(src, callback) {
  // Convert image URL to data URL for PDF
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function(){
    var canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    canvas.getContext('2d').drawImage(img,0,0);
    callback(canvas.toDataURL('image/png'));
  };
  img.onerror = function(){ callback(src); };
  img.src = src;
}

function genPDF(tipo){
  var num=gv('f-num'), dt=fd(gv('f-data')), vl=fd(gv('f-val'));
  var nome=gv('f-nome'), fone=gv('f-fone'), email=gv('f-email'), cid=gv('f-cidade');
  var comp=gv('f-comp'), vend=gv('f-vend'), nfe=gv('f-nfe'), bol=gv('f-bol');
  var prazo=gv('f-prazo'), frete=gv('f-frete'), final=gv('f-final');
  var pcn=gv('f-pcn'), pcc=gv('f-pcc');
  var rows=gRows(); var tot=0; rows.forEach(function(r){tot+=r.t;});
  var isC=tipo==='c';

  // Load images then build PDF
  var logoEl=document.querySelector('.hlogo img');
  var logoSrc=logoEl?logoEl.src:'logo.png';

  getImgDataUrl(logoSrc, function(logoData){
    getImgDataUrl('mola.png', function(molaData){
      getImgDataUrl('banco.png', function(bancoData){

        var rH=rows.map(function(r){
          return '<tr>'
            +'<td style="text-align:center;border:1px solid #ddd;padding:4px 5px">'+r.q+'</td>'
            +'<td style="border:1px solid #ddd;padding:4px 8px">'+r.d+(r.imgs.length?'<br><img src="'+r.imgs[0]+'" style="max-width:80px;max-height:60px;margin-top:3px;border-radius:3px">':'')+'</td>'
            +(isC?'<td style="text-align:center;border:1px solid #ddd;padding:4px 5px">'+r.dif+'</td>':'')
            +'<td style="text-align:center;border:1px solid #ddd;padding:4px 5px;font-size:10px">'+(r.pz||prazo)+'</td>'
            +'<td style="text-align:right;border:1px solid #ddd;padding:4px 8px">R$ '+br(r.u)+'</td>'
            +'<td style="text-align:right;border:1px solid #ddd;padding:4px 8px">R$ '+br(r.t)+'</td></tr>';
        }).join('');

        var ps=(!isC&&(pcn||pcc))?'<div style="background:#f0f0ff;border:1px solid #9090cc;border-radius:4px;padding:8px 12px;margin-bottom:10px;font-size:11px">'+(pcn?'<strong>Pedido Omega:</strong> '+pcn+'   ':'')+(pcc?'<strong>Ped.Cliente:</strong> '+pcc:'')+'</div>':'';

        var html='<!DOCTYPE html><html><head><meta charset="UTF-8">'
          +'<style>body{font-family:Arial,sans-serif;font-size:10px;color:#000;margin:0;padding:16px}'
          +'.hdr{display:flex;align-items:center;gap:14px;border-bottom:2px solid #003399;padding-bottom:10px;margin-bottom:10px}'
          +'.hdr img.logo{width:65px;height:65px;object-fit:contain}'
          +'.hi h2{font-size:13px;color:#003399;margin:0 0 2px;font-weight:700}'
          +'.hi p{margin:1px 0;font-size:9px;color:#444}'
          +'.mw{position:absolute;top:14px;right:14px;opacity:.08}.mw img{width:80px}'
          +'h3{text-align:center;font-size:13px;letter-spacing:3px;color:#003399;margin:6px 0 10px;font-weight:700}'
          +'.ig{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;border:1px solid #ddd;border-radius:4px;padding:7px 10px;margin-bottom:10px}'
          +'.irow{display:flex;gap:4px;font-size:9px;padding:2px 0;border-bottom:1px dotted #eee}'
          +'.irow:last-child{border:none}.ilabel{font-weight:700;color:#555;min-width:75px;flex-shrink:0}'
          +'table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10px}'
          +'th{background:#003399;color:#fff;padding:5px 7px;text-align:left;font-size:9px}'
          +'td{padding:3px 5px}tr:nth-child(even) td{background:#f5f8ff}'
          +'.tr td{font-weight:700;background:#dde4ff;border-top:2px solid #003399}'
          +'.fc{display:flex;gap:16px;font-size:9px;background:#f5f5f5;padding:5px 10px;border-radius:4px;margin-bottom:5px}'
          +'.fn{font-size:8px;color:#666;line-height:1.8;margin-bottom:8px}'
          +'</style></head><body>'
          +'<div style="position:relative">'
          +'<div class="mw"><img src="'+molaData+'"></div>'
          +'<div class="hdr"><img class="logo" src="'+logoData+'" alt="Logo"><div class="hi">'
          +'<h2>Omega Elementos Para Ferramentaria LTDA</h2>'
          +'<p>Rua Cabreuva, 125 - Leocadia - Sorocaba SP - CEP: 18085-340</p>'
          +'<p>(11) 9 8573-9784 - (15) 3346-7164 - paulo@omegafix.com.br</p>'
          +'<p>CNPJ: 11.551.105/0001-55 - Insc. Est.: 370.132.600.111</p>'
          +'</div></div>'
          +'<h3>'+(isC?'ORCAMENTO':'PEDIDO DE COMPRA'+(pcn?' - '+pcn:''))+'</h3>'
          +ps
          +'<div class="ig">'+ir('Orcamento n:',num)+ir('Data:',dt)+ir('Validade:',vl)+ir('Nome:',nome)+ir('Fone:',fone)+ir('Email:',email)+ir('Cidade/UF:',cid)+ir('Comprador:',comp)+ir('Vendedor:',vend)+ir('Email NF-e:',nfe)+ir('Email Bol.:',bol)+(!isC&&pcc?ir('Ped.Cliente:',pcc):'')+'</div>'
          +'<table><thead><tr>'
          +'<th style="width:40px">QTDE</th><th>DESCRICAO</th>'
          +(isC?'<th style="width:60px;text-align:center">DIF.ALIQ.</th>':'')
          +'<th style="width:65px;text-align:center">PRAZO</th>'
          +'<th style="width:80px;text-align:right">UNITARIO</th>'
          +'<th style="width:80px;text-align:right">TOTAL</th></tr></thead>'
          +'<tbody>'+rH
          +'<tr class="tr"><td colspan="'+(isC?5:4)+'" style="text-align:right;padding:5px 8px">VALOR TOTAL:</td>'
          +'<td style="text-align:right;padding:5px 8px">R$ '+br(tot)+'</td></tr>'
          +'</tbody></table>'
          +'<div class="fc"><span><b>Faturamento:</b> '+prazo+'</span><span><b>Frete:</b> '+frete+'</span><span><b>Finalidade:</b> '+final+'</span><span>Simples Nacional</span></div>'
          +'<div class="fn">FATURAMENTO MINIMO: R$ 400,00 / 14 DIAS - NF minimo: R$ 150,00</div>'
          +(isC?'<div><img src="'+bancoData+'" style="width:100%;max-width:480px" alt="Dados Bancarios"></div>':'')
          +'</div></body></html>';

        var w=window.open('','_blank');
        if(!w){toast('Permita popups para gerar PDF','error');return;}
        w.document.write(html); w.document.close();
        setTimeout(function(){w.print();},800);
        if(isC){nxt++;sf('f-num',String(nxt));document.getElementById('num-badge').textContent='Proximo: N'+nxt;saveL();}
      });
    });
  });
}

function copyMsg(){
  var msg='Ola! Segue em anexo o orcamento n'+gv('f-num')+' conforme solicitado.\n\nTotal: '
    +document.getElementById('gtotal').textContent+'\nPrazo: '+gv('f-prazo')+' | Frete: '+gv('f-frete')
    +'\n\nQualquer duvida estamos a disposicao!\n\nAtt.,\nPaulo Henrique\nOmega Fix - (15) 3346-7164\nPIX: 11.551.105/0001-55';
  navigator.clipboard.writeText(msg).then(function(){toast('Mensagem copiada!','success');});
}

function novaCot(){limpar(true); toast('Nova cotacao - N'+nxt,'success');}

function limpar(silent){
  if(!silent&&!confirm('Limpar tudo?')) return;
  ['f-cnpj','f-nome','f-fone','f-email','f-cidade','f-comp','f-nfe','f-bol','f-pcn','f-pcc'].forEach(function(id){sf(id,'');});
  document.getElementById('ibody').innerHTML='';
  document.getElementById('hbanner').classList.remove('show');
  document.getElementById('cnpj-st').textContent='';
  document.getElementById('gtotal').textContent='R$ 0,00';
  ic=0; setDef();
}

var tt;
function toast(msg,type){
  var el=document.getElementById('toast'); el.textContent=msg; el.className='show '+(type||'');
  clearTimeout(tt); tt=setTimeout(function(){el.className='';},3500);
}

function setDef(){
  var t=new Date(), p=function(d){return d.toISOString().split('T')[0];}, v=new Date(t);
  v.setDate(v.getDate()+15);
  sf('f-data',p(t)); sf('f-val',p(v)); sf('f-num',String(nxt));
  addItem(); addItem(); addItem();
}

loadL();
setDef();
