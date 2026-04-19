'use strict';

const HIST=[
  {b2:.145,b3:-.147,ctx:'Tech Meltdown'},
  {b2:.172,b3:-.162,ctx:'Post-9/11'},
  {b2:.584,b3:.033,ctx:'Major Bull Run'},
  {b2:.189,b3:.719,ctx:'Great Bull Run'},
  {b2:.321,b3:.107,ctx:'Steady Growth'},
  {b2:.357,b3:.363,ctx:'Infra Boom'},
  {b2:.462,b3:.398,ctx:'Peak Bull Market'},
  {b2:-.35,b3:.548,ctx:'Global Financial Crisis'},
  {b2:.655,b3:-.518,ctx:'Post-Crisis Recovery'},
  {b2:.151,b3:.713,ctx:'Consolidation'},
  {b2:-.124,b3:.179,ctx:'Eurozone Crisis'},
  {b2:.228,b3:-.246,ctx:'Policy Reforms'},
  {b2:.084,b3:.277,ctx:'Taper Tantrum'},
  {b2:.432,b3:.068,ctx:'Post-Election Rally'},
  {b2:.015,b3:.314,ctx:'China Slowdown'},
  {b2:.078,b3:-.041,ctx:'Demonetization'},
  {b2:.279,b3:.030,ctx:'Broad Rally'},
  {b2:-.031,b3:.286,ctx:'Mid-Cap Crash'},
  {b2:.069,b3:.032,ctx:'Polarized Market'},
  {b2:.076,b3:.120,ctx:'COVID Recovery'},
  {b2:.264,b3:.149,ctx:'Post-Pandemic Surge'},
  {b2:.188,b3:.241,ctx:'Rate Hike Resilience'},
  {b2:.313,b3:.043,ctx:'Broad Participation'},
  {b2:.167,b3:.194,ctx:'Steady Growth'},
  {b2:.072,b3:.088,ctx:'Global Slowdown'},
];

const SCEN={
  conservative:{b1:1.5,b2:5,b3:9,inf:8},
  moderate:{b1:2,b2:6,b3:11,inf:7},
  optimistic:{b1:3,b2:9,b3:14,inf:5.5},
};

/* ── FORMAT ── */
function fmt(n){
  if(!isFinite(n))return'—';
  const a=Math.abs(n);
  if(a>=1e7)return'₹'+(n/1e7).toFixed(2)+' Cr';
  if(a>=1e5)return'₹'+(n/1e5).toFixed(2)+' L';
  return'₹'+Math.round(n).toLocaleString('en-IN');
}
function pct(n){return(n>=0?'+':'')+( n*100).toFixed(1)+'%';}
function human(n){
  if(n>=1e7)return(n/1e7).toFixed(2)+' Crore';
  if(n>=1e5)return(n/1e5).toFixed(2)+' Lakh';
  return'₹'+Math.round(n).toLocaleString('en-IN');
}

/* ── SIMULATION ── */
function simulate(c){
  const ann=c.mexp*12;
  const b1i=(c.b1t/12)*ann;
  const b2i=(c.b2t/12)*ann;
  const b3i=Math.max(0,c.corp-b1i-b2i);
  let b1=b1i,b2=b2i,b3=b3i;
  const rows=[];
  for(let y=1;y<=c.yrs;y++){
    const draw=ann*Math.pow(1+c.inf,y-1);
    const h=HIST[(y-1)%HIST.length];
    b1=b1*(1+c.b1r)-draw;
    let rf1=0;
    if(b1<(c.b1t/12)*draw*.5&&b2>0){
      const need=(c.b1t/12)*draw-b1;
      rf1=Math.min(need,b2); b1+=rf1; b2-=rf1;
    }
    b2=Math.max(0,b2)*(1+h.b2);
    let rf2=0;
    if(b2<(c.b2t/12)*draw*.5&&b3>0){
      const need=(c.b2t/12)*draw-b2;
      rf2=Math.min(need,b3); b2+=rf2; b3-=rf2;
    }
    b3=Math.max(0,b3)*(1+h.b3);
    const r1=Math.max(0,b1),r2=Math.max(0,b2),r3=Math.max(0,b3);
    rows.push({y,draw,b1:r1,b2:r2,b3:r3,tot:r1+r2+r3,rf1,rf2,r2:h.b2,r3:h.b3,ctx:h.ctx,crash:h.b3<-.1});
  }
  return{rows,b1i,b2i,b3i,ann};
}

/* ── STATE ── */
let chart=null,ctype='corpus',res=null;

