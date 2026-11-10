#!/usr/bin/env node
/* Print-and-play assets for Kaiten, built from the same data and art as the app.

   node tools/make_print.cjs            -> print/*.pdf and print/contact-*.png
   node tools/make_print.cjs --singles  -> also print/singles/*.png (one file per card face,
                                           300 dpi with 3 mm bleed, for print-on-demand services)

   Card, station and token text comes from the engine script in index.html, so a rules change
   in the app is one re-run away from the printed game. Sizes are in mm; change them below. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'print');
const CARD = { w: 63, h: 88, bleed: 3 };   // standard poker size
const TOKEN = 22;                          // mm across; VP, ingredient and chef tokens
const DPI = 300;
const SINGLES = process.argv.includes('--singles');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const engine = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const dishArt = html.match(/const DISH_ART=\{[\s\S]*?\};/)[0];

/* ---------- page-side code: builds every card, token and the board as DOM ---------- */
const pageScript = String.raw`
const CARD=${JSON.stringify(CARD)}, TOKEN=${TOKEN};
const A=k=>'art/'+k+'.webp';
const dishArtOf=id=>A('dish-'+DISH_ART[id]);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CAT_KJ={nigiri:'握',maki:'巻',sashimi:'刺',special:'特'};
const PCOL=['#2f62c4','#d24a2f','#d9a51a','#1f9488'];
const ing=(k,cls)=>'<span class="ing '+(cls||'')+'"><img src="'+A('ing-'+k)+'" alt=""></span>';

// what a dish's bonus strip says: group (colour), label, icon and a short line
function bonusOf(d){
  const a=d.ab; if(!a) return null;
  const st=k=>'<img src="'+A('st-'+k)+'" alt="">';
  switch(a.t){
    case 'start': return {g:'round',label:'Each round',icon:a.g==='F'?st('market'):'<img src="'+A('ing-'+a.g)+'" alt="">',text:a.g==='F'?'+1 fish from the bag':'+1 '+ING_NAME[a.g]};
    case 'market': return {g:'st',label:'Fish Market',icon:st('market'),text:'+1 fish'};
    case 'pantry': return {g:'st',label:'Pantry',icon:st('pantry'),text:'+1 Rice or Nori'};
    case 'belt': return {g:'st',label:'Kaiten Belt',icon:st('belt'),text:'+1 wasabi'};
    case 'cook': return {g:'vp',label:'When serving',icon:'<span class="catdot c-'+a.c+'"></span>',text:'+2 VP for each later '+CAT_NAME[a.c]};
    case 'end': return {g:'end',label:'Closing',icon:'<span class="catdot c-'+a.c+'"></span>',text:'+1 VP per '+CAT_NAME[a.c]+' served'};
    case 'regular': return {g:'end',label:'Closing',icon:'<span class="regdot"></span>',text:'+2 VP per regular won'};
    case 'now': return {g:'once',label:'When served',icon:'<img src="'+A('ing-W')+'" alt="">',text:'Gain '+a.w+' wasabi'};
  }
}

function frame(cls,inner,extra){return '<div class="card '+cls+'"'+(extra||'')+'><div class="trim">'+inner+'</div></div>';}

function dishFront(d){
  const b=bonusOf(d);
  return frame('dish c-'+d.cat,
    '<div class="hd"><span class="kind">'+CAT_NAME[d.cat]+'</span><span class="nm">'+esc(d.name)+'</span></div>'+
    '<div class="vp"><b>'+d.vp+'</b><small>VP</small></div>'+
    '<div class="plate"><img src="'+dishArtOf(d.id)+'" alt=""></div>'+
    '<div class="cost">'+[...d.cost].map(k=>ing(k)).join('')+'</div>'+
    '<div class="strip '+(b?'g-'+b.g:'g-none')+'"><span class="tab"><b>'+CAT_KJ[d.cat]+'</b><small>'+CAT_NAME[d.cat]+'</small></span>'+
      (b?'<span class="bi">'+b.icon+'</span><span class="bt"><small>'+b.label+'</small>'+b.text+'</span>':'<span class="bt plain">No bonus</span>')+'</div>');
}
function dishBack(){
  return frame('back dishback','<div class="belt"></div><div class="disc"><span class="jp">回転寿司</span><span class="en">KAITEN</span><small>Dish</small></div>');
}

function reqHTML(q){
  if(q.cat){const e=Object.entries(q.cat); return e.map(([k,v])=>'<span class="want"><b>'+v+'×</b><span class="catdot big c-'+k+'"></span>'+CAT_NAME[k]+'</span>').join('');}
  if(q.fish) return '<span class="want"><b>'+q.n+'×</b>dishes with '+ing(q.fish,'sm')+'</span>';
  if(q.total) return '<span class="want"><b>'+q.total+'×</b>dishes of any kind</span>';
  if(q.allFish) return '<span class="want">one dish with each fish</span><span class="want fishrow">'+FISH.map(f=>ing(f,'sm')).join('')+'</span>';
  return '';
}
function guestFront(r){
  return frame('guest',
    '<div class="hd"><span class="kind">Regular · 常連</span><span class="nm">'+esc(r.name)+'</span></div>'+
    '<div class="vp"><b>'+r.vp+'</b><small>VP</small></div>'+
    '<div class="portrait"><img src="'+A('reg-'+r.id)+'" alt=""></div>'+
    '<div class="wants"><small>Joins the first chef who has served</small>'+reqHTML(r.req)+'</div>');
}
function guestBack(){return frame('back guestback','<div class="disc"><span class="jp">常連</span><span class="en">REGULAR</span></div>');}

function chefFront(c,i){
  return frame('chef','<div class="hd" style="background:'+PCOL[i]+'"><span class="kind">Chef · '+['Blue','Red','Yellow','Teal'][i]+'</span><span class="nm">'+esc(c.name)+'</span></div>'+
    '<div class="portrait" style="--pc:'+PCOL[i]+'"><img src="'+A('chef-'+c.art)+'" alt=""></div>'+
    '<div class="title">'+esc(c.title)+'</div><div class="ability"><small>Ability</small>'+esc(c.text)+'</div>',' style="--pc:'+PCOL[i]+'"');
}
function chefBack(i){
  return frame('back aid','<div class="aidh" style="background:'+PCOL[i]+'">A round</div><ol>'+
    '<li><b>Morning.</b> Collect your <i>Each round</i> bonuses.</li>'+
    '<li><b>Place chefs</b> one at a time, clockwise, doing each station at once.</li>'+
    '<li><b>The belt turns.</b> Last-lap dish leaves, the rest slide right and gain 1 wasabi, refill from the left.</li>'+
    '<li><b>Catch-up.</b> 6+ VP behind the leader: +1 wasabi; 15+: +2.</li></ol>'+
    '<div class="aidh small" style="background:'+PCOL[i]+'">Closing</div><p>Plates · 4 VP per Nigiri + Maki + Sashimi set · regulars · closing bonuses · 1 VP per 3 leftover ingredients · −1 VP per unserved order.</p>');
}

function eventFront(e){
  return frame('event','<div class="hd"><span class="kind">Event · rounds 2, 4, 6</span><span class="nm">'+esc(e.name)+'</span></div>'+
    '<div class="kj">'+e.kj+'</div><div class="etext">'+esc(e.text)+'</div><div class="foot">Lasts this round</div>');
}
function eventBack(){return frame('back eventback','<div class="disc"><span class="jp">出来事</span><span class="en">EVENT</span></div>');}

/* ---------- tokens ---------- */
const TINT={R:['#f6efe0','#b9a27a'],N:['#dde6d6','#2c4a35'],T:['#f8dcdc','#b0283a'],S:['#fde4d0','#e06a2c'],U:['#ecdfcd','#6b4423'],E:['#fde2e8','#d76a7e'],W:['#e6f1d2','#6d9a3a']};
const tok=(cls,inner,style)=>'<div class="tok '+cls+'"'+(style?' style="'+style+'"':'')+'>'+inner+'</div>';
const ingTok=k=>tok('ingt','<img src="'+A('ing-'+k)+'" alt="">','--bg:'+TINT[k][0]+';--ring:'+TINT[k][1]);
const VPC={1:['#fcf7ec','#c2342a','#c2342a'],3:['#e7bb4f','#8a6516','#2b1f14'],5:['#c2342a','#8f1f17','#fff'],10:['#21385b','#142640','#fff']};
const vpTok=n=>tok('vpt','<b>'+n+'</b><small>VP</small>','--bg:'+VPC[n][0]+';--ring:'+VPC[n][1]+';--fg:'+VPC[n][2]);
const chefTok=(c,i)=>tok('cheft','<img src="'+A('chef-'+c.art)+'" alt="">','--ring:'+PCOL[i]);

/* ---------- board ---------- */
function board(){
  const slot=(i)=>'<div class="bslot'+(i===4?' last':'')+'"><span class="slab">'+(i===0?'New':i===4?'Last lap':'')+'</span>'+
    (i===4?'<span class="bargain"><b>−1</b> ingredient<br>for whoever takes it</span>':'')+'<span class="wnote">wasabi here</span></div>';
  // how many chefs a station holds: one big number in the corner (with the 4-player count if it differs)
  const spots=(L)=>{const c2=L.cap(2), c4=L.cap(4);
    if(c4>20) return '<div class="cap"><b>∞</b><small>chefs</small></div>';
    return '<div class="cap"><b>'+c2+'</b><small>'+(c2===1?'chef':'chefs')+(c4!==c2?' · '+c4+' with 4 players':'')+'</small></div>';};
  const st=L=>'<div class="station"><div class="sh"><b>'+L.name+'</b><span class="skj">'+L.kj+'</span></div><p>'+esc(L.text)+'</p>'+
    '<div class="sfoot"><img class="sbig" src="'+A('st-'+L.id)+'" alt="">'+spots(L)+'</div></div>';
  // the round track is a single line under the stations
  const rounds='<div class="roundline"><b>Rounds</b><div class="lanterns">'+
    Array.from({length:ROUNDS},(_,i)=>'<span class="lan'+(EVENT_ROUNDS.includes(i+1)?' ev':'')+'"><b>'+(i+1)+'</b>'+(EVENT_ROUNDS.includes(i+1)?'<small>event</small>':'')+'</span>').join('')+'</div></div>';
  return '<div class="board"><div class="brand"><span class="jp">回転寿司</span><span class="en">KAITEN</span></div>'+
    '<div class="beltband"><div class="dir">The belt turns this way at the end of each round →</div><div class="slots">'+[0,1,2,3,4].map(slot).join('')+'</div></div>'+
    '<div class="mid"><div class="stations"><div class="station ice"><div class="sh"><b>Fish on the ice</b><span class="skj">氷</span></div><p>Lay 5 fish here. Refill to 5 from the fish bag after each visit.</p></div>'+
    LOCS.map(st).join('')+'</div></div>'+
    '<div class="foot">'+rounds+'<div class="rules"><span><b>Closing:</b> plates · 4 VP per Nigiri + Maki + Sashimi set · regulars · closing bonuses · 1 VP per 3 leftover ingredients · −1 VP per unserved order</span>'+
    '<span><b>Catch-up:</b> 6+ VP behind → +1 wasabi · 15+ → +2</span></div></div></div>';
}
`;

