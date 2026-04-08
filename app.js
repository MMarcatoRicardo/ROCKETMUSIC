import{initializeApp}from"https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import{getAuth,GoogleAuthProvider,signInWithPopup,signInAnonymously,onAuthStateChanged}from"https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import{getFirestore,collection,doc,getDocs,addDoc,updateDoc,deleteDoc,query,orderBy}from"https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
// 🔧  CREDENCIAIS FIREBASE  (mesmo projeto do seu JARVIS)
// ─────────────────────────────────────────────────────────────
const fbApp=initializeApp({
  apiKey:"AIzaSyD4iHEP7XOuuzMp2E5r2MeL78ouMGzk-nc",
  authDomain:"dashboard-pessoal-16e24.firebaseapp.com",
  projectId:"dashboard-pessoal-16e24",
  storageBucket:"dashboard-pessoal-16e24.firebasestorage.app",
  messagingSenderId:"368848128240",
  appId:"1:368848128240:web:a012ee417c375ad6a21a35"
});
// ─────────────────────────────────────────────────────────────

const auth=getAuth(fbApp);
const db=getFirestore(fbApp);
const prov=new GoogleAuthProvider();
const EVENTS_COL="rocket_events";
// Só este email vê o botão Editar — troque pelo seu
const ADMIN_EMAIL="mmarcatoricardo@gmail.com";

let currentUser=null;
let allEvents=[];
let editingEventId=null;
let currentTab="inicio";
let escalaEventIndex=-1;
let detailFromTab=null;

// ── TOAST ──
function toast(msg,type="ok"){
  el=document.createElement("div");
  el.className="toast-item "+type;
  el.textContent=(type==="ok"?"✓ ":"✕ ")+msg;
  document.getElementById("toast").appendChild(el);
  setTimeout(()=>{el.style.animation="toastOut .25s ease both";setTimeout(()=>el.remove(),250)},2500);
}

// ── AUTH ──
// App abre direto sem login. Botão Editar sempre visível,
// mas ao clicar pede login Google se não estiver logado,
// e só libera o painel para o email admin.

onAuthStateChanged(auth,user=>{
  currentUser=user;
  av=document.getElementById("user-avatar");
  if(user&&user.photoURL){av.src=user.photoURL;av.style.display="block"}
  else{av.style.display="none"}
});

window.handleEditBtn=async function(){
  if(await requireAdminAndEdit()) openAdmin();
};

async function requireAdminAndEdit(){
  // Pega o usuário atual direto do Firebase (mais confiável que a variável local)
  let user=auth.currentUser||currentUser;

  if(!user||user.isAnonymous){
    try{
      await auth.signOut();result=await signInWithPopup(auth,prov);
      user=result.user;
      currentUser=user;
    }catch(e){
      code=e?.code||"";
      if(code==="auth/popup-closed-by-user"||code==="auth/cancelled-popup-request") return false;
      if(code==="auth/popup-blocked"){
        toast("Popup bloqueado pelo navegador. Permita popups para este site.","err");
        return false;
      }
      if(code==="auth/unauthorized-domain"){
        toast("Domínio não autorizado no Firebase. Veja o console.","err");
        console.error("Adicione este domínio em Firebase Console → Authentication → Settings → Authorized domains:",location.hostname);
        return false;
      }
      toast("Erro ao entrar: "+(e?.message||code),"err");
      console.error("Auth error:",e);
      return false;
    }
  }

  if(!user||user.email!==ADMIN_EMAIL){
    toast("Acesso restrito ao administrador","err");
    return false;
  }
  return true;
}

// ── LOAD EVENTS (público, sem auth) ──
loadEvents();

FIRENIGHT_DATA={
  nome:"Firenight Março",
  tipo:"Firenight",
  data:"2026-03-28",
  hora:"17:00",
  versiculo:"Apresentai os vossos corpos como sacrifício vivo, santo e agradável a Deus; isto é o vosso culto racional. — Rm 12.1",
  escala:[],
  setlist:[
    {titulo:"Agitadas",musicas:[
      {nome:"Os Que Confiam",artista:"Fernandinho",tom:"Bm"},
      {nome:"Dançar na Chuva + Vem me Buscar + É Proibido",artista:"Fernandinho",tom:"Dm"},
    ]},
    {titulo:"Medley de Worship — Tom C",musicas:[
      {nome:"Eu Só Quero Tua Presença",artista:"Casa Worship / Theo Rubia",tom:""},
      {nome:"É Tudo Sobre Você",artista:"Morada",tom:""},
      {nome:"Tu és Tudo",artista:"Alessandro Vilas Boas",tom:""},
      {nome:"Meus Votos",artista:"Morada",tom:""},
      {nome:"Lugar de Habitação",artista:"Os Bravos + Alessandro Vilas Boas",tom:""},
      {nome:"Tua Presença Vale Mais",artista:"Os Bravos + JesusCopy",tom:""},
      {nome:"Nada Mais + Uma Vez + Doce Presença",artista:"FHOP",tom:""},
    ]},
    {titulo:"Encerramento",musicas:[
      {nome:"A Alegria do Senhor",artista:"Fernandinho",tom:""},
    ]},
  ],
  liturgia:[
    {titulo:"Abertura com dinâmica",musicas:""},
    {titulo:"Louvor animado",musicas:"Os Que Confiam\nDançar na Chuva + Vem me Buscar + É Proibido"},
    {titulo:"Worship — Parte 1",musicas:"Eu Só Quero Tua Presença\nÉ Tudo Sobre Você\nTu és Tudo"},
    {titulo:"Oração e Intercessão",musicas:""},
    {titulo:"Worship — Parte 2",musicas:"Meus Votos\nLugar de Habitação\nTua Presença Vale Mais"},
    {titulo:"Ministração da Palavra",musicas:""},
    {titulo:"Ministração final",musicas:"Nada Mais\nUma Vez\nDoce Presença"},
    {titulo:"Apelo + Oração final",musicas:""},
    {titulo:"Encerramento animado",musicas:"A Alegria do Senhor"},
  ],
  materiais:[
    {emoji:"📄",nome:"Letras do Medley",url:"https://raw.githubusercontent.com/MMarcatoRicardo/ROCKET_MUSIC/main/LETRAS_MEDLEY_FIRENIGHT_MARÇO.pdf"},
    {emoji:"🎸",nome:"Cifras do Medley",url:"https://raw.githubusercontent.com/MMarcatoRicardo/ROCKET_MUSIC/main/CIFRAS_MEDLEY_FIRENIGHT_MARÇO.pdf"},
    {emoji:"▶️",nome:"Playlist no YouTube",url:"https://youtube.com/playlist?list=PLre37ZNO67ymSLHoxQQeiU40Zlnbxjgwk&si=JpFDy8_jAiDP-S3w"},
    {emoji:"♫",nome:"Playlist no Spotify",url:"https://open.spotify.com/playlist/4s9SPDOWxgVpJYmXH5u2KH?si=kWOZux8lRTCMm2U_Y4BkMg"},
    {emoji:"📁",nome:"Medley de Referência (Google Drive)",url:"https://drive.google.com/file/d/10eALKClW1-FUfkAy3XiBDBWNqZbAmPW-/view?usp=sharing"},
  ],
  dresscode:{
    cores:["#111111","#cc1111","#d94010","#FF6A00","#FFD000","#ffffff"],
    obs:""
  },
  foto:"",
  createdAt:new Date().toISOString(),
  updatedAt:new Date().toISOString(),
};