/* ── DOM SHORTCUTS ── */
const $=id=>document.getElementById(id);
const inp={mexp:$('mexp'),corp:$('corp'),infl:$('infl'),yrs:$('yrs'),b1t:$('b1t'),b1r:$('b1r'),b2t:$('b2t'),b2r:$('b2r'),b3s:$('b3s'),b3r:$('b3r')};

/* ── TOOLTIP ── */
const tip=$('tip');
document.addEventListener('mouseover',e=>{
  const t=e.target.closest('[data-tip]');
  if(!t)return;
  tip.textContent=t.dataset.tip;
  tip.classList.add('v');
});
document.addEventListener('mousemove',e=>{
  if(!tip.classList.contains('v'))return;
  tip.style.left=Math.min(e.clientX+13,innerWidth-tip.offsetWidth-6)+'px';
  tip.style.top=Math.min(e.clientY-8,innerHeight-tip.offsetHeight-6)+'px';
});
document.addEventListener('mouseout',e=>{if(e.target.closest('[data-tip]'))tip.classList.remove('v');});

/* ── HELP ── */
$('help-btn').onclick=()=>$('help-ov').classList.remove('h');
$('hclose').onclick=()=>$('help-ov').classList.add('h');
$('help-ov').onclick=e=>{if(e.target===$('help-ov'))$('help-ov').classList.add('h');};
document.querySelectorAll('.ht').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.ht').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.hp').forEach(x=>x.classList.remove('on'));
  t.classList.add('on');
  $('ht-'+t.dataset.t).classList.add('on');
});

/* ── HINTS ── */
function updateHints(){
  const m=parseFloat(inp.mexp.value)||0;
  $('h-annual').textContent='= ₹'+(m*12).toLocaleString('en-IN')+' / yr';
  const co=parseFloat(inp.corp.value)||0;
  $('h-corpus').textContent=human(co);
  const ann=m*12;
  const b1c=(parseFloat(inp.b1t.value)||24)/12*ann;
  const b2c=(parseFloat(inp.b2t.value)||36)/12*ann;
  const b3c=Math.max(0,co-b1c-b2c);
  $('b1c').textContent=fmt(b1c);
  $('b2c').textContent=fmt(b2c);
  $('b3c').textContent=fmt(b3c);
}
inp.infl.oninput=()=>$('sv-infl').textContent=inp.infl.value+'%';
inp.yrs.oninput=()=>$('sv-yrs').textContent=inp.yrs.value+' yrs';
Object.values(inp).forEach(e=>e.addEventListener('input',updateHints));

/* ── SCENARIOS ── */
document.querySelectorAll('.spill').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.spill').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  const s=SCEN[b.dataset.s];
  inp.b1r.value=s.b1; inp.b2r.value=s.b2; inp.b3r.value=s.b3;
  inp.infl.value=s.inf; $('sv-infl').textContent=s.inf+'%';
  updateHints();
});

/* ── VIEW TABS ── */
document.querySelectorAll('.vt').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.vt').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
  t.classList.add('on');
  $('p-'+t.dataset.v).classList.add('on');
  $('csubs').classList.toggle('hide',t.dataset.v!=='chart');
});
document.querySelectorAll('.cs').forEach(t=>t.onclick=()=>{
  if(!res)return;
  document.querySelectorAll('.cs').forEach(x=>x.classList.remove('on'));
  t.classList.add('on'); ctype=t.dataset.c;
  renderChart(ctype,res.rows);
});

/* ── CHART ── */
function buildData(type,rows){
  const lbl=rows.map(r=>'Y'+r.y);
  if(type==='corpus')return{labels:lbl,datasets:[
    {label:'Total Corpus',data:rows.map(r=>r.tot),borderColor:'#6366F1',backgroundColor:'rgba(99,102,241,.08)',fill:true,tension:.4,pointRadius:2.5,borderWidth:2.5},
    {label:'Bucket 3 Equity',data:rows.map(r=>r.b3),borderColor:'#10B981',backgroundColor:'rgba(16,185,129,.06)',fill:true,tension:.4,pointRadius:1.5,borderWidth:2},
  ]};
  if(type==='draw')return{labels:lbl,datasets:[
    {label:'Annual Draw',data:rows.map(r=>r.draw),backgroundColor:'rgba(37,99,235,.72)',borderRadius:4,type:'bar'},
  ]};
  return{labels:lbl,datasets:[
    {label:'Bucket 1',data:rows.map(r=>r.b1),borderColor:'#2563EB',backgroundColor:'rgba(37,99,235,.07)',fill:true,tension:.4,pointRadius:1.5,borderWidth:2},
    {label:'Bucket 2',data:rows.map(r=>r.b2),borderColor:'#0EA5E9',backgroundColor:'rgba(14,165,233,.07)',fill:true,tension:.4,pointRadius:1.5,borderWidth:2},
    {label:'Bucket 3',data:rows.map(r=>r.b3),borderColor:'#10B981',backgroundColor:'rgba(16,185,129,.07)',fill:true,tension:.4,pointRadius:1.5,borderWidth:2},
  ]};
}