const CSS = String.raw`
@page{margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
body{font-family:"Zen Kaku Gothic New",system-ui,sans-serif;color:#2b1f14;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--ink:#2b1f14;--ink-2:#5b4733;--paper:#fcf7ec;--paper-2:#efe4cc;--indigo:#21385b;--lac:#c2342a;--lac-2:#8f1f17;--gold:#d2a43c;--wood-dk:#7a532b;
  --c-nigiri:#c8392b;--c-maki:#2c5a39;--c-sashimi:#e07a3f;--c-special:#c0921f;--disp:"Dela Gothic One","Zen Kaku Gothic New",sans-serif}
.c-nigiri{--cat:var(--c-nigiri)}.c-maki{--cat:var(--c-maki)}.c-sashimi{--cat:var(--c-sashimi)}.c-special{--cat:var(--c-special)}
img{display:block}

/* ---------- card: designed with bleed; .trim marks the cut line ---------- */
.card{position:relative;width:${CARD.w + 2 * CARD.bleed}mm;height:${CARD.h + 2 * CARD.bleed}mm;overflow:hidden;background:url(art/tex-paper.webp) 0 0/90mm,var(--paper)}
.trim{position:absolute;left:${CARD.bleed}mm;top:${CARD.bleed}mm;width:${CARD.w}mm;height:${CARD.h}mm}
.hd{position:absolute;left:-${CARD.bleed}mm;right:-${CARD.bleed}mm;top:-${CARD.bleed}mm;height:${16 + CARD.bleed}mm;padding:${CARD.bleed + 2.2}mm ${CARD.bleed + 16}mm 0 ${CARD.bleed + 4}mm;background:linear-gradient(rgba(255,255,255,.12),rgba(0,0,0,.12)),var(--cat,var(--indigo));color:#fff;display:flex;flex-direction:column;gap:.6mm}
.hd .kind{font-size:2.3mm;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.9}
.hd .nm{font-family:var(--disp);font-size:4.6mm;line-height:1.05}
.vp{position:absolute;right:2.5mm;top:5mm;width:14mm;height:14mm;border-radius:50%;background:var(--lac);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-8deg);box-shadow:inset 0 0 0 .7mm rgba(255,255,255,.4),0 .6mm 0 var(--lac-2);font-family:var(--disp);line-height:1}
.vp b{font-size:6mm;font-weight:400}.vp small{font-size:1.9mm;letter-spacing:.1em}
.ing{width:7.5mm;height:7.5mm;border-radius:50%;background:#fffdf8;box-shadow:0 0 0 .35mm var(--paper-2),0 .4mm .8mm rgba(0,0,0,.15);display:inline-flex;align-items:center;justify-content:center;flex:none}
.ing img{width:6mm;height:6mm;object-fit:contain}
.ing.sm{width:6mm;height:6mm;vertical-align:middle}.ing.sm img{width:4.8mm;height:4.8mm}
.catdot{display:inline-block;width:3.6mm;height:3.6mm;border-radius:50%;background:var(--cat);box-shadow:0 0 0 .4mm #fff;flex:none}
.catdot.big{width:4.4mm;height:4.4mm}
.regdot{display:inline-block;width:3.6mm;height:3.6mm;border-radius:50%;border:.7mm solid #ff8a6e;background:#fff}

.dish .plate{position:absolute;left:50%;top:19.5mm;width:39mm;height:39mm;margin-left:-19.5mm;border-radius:50%;background:radial-gradient(circle,#fff 0 60%,#f2ece0 61%);box-shadow:0 0 0 1.6mm var(--cat),0 0 0 2.3mm #fff,0 1.2mm 2.4mm rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center}
.dish .plate img{width:34mm;height:34mm;object-fit:contain}
.dish .cost{position:absolute;left:0;right:0;top:62mm;display:flex;justify-content:center;gap:1mm}
.strip{position:absolute;left:-${CARD.bleed}mm;right:-${CARD.bleed}mm;bottom:-${CARD.bleed}mm;height:${15 + CARD.bleed}mm;padding:0 ${CARD.bleed + 3}mm ${CARD.bleed}mm ${CARD.bleed}mm;display:flex;align-items:center;gap:2mm;color:#fff}
.strip .tab{align-self:stretch;width:14mm;margin-left:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--cat);padding-left:${CARD.bleed}mm;box-sizing:content-box;margin-left:-${CARD.bleed}mm}
.strip .tab b{font-family:var(--disp);font-weight:400;font-size:5.2mm;line-height:1}
.strip .tab small{font-size:1.8mm;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.strip .bi{width:9mm;height:9mm;border-radius:50%;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;flex:none}
.strip .bi img{width:6.6mm;height:6.6mm;object-fit:contain}
.strip .bt{display:flex;flex-direction:column;font-size:3mm;font-weight:900;line-height:1.15}
.strip .bt small{font-size:1.9mm;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.strip .bt.plain{font-size:2.6mm;opacity:.75;color:var(--ink-2)}
.g-round{background:#2f7d4a}.g-st{background:#7a532b}.g-vp{background:#c2342a}.g-end{background:#21385b}.g-once{background:#8a7a62}.g-none{background:var(--paper-2)}

.portrait{position:absolute;left:50%;top:19mm;width:38mm;height:38mm;margin-left:-19mm;border-radius:50%;overflow:hidden;box-shadow:0 0 0 1.4mm var(--pc,var(--indigo)),0 0 0 2.1mm #fff,0 1.2mm 2.4mm rgba(0,0,0,.25);background:#f6ecd8}
.portrait img{width:100%;height:100%;object-fit:cover}
.guest .wants{position:absolute;left:4mm;right:4mm;top:61mm;bottom:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2mm;border-top:.3mm dashed #c9b894;padding-top:1.5mm}
.guest .wants small{font-size:2.2mm;color:var(--ink-2);letter-spacing:.04em}
.want{display:inline-flex;align-items:center;gap:1.2mm;font-size:3.3mm;font-weight:900}
.want b{font-family:var(--disp);font-weight:400;font-size:3.8mm}
.fishrow{gap:.8mm}
.guest .wants{flex-wrap:wrap}

.chef .title{position:absolute;left:0;right:0;top:61mm;text-align:center;font-family:var(--disp);font-size:4mm;color:var(--pc)}
.chef .ability{position:absolute;left:5mm;right:5mm;top:68mm;bottom:5mm;border-radius:2mm;background:rgba(255,255,255,.6);box-shadow:inset 0 0 0 .4mm var(--pc);padding:1.6mm 2.4mm;font-size:3mm;font-weight:700;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:.5mm}
.chef .ability small{font-size:1.9mm;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2)}

.guest .hd{background:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.1)),url(art/tex-noren.webp) 0 0/60mm,var(--indigo)}
.event .hd{background:linear-gradient(rgba(255,255,255,.1),rgba(0,0,0,.15)),#8f1f17}
.event .kj{position:absolute;left:50%;top:22mm;width:30mm;height:30mm;margin-left:-15mm;border-radius:50%;background:#ff6a3d;color:#fff;font-family:var(--disp);font-size:13mm;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.4mm #fff,0 0 4mm 1mm rgba(255,120,60,.6)}
.event .etext{position:absolute;left:5mm;right:5mm;top:57mm;font-size:3mm;line-height:1.35;text-align:center;font-weight:500}
.event .foot{position:absolute;left:0;right:0;bottom:3mm;text-align:center;font-size:2.2mm;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2);font-weight:900}

.back .disc{position:absolute;left:50%;top:50%;width:40mm;height:40mm;margin:-20mm 0 0 -20mm;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;color:#fff}
.back .jp{font-family:var(--disp);font-size:7mm;line-height:1}.back .en{font-family:var(--disp);font-size:2.8mm;letter-spacing:.4em;margin-right:-.4em;color:#ffd27a}
.back small{font-size:2mm;letter-spacing:.2em;text-transform:uppercase;opacity:.8}
.dishback{background:url(art/tex-belt.webp) 0 0/40mm 100%,#8d989b}
.dishback .belt{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 9mm,rgba(0,0,0,.12) 9mm 9.4mm)}
.dishback .disc{background:radial-gradient(circle,#c2342a 0 62%,#fff 63% 70%,#c2342a 71%);box-shadow:0 1.5mm 4mm rgba(0,0,0,.4)}
.guestback{background:linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.15)),url(art/tex-noren.webp) 0 0/60mm,#21385b}
.guestback .disc{box-shadow:inset 0 0 0 .8mm #ffd27a}
.eventback{background:radial-gradient(circle at 50% 45%,#ff6a3d,#8f1f17 70%)}
.eventback .disc{box-shadow:inset 0 0 0 .8mm #fff}
.aid .trim{padding:5mm 5mm 4mm;display:flex;flex-direction:column;gap:1.6mm;font-size:2.65mm;line-height:1.3}
.aidh{color:#fff;font-family:var(--disp);font-size:3.6mm;padding:1mm 2.5mm;border-radius:1.2mm}
.aidh.small{font-size:3mm}
.aid ol{margin:0;padding-left:4mm;display:flex;flex-direction:column;gap:1mm}.aid p{margin:0}

/* ---------- print sheets ---------- */
.sheet{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}
.sheet .grid{position:absolute;left:${(210 - 3 * CARD.w) / 2}mm;top:${(297 - 3 * CARD.h) / 2}mm;display:grid;grid-template-columns:repeat(3,${CARD.w}mm);grid-auto-rows:${CARD.h}mm}
.cell{position:relative;width:${CARD.w}mm;height:${CARD.h}mm;overflow:hidden}
.cell>.card{position:absolute;left:-${CARD.bleed}mm;top:-${CARD.bleed}mm}
.cut{position:absolute;background:#999}
.label{position:absolute;left:10mm;bottom:5mm;font-size:2.6mm;color:#888}

/* ---------- tokens ---------- */
.tok{width:${TOKEN}mm;height:${TOKEN}mm;border-radius:50%;position:relative;display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:hidden}
.vpt{background:var(--bg);color:var(--fg);box-shadow:inset 0 0 0 1.1mm var(--ring),inset 0 0 0 1.7mm rgba(255,255,255,.45);font-family:var(--disp);line-height:1}
.vpt b{font-size:8.5mm;font-weight:400}.vpt small{font-size:2.2mm;letter-spacing:.12em}
.ingt{background:radial-gradient(circle,#fff 0 30%,var(--bg) 70%);box-shadow:inset 0 0 0 1.1mm var(--ring)}
.ingt img{width:15mm;height:15mm;object-fit:contain}
.cheft{background:#f6ecd8;box-shadow:inset 0 0 0 1.4mm var(--ring)}
.cheft img{width:100%;height:100%;object-fit:cover;clip-path:circle(44%)}
.firstt{width:30mm;height:30mm;background:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.1)),url(art/tex-noren.webp) 0 0/40mm,#21385b;color:#fff;box-shadow:inset 0 0 0 1.2mm #ffd27a}
.firstt b{font-family:var(--disp);font-size:10mm;font-weight:400;line-height:1}.firstt small{font-size:2.4mm;letter-spacing:.2em;font-weight:900}
.roundt{background:radial-gradient(circle,#ffb35c,#ff6a3d 70%);color:#fff;box-shadow:inset 0 0 0 1.1mm #8f1f17}
.roundt b{font-family:var(--disp);font-size:7mm;font-weight:400;line-height:1}.roundt small{font-size:2mm;letter-spacing:.14em;font-weight:900}
.toksheet{display:flex;flex-wrap:wrap;align-content:flex-start;gap:3mm;padding:12mm 11mm}
.toksheet .tok{outline:.2mm solid #bbb;outline-offset:.4mm}
.toksheet h3{width:100%;margin:2mm 0 0;font-size:3mm;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#888}

/* ---------- board (A3 landscape) ---------- */
.boardpage{width:420mm;height:297mm;position:relative;overflow:hidden}
.board{position:absolute;inset:0;padding:7mm 8mm 6mm;background:url(art/tex-ash.webp) 0 0/300mm auto,#e6cd9f;display:flex;flex-direction:column;gap:4mm}
.brand{position:absolute;right:9mm;top:6mm;display:flex;flex-direction:column;align-items:flex-end;color:var(--indigo)}
.brand .jp{font-family:var(--disp);font-size:10mm;line-height:1}.brand .en{font-family:var(--disp);font-size:3.4mm;letter-spacing:.5em;margin-right:-.5em;color:var(--lac)}
.beltband{border-radius:6mm;padding:3mm 5mm 4mm;background:url(art/tex-belt.webp) 0 0/60mm 100%,#8d989b;box-shadow:inset 0 2.4mm 0 #b9c2c4,inset 0 -2.4mm 0 #4d5658,0 2mm 4mm rgba(0,0,0,.35);width:${5 * (CARD.w + 3) + 4 * 5 + 10}mm}
.dir{color:#fff;font-weight:900;font-size:3.2mm;letter-spacing:.06em;margin:0 0 2mm 1mm;text-shadow:0 .4mm 0 rgba(0,0,0,.4)}
.slots{display:flex;gap:5mm}
.bslot{position:relative;width:${CARD.w + 3}mm;height:${CARD.h + 3}mm;border-radius:3mm;border:.8mm dashed rgba(255,255,255,.75);background:rgba(255,255,255,.12)}
.bslot.last{border-color:#ffd27a;background:rgba(47,125,74,.25)}
.slab{position:absolute;left:2mm;top:-.2mm;transform:translateY(-55%);background:var(--paper);color:var(--ink);font-size:2.8mm;font-weight:900;letter-spacing:.14em;text-transform:uppercase;padding:.4mm 2mm;border-radius:1mm}
.slab:empty{display:none}
.bslot.last .slab{background:var(--lac);color:#fff}
.bargain{position:absolute;left:0;right:0;bottom:12mm;text-align:center;color:#fff;font-size:2.8mm;font-weight:900;line-height:1.2;text-shadow:0 .3mm .6mm rgba(0,0,0,.6)}
.bargain b{display:inline-block;background:#2f7d4a;border-radius:3mm;padding:.2mm 2mm;font-family:var(--disp);font-weight:400;font-size:4mm;box-shadow:0 0 0 .5mm #fff}
.wnote{position:absolute;left:0;right:0;bottom:2.5mm;text-align:center;font-size:2.3mm;color:rgba(255,255,255,.8);font-weight:700}
.mid{flex:1;display:flex;gap:5mm;min-height:0}
.station.ice{border-color:#7f9aa4;box-shadow:0 1.2mm 0 #7f9aa4;background:linear-gradient(rgba(255,255,255,.3),rgba(255,255,255,.3)),url(art/tex-ice-cover.webp) center/cover}
.station.ice p{color:#2c3c42}
.station.ice .skj{color:#21385b}
.sh{display:flex;align-items:center;gap:2mm}
.sh img{width:9mm;height:9mm;object-fit:contain}
.sh b{font-family:var(--disp);font-weight:400;font-size:6.4mm;line-height:1.05}
.station .skj{font-size:5mm}
.sfoot{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:2mm}
.sbig{width:40mm;height:40mm;object-fit:contain;filter:drop-shadow(0 1mm 1mm rgba(60,35,10,.3))}
.skj{margin-left:auto;font-family:var(--disp);color:var(--lac);font-size:4mm}
.stations{flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:1fr 1fr;gap:4mm}
.station{border:.6mm solid var(--wood-dk);border-radius:3mm;padding:2.4mm 2.4mm;min-width:0;background:linear-gradient(rgba(255,246,224,.45),rgba(255,246,224,.3)),url(art/tex-table.webp) 0 0/90mm,#f0dbb0;box-shadow:0 1.2mm 0 var(--wood-dk);display:flex;flex-direction:column;gap:1.4mm}
.station p{margin:0;font-size:3.2mm;line-height:1.3;color:var(--ink-2);font-weight:500}
.cap{display:flex;flex-direction:column;align-items:flex-end;line-height:1;color:var(--wood-dk)}
.cap b{font-family:var(--disp);font-weight:400;font-size:16mm}
.cap small{font-size:2.6mm;font-weight:900;letter-spacing:.06em;text-transform:uppercase;margin-top:1mm}
.spot{width:${TOKEN}mm;height:${TOKEN}mm;border-radius:50%;background:#caa66c;box-shadow:inset 0 1mm 1.6mm rgba(60,35,10,.45);display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-size:3.4mm;color:rgba(60,35,10,.55)}
.spot.p4{background:transparent;border:.6mm dashed #a27e47;box-shadow:none}
.open{margin-top:auto;border:.6mm dashed #a27e47;border-radius:3mm;padding:3mm;text-align:center;font-size:2.8mm;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7a532b}
.roundline{display:flex;align-items:center;gap:3mm}
.roundline>b{font-family:var(--disp);font-weight:400;font-size:4.4mm}
.lanterns{display:flex;gap:2mm}
.lan{width:13mm;height:11mm;border-radius:6.5mm/5.5mm;background:#3a4d6e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--disp);line-height:1}
.lan b{font-size:4.6mm;font-weight:400}.lan small{font-family:"Zen Kaku Gothic New";font-size:1.9mm;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.lan.ev{background:#ff6a3d}
.foot .rules{flex:1;display:flex;flex-direction:column;gap:1mm;align-items:flex-end;text-align:right}
.board>.foot{display:flex;align-items:center;gap:8mm;font-size:3mm;color:var(--ink);background:rgba(252,247,236,.75);border-radius:2mm;padding:2mm 4mm}

/* ---------- contact sheets (overview images) ---------- */
.contact{display:flex;flex-wrap:wrap;gap:4mm;padding:6mm;background:#2a221b;width:max-content}
.contact.wide{max-width:${8 * (CARD.w + 2 * CARD.bleed + 4) + 12}mm}
.contact .card{box-shadow:0 1mm 3mm rgba(0,0,0,.5)}
`;