async function loadEvents(){
  try{
    if(!auth.currentUser) await signInAnonymously(auth);
    q=query(collection(db,EVENTS_COL),orderBy("data","asc"));
    snap=await getDocs(q);
    allEvents=snap.docs.map(d=>({id:d.id,...d.data()}));
    escalaEventIndex=-1; // recalcula índice ao renderizar
    // Seed Firenight se ainda não existir
    if(!allEvents.find(e=>e.data==="2026-03-28")){
      try{
        ref=await addDoc(collection(db,EVENTS_COL),FIRENIGHT_DATA);
        allEvents.push({id:ref.id,...FIRENIGHT_DATA});
        allEvents.sort((a,b)=>a.data.localeCompare(b.data));
      }catch(e){console.warn("Seed falhou (Firestore rules?):",e)}
    }
    renderAll();
  }catch(e){console.error(e);toast("Erro ao carregar eventos","err")}
}

function renderAll(){
  renderTodayBanner();
  renderHome();
  renderEscala();
  renderProximos();
  renderPassados();
  if(document.getElementById("admin-list-view").style.display!=="none") renderAdminList();
}

// ── HOME ──
function renderHome(){
  todayStr=toDateStr(new Date());
  next=allEvents.find(e=>e.data>=todayStr);
  el=document.getElementById("inicio-content");
  if(!el)return;

  if(!next){
    el.innerHTML=`<div class="event-empty" style="margin-top:32px"><div class="ee-icon">📅</div><div class="ee-title">Nenhum evento próximo</div><div class="ee-sub">Fique de olho nos próximos anúncios!</div></div>`;
    return;
  }

  const escala=next.escala||[];
  const setlist=next.setlist||[];
  const isAviso=next.tipo==="Aviso / Sem Escala";
  const dcColors=next.dresscode?.cores||[];
  const mats=(next.materiais||[]).filter(m=>m.url);
  const hasEnsaio=next.horarioEnsaioInstrumental||next.horarioEnsaioVocal;

  el.innerHTML=`
    <div class="home-next-label">PRÓXIMO EVENTO</div>
    <div class="home-event-card" id="home-event-card" data-id="${next.id}">
      <div class="home-event-tag">${next.tipo||"Evento"}</div>
      <div class="home-event-name">${next.nome||"Evento"}</div>
      <div class="home-event-date">${fmtDate(next.data)}${next.hora?" · "+next.hora:""}</div>
      ${hasEnsaio?`<div class="home-ensaio-row">${next.horarioEnsaioInstrumental?`<span>🎸 Instrumental: ${next.horarioEnsaioInstrumental}</span>`:""}${next.horarioEnsaioVocal?`<span>🎤 Vocal: ${next.horarioEnsaioVocal}</span>`:""}</div>`:""}
      ${next.versiculo?`<div class="home-event-verse">"${next.versiculo}"</div>`:""}
      ${next.obs?`<div class="home-obs-box">📌 ${next.obs}</div>`:""}
      <div class="countdown" id="countdown-home" style="margin-top:16px"></div>
      ${dcColors.length?`<div class="home-dc-row">${dcColors.map(c=>`<div class="home-dc-dot" style="background:${c};${c==="#ffffff"||c==="#FFFFFF"?"border:1.5px solid #444":""}"></div>`).join("")}</div>`:""}
      <button class="home-btn-detail" id="home-btn-detail">Ver detalhes completos →</button>
    </div>
    ${mats.length?`
      <div class="home-next-label" style="margin-top:4px">ACESSO RÁPIDO</div>
      <div class="home-mats-row">
        ${mats.map(m=>`<a class="home-mat-chip ${getMatClass(m.url)}" href="${m.url}" target="_blank" rel="noopener"><span>${m.emoji||"🔗"}</span>${m.nome||""}</a>`).join("")}
      </div>
    `:""}


    ${!isAviso&&escala.length?`
      <div class="home-next-label" style="margin-top:4px">ESCALA</div>
      <div class="home-escala-card">
        ${escala.map(p=>`<div class="escala-row"><span class="e-role">${p.emoji||""} ${p.funcao||""}</span><span class="e-nome">${p.nome||""}</span></div>`).join("")}
      </div>
    `:""}

    ${!isAviso&&setlist.length?`
      <div class="home-next-label" style="margin-top:4px">SETLIST</div>
      <div class="home-escala-card">
        ${setlist.map(g=>`
          <div class="home-setlist-group">
            ${g.titulo?`<div class="set-group-title">${g.titulo}</div>`:""}
            ${(g.musicas||[]).map((m,i)=>`<div class="song"><span class="song-n">${i+1}</span><div class="song-info"><div class="song-name">${m.nome||""}</div><div class="song-artist">${m.artista||""}</div></div>${m.tom?`<span class="song-key">${m.tom}</span>`:""}</div>`).join("")}
          </div>
        `).join("")}
      </div>
    `:""}
  `;

  if(isFuture(next.data)) startCountdown(next.data,next.hora||"00:00","countdown-home");
  else document.getElementById("countdown-home")?.remove();

  document.getElementById("home-btn-detail").onclick=()=>{detailFromTab="inicio";openEventDetail(next.id)};
  document.getElementById("home-event-card").onclick=e=>{
    if(e.target.closest("#home-btn-detail"))return;
    detailFromTab="inicio";openEventDetail(next.id);
  };
}