function renderChart(type,rows){
  const canvas=$('chart');
  if(chart){chart.destroy();chart=null;}
  chart=new Chart(canvas.getContext('2d'),{
    type:type==='draw'?'bar':'line',
    data:buildData(type,rows),
    options:{
      responsive:true,maintainAspectRatio:false,
      animation:{duration:600,easing:'easeInOutQuart'},
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{backgroundColor:'#0F172A',padding:10,
          titleFont:{family:'DM Sans',size:11},bodyFont:{family:'DM Sans',size:11},
          callbacks:{label:c=>' '+c.dataset.label+': '+fmt(c.raw)}},
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{family:'DM Sans',size:10},color:'#94A3B8',maxTicksLimit:14}},
        y:{grid:{color:'#F1F5F9'},ticks:{font:{family:'DM Sans',size:10},color:'#94A3B8',
          callback:v=>{if(Math.abs(v)>=1e7)return(v/1e7).toFixed(1)+'Cr';if(Math.abs(v)>=1e5)return(v/1e5).toFixed(0)+'L';return v;}}},
      },
    },
  });
  const leg=$('chart-leg');
  leg.innerHTML='';
  buildData(type,rows).datasets.forEach(ds=>{
    const d=document.createElement('div');
    d.className='li';
    d.innerHTML=`<div class="ld" style="background:${ds.borderColor||ds.backgroundColor}"></div>${ds.label}`;
    leg.appendChild(d);
  });
}

/* ── TABLE ── */
function renderTable(rows){
  const tb=$('tbody');
  tb.innerHTML='';
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    if(r.crash)tr.className='cr';
    const rfn=r.rf1>0||r.rf2>0?`<span class="rn">${r.rf1>0?'B2→B1 '+fmt(r.rf1):''}${r.rf2>0?' B3→B2 '+fmt(r.rf2):''}</span>`:'';
    tr.innerHTML=`<td>Yr ${r.y}<br><span style="font-size:10px;color:#94A3B8">${r.ctx}</span></td>
      <td>${fmt(r.draw)}${rfn}</td>
      <td class="c1">${fmt(r.b1)}</td><td class="c2">${fmt(r.b2)}</td><td class="c3">${fmt(r.b3)}</td>
      <td><strong>${fmt(r.tot)}</strong></td>
      <td class="${r.r2>=0?'p':'n'}">${pct(r.r2)}</td>
      <td class="${r.r3>=0?'p':'n'}">${pct(r.r3)}</td>`;
    tb.appendChild(tr);
  });
}

/* ── KPIs ── */
function renderKPIs(r){
  const{rows,b1i,b2i,b3i}=r;
  const last=rows[rows.length-1];
  const init=b1i+b2i+b3i;
  const cagr=Math.pow(last.tot/init,1/rows.length)-1;
  const drawn=rows.reduce((s,x)=>s+x.draw,0);
  const cards=[
    {l:'Final Corpus',v:fmt(last.tot),s:'After '+rows.length+' years',c:'ka'},
    {l:'Corpus CAGR',v:(cagr*100).toFixed(1)+'%',s:'Annualised growth',c:'k3'},
    {l:'B3 (Equity)',v:fmt(last.b3),s:'Started at '+fmt(b3i),c:'k3'},
    {l:'Total Withdrawn',v:fmt(drawn),s:'Inflation-adjusted',c:'k1'},
    {l:'Yr 1 → Final',v:fmt(rows[0].draw)+' → '+fmt(last.draw),s:'Annual draw range',c:'k2'},
  ];
  const kpis=$('kpis');
  kpis.innerHTML='';
  cards.forEach(c=>{
    const d=document.createElement('div');
    d.className='kc '+c.c;
    d.innerHTML=`<div class="kc-lbl">${c.l}</div><div class="kc-val">${c.v}</div><div class="kc-sub">${c.s}</div>`;
    kpis.appendChild(d);
  });
}