function pageHTML(body, extraHead = '') {
  return `<!doctype html><html><head><meta charset="utf-8"><base href="file://${ROOT}/">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap">
<style>${CSS}</style>${extraHead}</head><body>${body}
<script>${engine}</script><script>${dishArt}</script><script>${pageScript}</script>
<script>window.__build&&window.__build()</script></body></html>`;
}

async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const scale = DPI / 96;
  const tmp = path.join(OUT, '.build.html');
  const open = async (builder, viewport, dsf = scale) => {
    fs.writeFileSync(tmp, pageHTML('<div id="root"></div>', `<script>window.__build=()=>{document.getElementById('root').innerHTML=(${builder})();}</script>`));
    const page = await browser.newPage({ viewport, deviceScaleFactor: dsf });
    await page.goto('file://' + tmp);
    await ready(page);
    return page;
  };

  // every card face in order, with the back that belongs behind it
  const deck = `(()=>{const f=[],b=[];
    DISHES.forEach(d=>{f.push(dishFront(d));b.push(dishBack());});
    CHARS.forEach((c,i)=>{f.push(chefFront(c,i));b.push(chefBack(i));});
    REGULARS.forEach(r=>{f.push(guestFront(r));b.push(guestBack());});
    EVENTS.forEach(e=>{f.push(eventFront(e));b.push(eventBack());});
    return {f,b};})()`;

  /* 1. print-and-play cards: A4, 3x3, fronts then mirrored backs for long-edge duplex */
  {
    const page = await open(`()=>{const {f,b}=${deck}; let out='';
      const cuts=()=>{let c=''; const L=(210-3*CARD.w)/2, T=(297-3*CARD.h)/2;
        for(let i=0;i<=3;i++){const x=L+i*CARD.w, y=T+i*CARD.h;
          c+='<div class="cut" style="left:'+x+'mm;top:0;width:.2mm;height:'+(T-1)+'mm"></div><div class="cut" style="left:'+x+'mm;bottom:0;width:.2mm;height:'+(T-1)+'mm"></div>';
          c+='<div class="cut" style="top:'+y+'mm;left:0;height:.2mm;width:'+(L-1)+'mm"></div><div class="cut" style="top:'+y+'mm;right:0;height:.2mm;width:'+(L-1)+'mm"></div>';}
        return c;};
      for(let p=0;p<f.length;p+=9){
        const fr=f.slice(p,p+9), bk=b.slice(p,p+9);
        out+='<div class="sheet"><div class="grid">'+fr.map(c=>'<div class="cell">'+c+'</div>').join('')+'</div>'+cuts()+'<div class="label">Kaiten · cards '+(p+1)+'–'+(p+fr.length)+' · fronts</div></div>';
        // backs: mirror each row so they line up when printed double-sided (flip on long edge)
        const rows=[]; for(let r=0;r<3;r++){const row=[0,1,2].map(cix=>bk[r*3+cix]); rows.push(row.reverse());}
        out+='<div class="sheet"><div class="grid">'+rows.flat().map(c=>'<div class="cell">'+(c||'')+'</div>').join('')+'</div>'+cuts()+'<div class="label">Kaiten · cards '+(p+1)+'–'+(p+fr.length)+' · backs (print double-sided, flip on long edge)</div></div>';
      }
      return out;}`, { width: 794, height: 1123 });
    await page.pdf({ path: path.join(OUT, 'kaiten-cards-A4.pdf'), width: '210mm', height: '297mm', printBackground: true });
    await page.close();
  }

  /* 2. tokens: A4 sheets */
  {
    const page = await open(`()=>{
      const rep=(n,f)=>Array.from({length:n},f).join('');
      const groups=[
        ['Tuna ×12',rep(12,()=>ingTok('T'))],['Salmon ×12',rep(12,()=>ingTok('S'))],['Eel ×12',rep(12,()=>ingTok('U'))],['Shrimp ×12',rep(12,()=>ingTok('E'))],
        ['Rice ×30',rep(30,()=>ingTok('R'))],['Nori ×20',rep(20,()=>ingTok('N'))],['Wasabi ×35',rep(35,()=>ingTok('W'))],
        ['VP 1 ×30',rep(30,()=>vpTok(1))],['VP 3 ×20',rep(20,()=>vpTok(3))],['VP 5 ×15',rep(15,()=>vpTok(5))],['VP 10 ×10',rep(10,()=>vpTok(10))],
        ['Chefs ×4 each',CHARS.map((c,i)=>rep(4,()=>chefTok(c,i))).join('')],
        ['Markers','<div class="tok firstt"><b>先</b><small>FIRST</small></div><div class="tok roundt"><b>回</b><small>ROUND</small></div>']];
      // pack whole groups onto A4 pages by height: a heading, then rows of 7 tokens
      const perRow=Math.floor((210-22+3)/(TOKEN+3)), avail=297-24-10; let pages=[[]], h=0;
      groups.forEach(([t,body])=>{const n=(body.match(/class="tok/g)||[]).length, gh=8+Math.ceil(n/perRow)*(TOKEN+3);
        if(h+gh>avail&&h){pages.push([]); h=0;} pages[pages.length-1].push('<h3>'+t+'</h3>'+body); h+=gh;});
      return pages.map((g,i)=>'<div class="sheet"><div class="toksheet">'+g.join('')+'</div><div class="label">Kaiten · tokens sheet '+(i+1)+' · cut on the grey circles; glue to 2 mm card for chunky tokens</div></div>').join('');}`, { width: 794, height: 1123 });
    await page.pdf({ path: path.join(OUT, 'kaiten-tokens-A4.pdf'), width: '210mm', height: '297mm', printBackground: true });
    await page.close();
  }

  /* 3. board: A3 landscape, plus the same board split over two A4 portrait pages */
  {
    const page = await open(`()=>'<div class="boardpage">'+board()+'</div>'`, { width: 1588, height: 1123 });
    await page.pdf({ path: path.join(OUT, 'kaiten-board-A3.pdf'), width: '420mm', height: '297mm', printBackground: true });
    await page.screenshot({ path: path.join(OUT, 'contact-board.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1588, height: 1123 }, scale: 'css' });
    await page.close();
    const tiles = await open(`()=>[0,1].map(i=>'<div class="sheet"><div style="position:absolute;left:'+(-210*i)+'mm;top:0"><div class="boardpage">'+board()+'</div></div><div class="label" style="color:#fff;mix-blend-mode:difference">Board '+(i+1)+'/2 · '+(i?'right':'left')+' half</div></div>').join('')`, { width: 794, height: 1123 });
    await tiles.pdf({ path: path.join(OUT, 'kaiten-board-2xA4.pdf'), width: '210mm', height: '297mm', printBackground: true });
    await tiles.close();
  }

  /* 4. contact sheets: overview images of every face, at a viewing resolution */
  {
    const sheets = {
      'contact-dishes': `()=>'<div class="contact wide">'+DISHES.map(dishFront).join('')+'</div>'`,
      'contact-chefs-guests-events': `()=>'<div class="contact wide">'+CHARS.map(chefFront).join('')+REGULARS.map(guestFront).join('')+EVENTS.map(eventFront).join('')+'</div>'`,
      'contact-backs': `()=>'<div class="contact">'+dishBack()+guestBack()+eventBack()+CHARS.map((c,i)=>chefBack(i)).join('')+'</div>'`,
      'contact-tokens': `()=>'<div class="contact" style="max-width:220mm;gap:3mm">'+FISH.concat(['R','N','W']).map(ingTok).join('')+[1,3,5,10].map(vpTok).join('')+CHARS.map(chefTok).join('')+'<div class="tok firstt"><b>先</b><small>FIRST</small></div><div class="tok roundt"><b>回</b><small>ROUND</small></div></div>'`,
    };
    for (const [name, b] of Object.entries(sheets)) {
      const page = await open(b, { width: 1400, height: 900 }, 1.25);
      const el = await page.$('.contact');
      await el.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 85 });
      await page.close();
    }
  }

  /* 5. optional: every card face as its own 300 dpi PNG with bleed */
  if (SINGLES) {
    const dir = path.join(OUT, 'singles'); fs.mkdirSync(dir, { recursive: true });
    const page = await open(`()=>{const {f,b}=${deck}; const names=[...DISHES.map(d=>'dish-'+d.id),...CHARS.map(c=>'chef-'+c.id),...REGULARS.map(r=>'guest-'+r.id),...EVENTS.map(e=>'event-'+e.id)];
      return f.map((c,i)=>'<div data-name="'+names[i]+'">'+c+'</div>').join('')+'<div data-name="back-dish">'+dishBack()+'</div><div data-name="back-guest">'+guestBack()+'</div><div data-name="back-event">'+eventBack()+'</div>'+CHARS.map((c,i)=>'<div data-name="back-chef-'+c.id+'">'+chefBack(i)+'</div>').join('');}`, { width: 900, height: 900 });
    for (const el of await page.$$('[data-name]')) {
      const name = await el.getAttribute('data-name');
      await (await el.$('.card')).screenshot({ path: path.join(dir, name + '.png') });
    }
    await page.close();
    // one of each token too
    const wrap = (name, inner) => `'<div data-name="${name}" style="display:inline-block;padding:2px">'+${inner}+'</div>'`;
    const tp = await open(`()=>FISH.concat(['R','N','W']).map(k=>${wrap("token-'+k+'", 'ingTok(k)')}).join('')+[1,3,5,10].map(n=>${wrap("token-vp'+n+'", 'vpTok(n)')}).join('')+CHARS.map((c,i)=>${wrap("token-chef-'+c.id+'", 'chefTok(c,i)')}).join('')+${wrap('token-first', `'<div class="tok firstt"><b>先</b><small>FIRST</small></div>'`)}+${wrap('token-round', `'<div class="tok roundt"><b>回</b><small>ROUND</small></div>'`)}`, { width: 900, height: 900 });
    for (const el of await tp.$$('[data-name]')) await (await el.$('.tok')).screenshot({ path: path.join(dir, (await el.getAttribute('data-name')) + '.png'), omitBackground: true });
    await tp.close();
  }

  await browser.close();
  fs.unlinkSync(tmp);
  console.log('Wrote', fs.readdirSync(OUT).filter(f => !f.startsWith('.')).join(', '));
})();