// ── TODAY BANNER ──
function renderTodayBanner(){
  const todayStr=toDateStr(new Date());
  const ev=allEvents.find(e=>e.data===todayStr);
  const banner=document.getElementById("today-banner");
  if(!banner)return;
  if(ev){
    banner.innerHTML=`<span class="tb-fire">🔥</span><div><div class="tb-text">Hoje é o ${ev.nome||"Evento"}!</div><div class="tb-sub">${ev.hora?" às "+ev.hora+" · ":""} Vai ser incrível! 🚀</div></div>`;
    banner.style.display="flex";
  }else{
    banner.style.display="none";
  }
}

// ── HELPERS ──
function parseDate(s){return s?new Date(s+"T12:00:00"):null}
function fmtDate(s){const d=parseDate(s);if(!d)return"";return d.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
function fmtShort(s){const d=parseDate(s);if(!d)return"";return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
function getDay(s){const d=parseDate(s);return d?String(d.getDate()).padStart(2,"0"):"--"}
function getMon(s){const d=parseDate(s);return d?d.toLocaleDateString("pt-BR",{month:"short"}).replace(".",""):"---"}
const today=new Date();today.setHours(0,0,0,0);
function isFuture(s){const d=parseDate(s);return d&&d>=today}
function isPast(s){const d=parseDate(s);return d&&d<today}

// ── COUNTDOWN ──
const cdIntervals={};
function startCountdown(dateStr,horaStr,containerId){
  if(cdIntervals[containerId])clearInterval(cdIntervals[containerId]);
  const target=new Date(dateStr+"T"+(horaStr||"00:00")+":00");
  function update(){
    const diff=target-new Date();
    const el=document.getElementById(containerId);
    if(!el){clearInterval(cdIntervals[containerId]);delete cdIntervals[containerId];return}
    if(diff<=0){el.innerHTML=`<div class="cd-done">É hoje! Vamos ser incendiados 🔥</div>`;clearInterval(cdIntervals[containerId]);delete cdIntervals[containerId];return}
    const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    el.innerHTML=`<div class="cd-block"><div class="cd-num">${String(d).padStart(2,"0")}</div><div class="cd-lbl">Dias</div></div><div class="cd-block"><div class="cd-num">${String(h).padStart(2,"0")}</div><div class="cd-lbl">Horas</div></div><div class="cd-block"><div class="cd-num">${String(m).padStart(2,"0")}</div><div class="cd-lbl">Min</div></div><div class="cd-block"><div class="cd-num">${String(s).padStart(2,"0")}</div><div class="cd-lbl">Seg</div></div>`;
  }
  update();cdIntervals[containerId]=setInterval(update,1000);
}

function toDateStr(d){return d.toISOString().slice(0,10)}

// ── TAB: ESCALA ── navega pelos eventos cadastrados (não sábados fixos)
function initEscalaIndex(){
  if(escalaEventIndex===-1){
    const todayStr=toDateStr(new Date());
    // Pega o índice do próximo evento (ou o último se não houver futuro)
    const idx=allEvents.findIndex(e=>e.data>=todayStr);
    escalaEventIndex=idx>=0?idx:Math.max(0,allEvents.length-1);
  }
}

function getEscalaEventIcon(tipo){
  if(tipo==="Firenight") return "🔥";
  if(tipo==="Aviso / Sem Escala") return "📌";
  return "📅";
}

function renderEscala(){
  initEscalaIndex();
  if(escalaEventIndex<0) escalaEventIndex=0;
  if(escalaEventIndex>=allEvents.length) escalaEventIndex=Math.max(0,allEvents.length-1);

  const el=document.getElementById("escala-content");

  if(!allEvents.length){
    el.innerHTML=`<div class="event-empty"><div class="ee-icon">📅</div><div class="ee-title">Nenhum evento cadastrado</div><div class="ee-sub">O admin pode criar eventos pelo botão Editar.</div></div>`;
    return;
  }

  const ev=allEvents[escalaEventIndex];
  const escala=ev?.escala||[];
  const isAviso=ev?.tipo==="Aviso / Sem Escala";

  el.innerHTML=`
    <div class="escala-nav">
      <button class="escala-nav-btn" id="escala-prev" ${escalaEventIndex===0?"disabled":""}>‹</button>
      <div class="escala-nav-center">
        <div class="escala-nav-name">${ev.nome||"Evento"}</div>
        <div class="escala-nav-date">${fmtDate(ev.data)}${ev.hora?" · "+ev.hora:""}</div>
      </div>
      <button class="escala-nav-btn" id="escala-next" ${escalaEventIndex>=allEvents.length-1?"disabled":""}>›</button>
    </div>

    ${isAviso?`
      <div class="aviso-box">
        <div class="aviso-icon">📌</div>
        <div class="aviso-text">${ev.aviso||ev.nome||"Sem escala neste dia"}</div>
      </div>
    `:`
      <div class="acc open" id="acc-escala">
        <button class="acc-btn" onclick="toggleAcc('acc-escala')">
          <span class="ab-left"><span class="ab-icon">👥</span> Escala ${ev.id?`<button class="btn-ver-info" id="btn-ver-info">Ver informações ›</button>`:""}</span>
          <span class="ab-right"><span class="ab-chev">▼</span></span>
        </button>
        <div class="acc-body">
          ${escala.length
            ?escala.map(p=>`<div class="escala-row"><span class="e-role">${p.emoji||""} ${p.funcao||""}</span><span class="e-nome">${p.nome||""}</span></div>`).join("")
            :`<div style="padding:16px 0;text-align:center;color:var(--tx3);font-size:13px">Escala ainda não definida para este evento.</div>`
          }
        </div>
      </div>

      ${isFuture(ev.data)?`<div class="countdown" id="countdown-escala"></div>`:""}
    `}
  `;

  if(!isAviso&&isFuture(ev.data)) startCountdown(ev.data,ev.hora||"00:00","countdown-escala");

  document.getElementById("escala-prev").onclick=()=>{escalaEventIndex--;renderEscala()};
  document.getElementById("escala-next").onclick=()=>{escalaEventIndex++;renderEscala()};

  if(!isAviso) document.getElementById("btn-ver-info")?.addEventListener("click",e=>{
    e.stopPropagation();
    detailFromTab="escala";
    openEventDetail(ev.id);
  });
}

// ── TAB: PRÓXIMOS EVENTOS ──
function renderProximos(filterType="Todos"){
  const future=allEvents.filter(e=>isFuture(e.data));
  const types=["Todos",...new Set(future.map(e=>e.tipo).filter(Boolean))];
  const fbar=document.getElementById("proximos-filter");
  fbar.innerHTML=types.map(t=>`<div class="filter-chip${t===filterType?" active":""}" data-type="${t}">${t}</div>`).join("");
  fbar.querySelectorAll(".filter-chip").forEach(c=>c.onclick=()=>renderProximos(c.dataset.type));
  const filtered=filterType==="Todos"?future:future.filter(e=>e.tipo===filterType);
  const el=document.getElementById("proximos-content");
  if(!filtered.length){el.innerHTML=`<div class="event-empty"><div class="ee-icon">📅</div><div class="ee-title">Nenhum evento</div><div class="ee-sub">Nenhum próximo evento ${filterType!=="Todos"?"do tipo "+filterType:""}.</div></div>`;return}
  el.innerHTML=filtered.map((ev,i)=>`
    <div class="event-card${i===0?" featured":""}" data-id="${ev.id}">
      <div class="event-card-header">
        <div class="event-date-badge"><div class="edb-day">${getDay(ev.data)}</div><div class="edb-mon">${getMon(ev.data)}</div></div>
        <div class="event-card-info">
          <div class="event-card-name">${ev.nome||"Evento"}</div>
          <div class="event-card-meta">${fmtDate(ev.data)}${ev.hora?" · "+ev.hora:""}</div>
        </div>
        ${ev.tipo?`<div class="event-card-tag">${ev.tipo}</div>`:""}
        <span class="event-card-arrow">›</span>
      </div>
    </div>
  `).join("");
  el.querySelectorAll(".event-card").forEach(c=>c.onclick=()=>{
    detailFromTab="proximos";openEventDetail(c.dataset.id);
  });
}

// ── TAB: EVENTOS PASSADOS ──
function renderPassados(filterType="Todos"){
  const past=allEvents.filter(e=>isPast(e.data)).sort((a,b)=>b.data.localeCompare(a.data));
  const types=["Todos",...new Set(past.map(e=>e.tipo).filter(Boolean))];
  const fbar=document.getElementById("passados-filter");
  fbar.innerHTML=types.map(t=>`<div class="filter-chip${t===filterType?" active":""}" data-type="${t}">${t}</div>`).join("");
  fbar.querySelectorAll(".filter-chip").forEach(c=>c.onclick=()=>renderPassados(c.dataset.type));
  const filtered=filterType==="Todos"?past:past.filter(e=>e.tipo===filterType);
  const el=document.getElementById("passados-content");

  // ── Stats accordion (sempre sobre todos os passados, não filtrado) ──
  let statsHtml="";
  if(past.length){
    // contagem de músicas
    const songCount={};
    const artistCount={};
    past.forEach(ev=>{
      (ev.setlist||[]).forEach(g=>{
        (g.musicas||[]).forEach(m=>{
          if(!m.nome)return;
          const key=m.nome.trim();
          songCount[key]=(songCount[key]||0)+1;
          if(m.artista){const ak=m.artista.trim();artistCount[ak]=(artistCount[ak]||0)+1;}
        });
      });
    });
    const topSongs=Object.entries(songCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topArtists=Object.entries(artistCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const totalMusicas=Object.values(songCount).reduce((a,b)=>a+b,0);

    statsHtml=`<div class="acc" id="acc-stats" style="margin-bottom:16px">
      <button class="acc-btn" id="acc-stats-btn">
        <span class="ab-left"><span class="ab-icon">📊</span> Histórico & Estatísticas</span>
        <span class="ab-right"><span class="ab-hint">clique para ver</span><span class="ab-chev">▼</span></span>
      </button>
      <div class="acc-body">
        <div class="stats-row">
          <div class="stat-card"><div class="stat-num">${past.length}</div><div class="stat-lbl">Eventos realizados</div></div>
          <div class="stat-card"><div class="stat-num">${totalMusicas}</div><div class="stat-lbl">Execuções no total</div></div>
        </div>
        ${topSongs.length?`
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--or);opacity:.8;margin-bottom:8px">🎵 Músicas mais tocadas</div>
        <div class="acc" style="margin-bottom:12px;border-color:#1e1e1e">
          <div class="stat-rank-list" style="padding:0 4px">
            ${topSongs.map(([nome,n],i)=>`<div class="stat-rank-item"><span class="stat-rank-pos">${i+1}</span><span class="stat-rank-name">${nome}</span><span class="stat-rank-count">${n}×</span></div>`).join("")}
          </div>
        </div>`:""}
        ${topArtists.length?`
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:var(--or);opacity:.8;margin-bottom:8px">🎤 Artistas mais tocados</div>
        <div style="padding:0 4px">
          ${topArtists.map(([nome,n],i)=>`<div class="stat-rank-item"><span class="stat-rank-pos">${i+1}</span><span class="stat-rank-name">${nome}</span><span class="stat-rank-count">${n}×</span></div>`).join("")}
        </div>`:""}
      </div>
    </div>`;
  }

  if(!filtered.length){
    el.innerHTML=statsHtml+`<div class="event-empty"><div class="ee-icon">📸</div><div class="ee-title">Sem eventos passados</div><div class="ee-sub">Os eventos realizados aparecerão aqui.</div></div>`;
    document.getElementById("acc-stats-btn")?.addEventListener("click",()=>toggleAcc("acc-stats"));
    return;
  }
  el.innerHTML=statsHtml+filtered.map(ev=>`
    <div class="past-card" data-id="${ev.id}">
      ${ev.foto?`<img class="past-card-img" src="${ev.foto}" alt="${ev.nome||""}" loading="lazy" onerror="this.style.display='none'">`:`<div class="past-card-img-placeholder">📸</div>`}
      <div class="past-card-body">
        <div class="past-card-name">${ev.nome||"Evento"}</div>
        <div class="past-card-meta">${fmtDate(ev.data)}${ev.tipo?" · "+ev.tipo:""}</div>
      </div>
    </div>
  `).join("");
  el.querySelector("#acc-stats-btn")?.addEventListener("click",()=>toggleAcc("acc-stats"));
  el.querySelectorAll(".past-card").forEach(c=>c.onclick=()=>{
    detailFromTab="passados";openEventDetail(c.dataset.id);
  });
}

// ── EVENT DETAIL ──
function openEventDetail(id){
  const ev=allEvents.find(e=>e.id===id);if(!ev)return;
  document.getElementById("tab-inicio").style.display="none";
  document.getElementById("tab-escala").style.display="none";
  document.getElementById("tab-proximos").style.display="none";
  document.getElementById("tab-passados").style.display="none";
  document.querySelector(".tab-bar").style.display="none";
  document.getElementById("event-detail").classList.add("active");
  // render detail
  const escala=ev.escala||[];
  const setlist=ev.setlist||[];
  const liturgia=ev.liturgia||[];
  const materiais=ev.materiais||[];
  const dcColors=ev.dresscode?.cores||[];

  const hasEnsaioD=ev.horarioEnsaioInstrumental||ev.horarioEnsaioVocal;
  let html=`
    ${ev.foto?`<div class="detail-hero"><img src="${ev.foto}" alt="${ev.nome||""}" onerror="this.parentElement.style.display='none'"></div>`:""}
    <div class="detail-header">
      <div class="detail-tag">Rocket Music · ${ev.tipo||"Evento"}</div>
      <div class="detail-title">${ev.nome||"Evento"}</div>
      <div class="detail-sub">${fmtDate(ev.data)}${ev.hora?" · "+ev.hora:""}</div>
      ${hasEnsaioD?`<div class="detail-ensaio-row">${ev.horarioEnsaioInstrumental?`<span>🎸 Instrumental: ${ev.horarioEnsaioInstrumental}</span>`:""}${ev.horarioEnsaioVocal?`<span>🎤 Vocal: ${ev.horarioEnsaioVocal}</span>`:""}</div>`:""}
      ${ev.versiculo?`<div class="detail-verse">"${ev.versiculo}"</div>`:""}
      <button class="btn-share" id="btn-share-event">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Compartilhar
      </button>
      <div class="countdown" id="countdown-detail"></div>
    </div>
    <div class="wrap" style="max-width:640px;margin:0 auto;padding:20px 16px 60px">
    ${ev.obs?`<div class="detail-obs-box">📌 ${ev.obs}</div>`:""}
  `;

  const visibleEscala=escala.filter(p=>p.nome);
  if(visibleEscala.length) html+=accordion("acc-d-escala","👥","Escala",`
    ${visibleEscala.map(p=>`<div class="escala-row"><span class="e-role">${p.emoji||""} ${p.funcao||""}</span><span class="e-nome">${p.nome||""}</span></div>`).join("")}
  `,"clique para ver");

  if(setlist.length) html+=accordion("acc-d-setlist","🎵","Setlist",`
    ${setlist.map(g=>`
      <div class="set-group">
        <div class="set-group-title">${g.titulo||""}</div>
        ${(g.musicas||[]).map((m,i)=>{const q=encodeURIComponent((m.nome||"")+(m.artista?" "+m.artista:""));const ytUrl=`youtube://results?search_query=${q}`;const ytFallback=`https://www.youtube.com/results?search_query=${q}`;return`<div class="song"><span class="song-n">${i+1}</span><div class="song-info"><div class="song-name">${m.nome||""}</div><div class="song-artist">${m.artista||""}</div></div>${m.tom?`<span class="song-key">${m.tom}</span>`:""}<a class="btn-yt-preview" href="${ytUrl}" onclick="if(!navigator.userAgent.match(/YouTubeApp/i)){this.href='${ytFallback}'}" target="_blank" rel="noopener" title="Buscar no YouTube">▶</a></div>`}).join("")}
      </div>
    `).join("")}
  `,"clique para ver");

  if(liturgia.length) html+=accordion("acc-d-lit","📋","Ordem do Culto",`
    <div class="liturgia">
      ${liturgia.map((p,i)=>`<div class="lit-step"><div class="lit-num">${i+1}</div><div class="lit-title">${p.titulo||""}</div>${p.musicas?`<div class="lit-songs">${p.musicas}</div>`:""}</div>`).join("")}
    </div>
  `,"clique para ver");

  const visibleMateriais=materiais.filter(m=>m.url);
  if(visibleMateriais.length) html+=accordion("acc-d-mat","📦","Materiais de Ensaio",`
    ${visibleMateriais.map(m=>`<a class="btn-mat ${getMatClass(m.url)}" href="${m.url}" target="_blank" rel="noopener"><span class="mat-icon">${m.emoji||"🔗"}</span><span class="mat-text">${m.nome||""}</span><span class="mat-hint">↗</span></a>`).join("")}
  `,"clique para ver");

  if(dcColors.length) html+=accordion("acc-d-dc","🕶️","Dress Code",`
    <div class="dc-wrap">
      <div class="dc-fire">🔥</div>
      <div class="dc-colors">${dcColors.map(c=>`<div class="dc-dot" style="background:${c};${c==="#ffffff"||c==="#FFFFFF"?"border:1.5px solid #333":""}"></div>`).join("")}</div>
      <div class="dc-fire">🔥</div>
    </div>
    ${ev.dresscode?.obs?`<div style="text-align:center;font-size:12px;color:var(--tx3);margin-top:10px">${ev.dresscode.obs}</div>`:""}
  `,"clique para ver");

  html+="</div>";
  document.getElementById("event-detail-content").innerHTML=html;

  if(isFuture(ev.data)) startCountdown(ev.data,ev.hora,"countdown-detail");
  else document.getElementById("countdown-detail")?.remove();

  // share button
  document.getElementById("btn-share-event")?.addEventListener("click",()=>{
    const _escala=ev.escala||[];
    const _setlist=ev.setlist||[];
    const _playlists=(ev.materiais||[]).filter(m=>m.nome?.toLowerCase().includes("playlist"));

    let texto=`🔥 ${ev.nome||"Evento"}${ev.tipo?" ("+ev.tipo+")":""}` +
      `\n📅 ${fmtDate(ev.data)}${ev.hora?" às "+ev.hora:""}` +
      (ev.versiculo?`\n\n"${ev.versiculo}"`:"")+"\n";

    if(_escala.length){
      texto+=`\n👥 ESCALA\n`+_escala.map(p=>`${p.emoji||""} ${p.funcao||""}${p.nome?" — "+p.nome:""}`).join("\n");
    }

    if(_setlist.length){
      texto+=`\n\n🎵 SETLIST\n`+_setlist.map(g=>{
        const header=g.titulo?g.titulo+":\n":"";
        const songs=(g.musicas||[]).map((m,i)=>`${i+1}. ${m.nome||""}${m.artista?" — "+m.artista:""}${m.tom?" ("+m.tom+")":""}`).join("\n");
        return header+songs;
      }).join("\n\n");
    }

    if(_playlists.length){
      texto+=`\n\n🎧 PLAYLISTS\n`+_playlists.map(m=>`${m.emoji||""} ${m.nome||""}: ${m.url||""}`).join("\n");
    }

    texto+=`\n\nRocket Music — Ministério de Louvor`;

    if(navigator.share){
      navigator.share({title:ev.nome||"Rocket Music",text:texto}).catch(()=>{});
    }else{
      navigator.clipboard?.writeText(texto).then(()=>toast("Copiado! 📋")).catch(()=>toast("Compartilhamento não suportado","err"));
    }
  });

  // edit button in detail
  const editDetailBtn=document.getElementById("btn-edit-detail");
  editDetailBtn.style.display=currentUser?.email===ADMIN_EMAIL?"inline-flex":"none";
  editDetailBtn.onclick=async()=>{
    if(await requireAdminAndEdit()) openEventFormById(ev.id);
  };
  // wire accordions
  document.getElementById("event-detail-content").querySelectorAll(".acc-btn").forEach(btn=>{
    btn.onclick=()=>toggleAcc(btn.closest(".acc").id);
  });
  window.scrollTo(0,0);
}

function getMatClass(url){
  if(!url)return"";
  if(url.includes("youtube.com")||url.includes("youtu.be"))return"yt";
  if(url.includes("spotify.com"))return"sp";
  if(url.includes("drive.google.com"))return"drive";
  return"";
}

function accordion(id,icon,title,body,hint=""){
  return `<div class="acc" id="${id}">
    <button class="acc-btn">
      <span class="ab-left"><span class="ab-icon">${icon}</span> ${title}</span>
      <span class="ab-right"><span class="ab-hint">${hint}</span><span class="ab-chev">▼</span></span>
    </button>
    <div class="acc-body">${body}</div>
  </div>`;
}

function closeEventDetail(){
  document.getElementById("event-detail").classList.remove("active");
  document.getElementById("event-detail-content").innerHTML="";
  document.querySelector(".tab-bar").style.display="";
  document.getElementById("tab-inicio").style.display="";
  document.getElementById("tab-escala").style.display="";
  document.getElementById("tab-proximos").style.display="";
  document.getElementById("tab-passados").style.display="";
  if(cdIntervals["countdown-detail"]){clearInterval(cdIntervals["countdown-detail"]);delete cdIntervals["countdown-detail"];}
}
document.getElementById("detail-back-btn").onclick=closeEventDetail;

// ── TABS ──
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick=()=>{
    currentTab=btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-"+currentTab).classList.add("active");
  }
});

// ── TOGGLE ACCORDION ──
window.toggleAcc=function(id){document.getElementById(id)?.classList.toggle("open")};

// ── ADMIN: OPEN/CLOSE ──
document.getElementById("admin-close").onclick=closeAdmin;
document.getElementById("admin-panel").onclick=e=>{if(e.target===document.getElementById("admin-panel"))closeAdmin()};

function openAdmin(){
  document.getElementById("admin-panel").classList.add("active");
  showAdminList();
  renderAdminList();
}
function closeAdmin(){
  document.getElementById("admin-panel").classList.remove("active");
}

function showAdminList(){
  document.getElementById("admin-list-view").style.display="block";
  document.getElementById("event-form").classList.remove("active");
}
function showEventForm(){
  document.getElementById("admin-list-view").style.display="none";
  document.getElementById("event-form").classList.add("active");
  document.getElementById("admin-sheet").scrollTop=0;
}

document.getElementById("form-back-btn").onclick=showAdminList;
document.getElementById("form-close").onclick=closeAdmin;

// ── ADMIN LIST ──
function renderAdminList(){
  const el=document.getElementById("admin-events-list");
  const sorted=[...allEvents].sort((a,b)=>a.data?.localeCompare(b.data));
  if(!sorted.length){el.innerHTML=`<div class="event-empty"><div class="ee-icon">📅</div><div class="ee-sub">Nenhum evento cadastrado.</div></div>`;return}
  el.innerHTML=sorted.map(ev=>`
    <div class="admin-event-item" data-id="${ev.id}">
      <span class="aei-date">${fmtShort(ev.data)}</span>
      <span class="aei-name">${ev.nome||"Sem nome"}</span>
      ${ev.tipo?`<span class="aei-type">${ev.tipo}</span>`:""}
      <span class="aei-arrow">›</span>
    </div>
  `).join("");
  el.querySelectorAll(".admin-event-item").forEach(item=>{
    item.onclick=()=>openEventFormById(item.dataset.id);
  });
}

document.getElementById("btn-new-event").onclick=()=>openEventForm(null);

// ── EVENT FORM: open by id from detail ──
function openEventFormById(id){
  closeAdmin();
  // reopen admin in form mode
  document.getElementById("admin-panel").classList.add("active");
  const ev=allEvents.find(e=>e.id===id);
  if(ev) openEventForm(ev);
}

// ── DRESS CODE COLORS ──
let dcSelected=[];
function renderDcColors(){
  const wrap=document.getElementById("dc-colors-wrap");
  const addBtn=document.getElementById("btn-add-dc-color");
  wrap.innerHTML="";
  dcSelected.forEach((c,i)=>{
    const d=document.createElement("div");d.className="dc-form-dot sel";d.style.background=c;
    if(c==="#ffffff"||c==="#FFFFFF")d.style.border="1.5px solid #333";
    d.title="Clique para remover";d.onclick=()=>{dcSelected.splice(i,1);renderDcColors()};
    wrap.appendChild(d);
  });
  wrap.appendChild(addBtn);
}
document.getElementById("btn-add-dc-color").onclick=()=>document.getElementById("dc-color-picker").click();
document.getElementById("dc-color-picker").oninput=e=>{};
document.getElementById("dc-color-picker").onchange=e=>{
  const c=e.target.value;if(!dcSelected.includes(c)){dcSelected.push(c);renderDcColors()}
};

// ── DYNAMIC LIST HELPERS ──
function addEscalaRow(funcao="",emoji="",nome=""){
  const wrap=document.getElementById("escala-list");
  const row=document.createElement("div");row.className="dyn-item";
  row.innerHTML=`<input class="finput" style="max-width:34px;text-align:center;padding:10px 6px" placeholder="🎹" value="${emoji}" data-field="emoji"><input class="finput" style="max-width:140px" placeholder="Função" value="${funcao}" data-field="funcao"><input class="finput" placeholder="Nome" value="${nome}" data-field="nome"><button class="dyn-del" title="Remover">✕</button>`;
  row.querySelector(".dyn-del").onclick=()=>row.remove();
  wrap.appendChild(row);
}
document.getElementById("btn-add-escala").onclick=()=>addEscalaRow();

function addLitRow(titulo="",musicas=""){
  const wrap=document.getElementById("liturgia-list");
  const row=document.createElement("div");row.className="dyn-item";row.style.alignItems="flex-start";
  row.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;gap:6px"><input class="finput" placeholder="Título do passo (ex: Louvor animado)" value="${titulo}" data-field="titulo"><input class="finput" placeholder="Músicas (opcional, separadas por vírgula)" value="${musicas}" data-field="musicas"></div><button class="dyn-del" title="Remover" style="margin-top:2px">✕</button>`;
  row.querySelector(".dyn-del").onclick=()=>row.remove();
  wrap.appendChild(row);
}
document.getElementById("btn-add-lit").onclick=()=>addLitRow();

function addMatRow(nome="",url="",emoji="🔗"){
  const wrap=document.getElementById("materiais-list");
  const row=document.createElement("div");row.className="dyn-item";
  row.innerHTML=`<input class="finput" style="max-width:38px;text-align:center;padding:10px 6px" placeholder="🔗" value="${emoji}" data-field="emoji"><input class="finput" style="max-width:140px" placeholder="Nome" value="${nome}" data-field="nome"><input class="finput" placeholder="URL ou link" value="${url}" data-field="url"><button class="dyn-del" title="Remover">✕</button>`;
  row.querySelector(".dyn-del").onclick=()=>row.remove();
  wrap.appendChild(row);
}
document.getElementById("btn-add-mat").onclick=()=>addMatRow();

function addSetGroup(titulo="",musicas=[]){
  const wrap=document.getElementById("setlist-groups");
  const block=document.createElement("div");block.className="sg-block";
  block.innerHTML=`
    <div class="sg-header">
      <input class="finput" placeholder="Nome do grupo (ex: Agitadas)" value="${titulo}" data-field="titulo">
      <button class="dyn-del" title="Remover grupo">✕</button>
    </div>
    <div class="sg-songs dyn-list"></div>
    <button class="btn-add-item btn-add-sg-song" style="margin-top:6px">＋ Música</button>
  `;
  block.querySelector(".dyn-del").onclick=()=>block.remove();
  block.querySelector(".btn-add-sg-song").onclick=()=>addSongRow(block.querySelector(".sg-songs"));
  musicas.forEach(m=>addSongRow(block.querySelector(".sg-songs"),m.nome||"",m.artista||"",m.tom||""));
  wrap.appendChild(block);
}
document.getElementById("btn-add-group").onclick=()=>addSetGroup();

function addSongRow(container,nome="",artista="",tom=""){
  const row=document.createElement("div");row.className="dyn-item";
  row.innerHTML=`<input class="finput" placeholder="Nome da música" value="${nome}" data-field="nome"><input class="finput" style="max-width:130px" placeholder="Artista" value="${artista}" data-field="artista"><input class="finput" style="max-width:64px;text-align:center" placeholder="Tom" value="${tom}" data-field="tom"><button class="dyn-del">✕</button>`;
  row.querySelector(".dyn-del").onclick=()=>row.remove();
  container.appendChild(row);
}

const DEFAULT_DRESSCODE={
  "Firenight":["#111111","#ffffff","#ffd000","#ff6a00","#d94010","#cc1111"],
  "Culto Regular":["#111111","#ffffff","#002366"],
};

const DEFAULT_MATERIAIS=[
  {emoji:"▶️",nome:"Play no YouTube",url:""},
  {emoji:"♫",nome:"Play no Spotify",url:""},
  {emoji:"🎸",nome:"PDF das Cifras",url:""},
  {emoji:"📄",nome:"PDF das Letras",url:""},
  {emoji:"📁",nome:"Medley no Drive",url:""},
];

const DEFAULT_ESCALA=[
  {emoji:"🎹",funcao:"Teclas",nome:""},
  {emoji:"🥁",funcao:"Bateria",nome:""},
  {emoji:"🎸",funcao:"Guitarra",nome:""},
  {emoji:"🎸",funcao:"Baixo",nome:""},
  {emoji:"🎤",funcao:"Ministra",nome:""},
  {emoji:"🎤",funcao:"Vocais",nome:""},
  {emoji:"🎛️",funcao:"Sonoplasta",nome:""},
];

// ── TIPO CHANGE (mostra/oculta seções do form) ──
window.handleTipoChange=function(){
  const tipo=document.getElementById("f-tipo").value;
  const isAviso=tipo==="Aviso / Sem Escala";
  document.getElementById("f-aviso-wrap").style.display=isAviso?"block":"none";
  document.getElementById("form-sections-normal").style.display=isAviso?"none":"block";
  if(!editingEventId&&DEFAULT_DRESSCODE[tipo]){
    dcSelected=[...DEFAULT_DRESSCODE[tipo]];
    renderDcColors();
  }
};

// ── OPEN FORM ──
function openEventForm(ev){
  editingEventId=ev?ev.id:null;
  document.getElementById("form-title").textContent=ev?"Editar Evento":"Novo Evento";
  document.getElementById("btn-delete-event").style.display=ev?"inline-flex":"none";

  // clear
  document.getElementById("f-name").value=ev?.nome||"";
  document.getElementById("f-tipo").value=ev?.tipo||"Firenight";
  document.getElementById("f-data").value=ev?.data||"";
  document.getElementById("f-hora").value=ev?.hora||"17:00";
  document.getElementById("f-versiculo").value=ev?.versiculo||"";
  document.getElementById("f-foto").value=ev?.foto||"";
  document.getElementById("f-dc-obs").value=ev?.dresscode?.obs||"";
  document.getElementById("f-aviso").value=ev?.aviso||"";
  document.getElementById("f-ensaio-inst").value=ev?.horarioEnsaioInstrumental||"";
  document.getElementById("f-ensaio-vocal").value=ev?.horarioEnsaioVocal||"";
  document.getElementById("f-obs").value=ev?.obs||"";
  document.getElementById("escala-list").innerHTML="";
  document.getElementById("liturgia-list").innerHTML="";
  document.getElementById("materiais-list").innerHTML="";
  document.getElementById("setlist-groups").innerHTML="";
  dcSelected=ev?.dresscode?.cores?[...ev.dresscode.cores]:[];

  if(ev){
    (ev.escala||[]).forEach(p=>addEscalaRow(p.funcao||"",p.emoji||"",p.nome||""));
    (ev.liturgia||[]).forEach(p=>addLitRow(p.titulo||"",p.musicas||""));
    (ev.materiais||[]).forEach(m=>addMatRow(m.nome||"",m.url||"",m.emoji||"🔗"));
    (ev.setlist||[]).forEach(g=>addSetGroup(g.titulo||"",g.musicas||[]));
  }else{
    // Novo evento: pré-preenche escala e materiais padrão
    DEFAULT_ESCALA.forEach(p=>addEscalaRow(p.funcao,p.emoji,p.nome));
    DEFAULT_MATERIAIS.forEach(m=>addMatRow(m.nome,m.url,m.emoji));
  }

  renderDcColors();
  handleTipoChange();
  showEventForm();
}

// ── COLLECT FORM DATA ──
function collectForm(){
  const escala=[];
  document.querySelectorAll("#escala-list .dyn-item").forEach(row=>{
    const emoji=row.querySelector("[data-field=emoji]")?.value.trim()||"";
    const funcao=row.querySelector("[data-field=funcao]")?.value.trim()||"";
    const nome=row.querySelector("[data-field=nome]")?.value.trim()||"";
    if(nome) escala.push({emoji,funcao,nome});
  });
  const setlist=[];
  document.querySelectorAll("#setlist-groups .sg-block").forEach(block=>{
    const titulo=block.querySelector("[data-field=titulo]")?.value.trim()||"";
    const musicas=[];
    block.querySelectorAll(".sg-songs .dyn-item").forEach(row=>{
      const nome=row.querySelector("[data-field=nome]")?.value.trim()||"";
      const artista=row.querySelector("[data-field=artista]")?.value.trim()||"";
      const tom=row.querySelector("[data-field=tom]")?.value.trim()||"";
      if(nome) musicas.push({nome,artista,tom});
    });
    if(titulo||musicas.length) setlist.push({titulo,musicas});
  });
  const liturgia=[];
  document.querySelectorAll("#liturgia-list .dyn-item").forEach(row=>{
    const titulo=row.querySelector("[data-field=titulo]")?.value.trim()||"";
    const musicas=row.querySelector("[data-field=musicas]")?.value.trim()||"";
    if(titulo) liturgia.push({titulo,musicas});
  });
  const materiais=[];
  document.querySelectorAll("#materiais-list .dyn-item").forEach(row=>{
    const emoji=row.querySelector("[data-field=emoji]")?.value.trim()||"🔗";
    const nome=row.querySelector("[data-field=nome]")?.value.trim()||"";
    const url=row.querySelector("[data-field=url]")?.value.trim()||"";
    if(url) materiais.push({emoji,nome,url});
  });
  return{
    nome:document.getElementById("f-name").value.trim(),
    tipo:document.getElementById("f-tipo").value,
    aviso:document.getElementById("f-aviso").value.trim(),
    data:document.getElementById("f-data").value,
    hora:document.getElementById("f-hora").value,
    versiculo:document.getElementById("f-versiculo").value.trim(),
    foto:document.getElementById("f-foto").value.trim(),
    horarioEnsaioInstrumental:document.getElementById("f-ensaio-inst").value,
    horarioEnsaioVocal:document.getElementById("f-ensaio-vocal").value,
    obs:document.getElementById("f-obs").value.trim(),
    escala,setlist,liturgia,materiais,
    dresscode:{cores:[...dcSelected],obs:document.getElementById("f-dc-obs").value.trim()},
    updatedAt:new Date().toISOString(),
  };
}

// ── SAVE EVENT ──
document.getElementById("btn-save-event").onclick=async()=>{
  const data=collectForm();
  if(!data.nome){toast("Digite o nome do evento","err");return}
  if(!data.data){toast("Selecione a data","err");return}
  const btn=document.getElementById("btn-save-event");
  btn.disabled=true;
  try{
    if(editingEventId){
      await updateDoc(doc(db,EVENTS_COL,editingEventId),data);
      toast("Evento atualizado ✓");
    }else{
      await addDoc(collection(db,EVENTS_COL),{...data,createdAt:new Date().toISOString()});
      toast("Evento criado! 🔥");
    }
    await loadEvents();
    showAdminList();
  }catch(e){console.error(e);toast("Erro ao salvar","err")}
  finally{btn.disabled=false;}
};

// ── DELETE EVENT ──
document.getElementById("btn-delete-event").onclick=async()=>{
  if(!editingEventId)return;
  if(!confirm("Excluir este evento? Esta ação não pode ser desfeita."))return;
  try{
    await deleteDoc(doc(db,EVENTS_COL,editingEventId));
    toast("Evento excluído","err");
    await loadEvents();
    closeAdmin();
    closeEventDetail();
  }catch(e){console.error(e);toast("Erro ao excluir","err")}
};

// ── EDIT FROM DETAIL ──
// (handler is set inside openEventDetail, using ev.id via closure)