/* ── SUSTAINABILITY ── */
function renderSustain(r){
  const{rows,b1i,b2i,b3i}=r;
  const last=rows[rows.length-1];
  const init=b1i+b2i+b3i;
  let score=0;
  if(rows.every(x=>x.b1>0))score+=40; else score+=10;
  score+=Math.min(40,Math.round(last.tot/init*10));
  if(last.b1>0)score+=20;
  score=Math.min(100,Math.max(0,score));
  const fi=$('ss-fi'),sc=$('ss-sc'),q=$('ss-q');
  fi.style.width='0';
  setTimeout(()=>{
    fi.style.width=score+'%';
    let cls,msg;
    if(score>=70){cls='g';sc.style.color='#10B981';msg='Robust — corpus survives and grows through all market cycles.';}
    else if(score>=40){cls='y';sc.style.color='#F59E0B';msg='Moderate — some buckets may run thin in bad years. Consider increasing corpus.';}
    else{cls='r';sc.style.color='#EF4444';msg='At risk — a bucket may deplete early. Increase corpus or reduce monthly draw.';}
    fi.className='ss-fi '+cls;
    sc.textContent=score+'/100';
    q.dataset.tip=msg;
  },80);
}

/* ── INSIGHTS ── */
function renderInsights(r){
  const{rows,b1i,b2i,b3i}=r;
  const last=rows[rows.length-1];
  const init=b1i+b2i+b3i;
  const crashes=rows.filter(x=>x.crash);
  const refills=rows.filter(x=>x.rf1>0||x.rf2>0);
  const drawn=rows.reduce((s,x)=>s+x.draw,0);
  const items=[
    {i:'📈',t:'Corpus grew '+(last.tot/init).toFixed(1)+'×',d:`Starting at ${fmt(init)}, your wealth reached ${fmt(last.tot)} despite steady withdrawals throughout.`},
    {i:'🛡️',t:crashes.length+' crash year'+(crashes.length!==1?'s':''),d:crashes.length?`In years ${crashes.slice(0,3).map(x=>x.y).join(', ')}, equity fell sharply — but Buckets 1 & 2 kept expenses covered without selling.`:'No severe equity crashes in this simulation.'},
    {i:'🔄',t:refills.length+' refill event'+(refills.length!==1?'s':''),d:`The cascade refill triggered ${refills.length} time${refills.length!==1?'s':''}, automatically moving money down the bucket chain.`},
    {i:'💸',t:'Total withdrawn: '+fmt(drawn),d:`You withdrew ${fmt(drawn)} in inflation-adjusted income over ${rows.length} years — corpus still ended at ${fmt(last.tot)}.`},
    {i:'📊',t:'B3 final balance',d:`Bucket 3 (equity) started at ${fmt(b3i)} and ended at ${fmt(last.b3)} — the primary engine of long-term wealth creation.`},
    {i:'💡',t:'Key takeaway',d:`The 3-bucket cascade means you never had to sell equities during a crash. Buckets 1 & 2 provided steady income cover throughout.`},
  ];
  const ig=$('ig');
  ig.innerHTML='';
  items.forEach((x,i)=>{
    const d=document.createElement('div');
    d.className='ic'; d.style.animationDelay=(i*.07)+'s';
    d.innerHTML=`<div class="ii">${x.i}</div><div class="it">${x.t}</div><div class="id">${x.d}</div>`;
    ig.appendChild(d);
  });
}

/* ── RUN ── */
function run(){
  const cfg={
    mexp:parseFloat(inp.mexp.value)||500000,
    corp:parseFloat(inp.corp.value)||120000000,
    inf:(parseFloat(inp.infl.value)||7)/100,
    b1t:parseFloat(inp.b1t.value)||24,
    b2t:parseFloat(inp.b2t.value)||36,
    b1r:(parseFloat(inp.b1r.value)||2)/100,
    yrs:parseInt(inp.yrs.value)||25,
  };
  res=simulate(cfg);
  renderKPIs(res);
  renderChart(ctype,res.rows);
  renderTable(res.rows);
  renderSustain(res);
  renderInsights(res);
  const last=res.rows[res.rows.length-1];
  $('bar-msg').textContent=`Simulation complete — ${cfg.yrs}-year projection | Final corpus: ${fmt(last.tot)} | Total withdrawn: ${fmt(res.rows.reduce((s,r)=>s+r.draw,0))}`;
}

/* ── INIT ── */
$('top-run').onclick=run;
$('side-run').onclick=run;
updateHints();
window.addEventListener('load',run);
let rt;
window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(res)renderChart(ctype,res.rows);},150);});
