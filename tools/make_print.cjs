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

// card titles: long names step down a size so two lines sit comfortably in the header
const nmHTML=t=>'<span class="nm'+(t.length>13?' long':'')+'">'+esc(t)+'</span>';
function frame(cls,inner,extra){return '<div class="card '+cls+'"'+(extra||'')+'><div class="trim">'+inner+'</div></div>';}

function dishFront(d){
  const b=bonusOf(d);
  return frame('dish c-'+d.cat,
    '<div class="hd"><span class="kind">'+CAT_NAME[d.cat]+'</span>'+nmHTML(d.name)+'</div>'+
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
    '<div class="hd"><span class="kind">Regular · 常連</span>'+nmHTML(r.name)+'</div>'+
    '<div class="vp"><b>'+r.vp+'</b><small>VP</small></div>'+
    '<div class="portrait"><img src="'+A('reg-'+r.id)+'" alt=""></div>'+
    '<div class="wants"><small>Wants on your counter</small><div class="wlist'+(r.req.cat&&Object.keys(r.req.cat).length>2?' many':'')+'">'+reqHTML(r.req)+'</div></div>');
}
function guestBack(){return frame('back guestback','<div class="disc"><span class="jp">常連</span><span class="en">REGULAR</span></div>');}

function chefFront(c,i){
  return frame('chef','<div class="hd" style="background:'+PCOL[i]+'"><span class="kind">Chef · '+['Blue','Red','Yellow','Teal'][i]+'</span>'+nmHTML(c.name)+'</div>'+
    '<div class="portrait" style="--pc:'+PCOL[i]+'"><img src="'+A('chef-'+c.art)+'" alt=""></div>'+
    '<div class="title">'+esc(c.title)+'</div>'+chefAbility(c),' style="--pc:'+PCOL[i]+'"');
}
// a chef's edge as icons: where it applies (icon and name in bold), then what it gives
function chefAbility(c){
  const im=k=>'<img src="'+A(k)+'" alt="">';
  const ab={market:[im('st-market'),'Fish Market','+1',im('ing-T'),'fish'],
    door:[im('st-door'),'Front Door','+1',im('ing-W'),'wasabi'],
    pantryw:[im('st-pantry'),'Pantry','+1',im('ing-W'),'wasabi'],
    first:[im('st-head'),'First dish each round','+1','<b class="vpi">VP</b>','']}[c.t];
  return '<div class="ability"><div class="abw">'+ab[0]+'<b>'+ab[1]+'</b></div><div class="abg"><span class="abn">'+ab[2]+'</span>'+ab[3]+(ab[4]?'<small>'+ab[4]+'</small>':'')+'</div></div>';
}
function chefBack(i){
  // the player aid: one short line per step, each with an icon
  const row=(icon,lead,text,val)=>'<div class="arow"><span class="ai">'+icon+'</span><span class="at"><b>'+lead+'</b> '+text+'</span>'+(val?'<span class="av">'+val+'</span>':'')+'</div>';
  const img=k=>'<img src="'+A(k)+'" alt="">';
  const W='<img class="wi" src="'+A('ing-W')+'" alt="wasabi">';
  const sets='<span class="tri"><span class="catdot c-nigiri"></span><span class="catdot c-maki"></span><span class="catdot c-sashimi"></span></span>';
  return frame('back aid','<div class="aidh" style="background:'+PCOL[i]+'">A round</div>'+
    row(img('ing-R'),'Morning','collect your Each round bonuses')+
    row(img('chef-'+CHARS[i].art),'Place chefs','one at a time, clockwise')+
    row(img('st-belt'),'Belt turns','last lap leaves, the rest slide right','+1'+W)+
    row(img('ing-W'),'Catch-up','6+ behind: +1'+W+' · 15+: +2'+W)+
    '<div class="aidh" style="background:'+PCOL[i]+'">Closing</div>'+
    row(img('st-head'),'Plates','VP printed on each dish')+
    row(sets,'Sets','each Nigiri + Maki + Sashimi','4 VP')+
    row('<span class="regdot"></span>','Regulars','VP on each one won')+
    row('<span class="bchip">×1</span>','Bonuses','closing effects on your dishes')+
    row(img('ing-R'),'Leftovers','every 3 ingredients','1 VP')+
    row('<span class="minus">−1</span>','Unserved','each order still held','−1 VP'));
}

// what each event does, as icon rows (icon, text, value)
function eventFx(id){
  const im=k=>'<img src="'+A(k)+'" alt="">', W='<img class="wi" src="'+A('ing-W')+'" alt="wasabi">';
  return ({
    inspect:[[im('ing-T'),'More than 4 fish: throw out the extra',''],[im('ing-S'),'4 fish or fewer','+1 VP']],
    blogger:[[im('st-head'),'Every dish served this round','+1 VP']],
    auction:[[im('st-market'),'Fish Market takes','+1 fish']],
    shortage:[[im('st-pantry'),'Pantry gives','−1 staple']],
    matsuri:[[im('ing-W'),'Every chef gains','+1'+W]],
    celebrity:[['<span class="catdot big c-special"></span>','First chef to serve a Special','+3 VP']],
    powercut:[[im('st-belt'),'Only 1 chef at the Kaiten Belt; its wasabi stays',''],[im('st-belt'),'The belt does not turn at round end','']],
  })[id]||[];
}
function eventFront(e){
  return frame('event','<div class="hd"><span class="kind">Event · 出来事</span>'+nmHTML(e.name)+'</div>'+
    '<div class="night"><div class="biglan"><span>'+e.kj+'</span></div></div>'+
    '<div class="fx"><small>This round</small>'+eventFx(e.id).map(([i,t,v])=>'<div class="arow"><span class="ai">'+i+'</span><span class="at">'+t+'</span>'+(v?'<span class="av">'+v+'</span>':'')+'</div>').join('')+'</div>');
}
function eventBack(){return frame('back eventback','<div class="disc"><span class="jp">出来事</span><span class="en">EVENT</span></div>');}

/* ---------- tokens ---------- */
const TINT={R:['#f6efe0','#b9a27a'],N:['#dde6d6','#2c4a35'],T:['#f8dcdc','#b0283a'],S:['#fde4d0','#e06a2c'],U:['#ecdfcd','#6b4423'],E:['#fde2e8','#d76a7e'],W:['#e6f1d2','#6d9a3a']};
const tok=(cls,inner,style)=>'<div class="tok '+cls+'"'+(style?' style="'+style+'"':'')+'>'+inner+'</div>';
const ingTok=k=>tok('ingt','<img src="'+A('ing-'+k)+'" alt="">','--bg:'+TINT[k][0]+';--ring:'+TINT[k][1]);
const VPC={1:['#fcf7ec','#c2342a','#c2342a'],3:['#e7bb4f','#8a6516','#2b1f14'],5:['#c2342a','#8f1f17','#fff'],10:['#21385b','#142640','#fff']};
const vpTok=n=>tok('vpt','<b>'+n+'</b><small>VP</small>','--bg:'+VPC[n][0]+';--ring:'+VPC[n][1]+';--fg:'+VPC[n][2]);
// +1 tokens: a bonus from a card or a chef's ability, ready to collect (fish means draw one from the bag)
const PLUS={W:['wasabi','ing-W',TINT.W],F:['fish','st-market',['#dce8f2','#2f6690']],R:['rice','ing-R',TINT.R],N:['nori','ing-N',TINT.N]};
const plusTok=k=>tok('plust','<span class="pn">+1</span><img src="'+A(PLUS[k][1])+'" alt=""><small>'+PLUS[k][0]+'</small>','--bg:'+PLUS[k][2][0]+';--ring:'+PLUS[k][2][1]+(k==='R'?';--fg:#7d6539':''));
// last-lap token: sits on the last belt spot when you play without the belt board, and goes with the dish that is taken from there
const lastTok=()=>tok('lastt','<small>LAST LAP</small><b>−1</b><small>ingredient</small>','--ring:#c2342a');
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
  const belt='<div class="beltboard"><div class="dir">The belt turns this way at the end of each round →</div><div class="slots">'+[0,1,2,3,4].map(slot).join('')+'</div></div>';
  const kitchen='<div class="board"><div class="mid"><div class="stations"><div class="station ice"><div class="sh"><b>Fish on the ice</b><span class="skj">氷</span></div><p>Lay 5 fish here. Refill to 5 from the fish bag after each visit.</p></div>'+
    LOCS.map(st).join('')+'</div></div>'+
    '<div class="foot"><div class="brand"><span class="jp">回転寿司</span><span class="en">KAITEN</span></div>'+rounds+'</div></div>';
  return {belt,kitchen};
}
// duplex card sheets: 3x3 on A4, trim edges butted with no gaps, bleed kept on every outer edge,
// crop marks outside the bleed; backs mirrored so they line up when flipped on the long edge
function dupSheets(fronts,backs,label){
  const L=(210-3*CARD.w)/2, T=(297-3*CARD.h)/2, B=CARD.bleed;
  const marks=()=>{let c=''; for(let i=0;i<=3;i++){const x=L+i*CARD.w, y=T+i*CARD.h;
    c+='<div class="cut" style="left:'+x+'mm;top:0;width:.2mm;height:'+(T-B-1)+'mm"></div><div class="cut" style="left:'+x+'mm;bottom:0;width:.2mm;height:'+(T-B-1)+'mm"></div>'+
      '<div class="cut" style="top:'+y+'mm;left:0;height:.2mm;width:'+(L-B-1)+'mm"></div><div class="cut" style="top:'+y+'mm;right:0;height:.2mm;width:'+(L-B-1)+'mm"></div>';}
    return c;};
  const sheet=(cells,lab)=>{
    let h='';
    cells.forEach((html,k)=>{ if(!html) return;
      const r=Math.floor(k/3), c=k%3;
      const lo=c===0||!cells[k-1], ro=c===2||!cells[k+1], to=r===0||!cells[k-3], bo=r===2||!cells[k+3];
      const x=L+c*CARD.w-(lo?B:0), y=T+r*CARD.h-(to?B:0), w=CARD.w+(lo?B:0)+(ro?B:0), hh=CARD.h+(to?B:0)+(bo?B:0);
      h+='<div class="pcell" style="left:'+x+'mm;top:'+y+'mm;width:'+w+'mm;height:'+hh+'mm"><div style="position:absolute;left:'+(lo?0:-B)+'mm;top:'+(to?0:-B)+'mm">'+html+'</div></div>';});
    return '<div class="sheet">'+h+marks()+'<div class="label">'+lab+'</div></div>';};
  let out=''; const n=Math.ceil(fronts.length/9);
  for(let p=0;p<fronts.length;p+=9){
    const fr=Array.from({length:9},(_,k)=>fronts[p+k]||null), bk=Array.from({length:9},(_,k)=>backs[p+k]||null);
    const mb=Array.from({length:9},(_,k)=>bk[Math.floor(k/3)*3+(2-k%3)]);
    const s=p/9+1;
    out+=sheet(fr,'Kaiten · '+label+' · sheet '+s+' of '+n+' · FRONT')+sheet(mb,'Kaiten · '+label+' · sheet '+s+' of '+n+' · BACK · print double-sided, flip on the long edge');
  }
  return out;
}

// token sheets: every token the game needs on a fixed grid, each with a bleed halo and a cut guide;
// the back of each sheet is the same tokens mirrored, so double-sided printing gives two-faced tokens
function tokenSheets(){
  const list=[], add=(n,f)=>{for(let i=0;i<n;i++) list.push(f());};
  FISH.forEach(k=>add(12,()=>ingTok(k))); add(30,()=>ingTok('R')); add(20,()=>ingTok('N')); add(35,()=>ingTok('W'));
  [[1,30],[3,20],[5,15],[10,10]].forEach(([v,n])=>add(n,()=>vpTok(v)));
  CHARS.forEach((c,i)=>add(4,()=>chefTok(c,i)));
  [['W',8],['F',8],['R',6],['N',6]].forEach(([k,n])=>add(n,()=>plusTok(k))); add(3,lastTok);
  list.push(tok('firstt','<b>先</b><small>FIRST</small>','--ring:#ffd27a'), tok('roundt','<b>回</b><small>ROUND</small>','--ring:#8f1f17'));
  const P=TOKEN+4, cols=7, rows=10, per=cols*rows, L=(210-cols*P)/2, T=(297-rows*P)/2;
  const slot=(t,r,c)=>'<div class="tslot" style="left:'+(L+c*P)+'mm;top:'+(T+r*P)+'mm">'+t+'</div>';
  let out=''; const n=Math.ceil(list.length/per);
  for(let p=0;p<n;p++){
    const pg=list.slice(p*per,(p+1)*per);
    out+='<div class="sheet">'+pg.map((t,k)=>slot(t,Math.floor(k/cols),k%cols)).join('')+'<div class="label">Kaiten · tokens · sheet '+(p+1)+' of '+n+' · FRONT · cut on the dashed circles</div></div>'+
      '<div class="sheet">'+pg.map((t,k)=>slot(t,Math.floor(k/cols),cols-1-k%cols)).join('')+'<div class="label">Kaiten · tokens · sheet '+(p+1)+' of '+n+' · BACK · print double-sided, flip on the long edge</div></div>';
  }
  return out;
}

// travel kitchen: the board as 9 cards (fish on the ice, the 7 stations, the round track) for a small table
function stationCard(L){
  const c2=L.cap(2), c4=L.cap(4);
  const cap=c4>20?'<b>∞</b><small>chefs</small>':'<b>'+c2+'</b><small>'+(c2===1?'chef':'chefs')+'</small>';
  return frame('stn','<div class="hd"><span class="kind">Station · '+L.kj+'</span>'+nmHTML(L.name)+'</div>'+
    '<div class="vp capb">'+cap+'</div>'+
    '<div class="stxt">'+esc(L.text)+'</div><img class="sart" src="'+A('st-'+L.id)+'" alt="">'+
    (c4!==c2&&c4<20?'<div class="snote">'+c4+' chefs with 4 players</div>':''));
}
function iceCard(){
  return frame('stn icec','<div class="hd"><span class="kind">Supply · 氷</span>'+nmHTML('Fish on the ice')+'</div>'+
    '<div class="stxt">Keep 5 fish tokens on the ice. Refill to 5 from the bag after each visit to the Fish Market.</div>');
}
function roundsCard(){
  const lan=i=>'<span class="lan'+(EVENT_ROUNDS.includes(i)?' ev':'')+'"><b>'+i+'</b>'+(EVENT_ROUNDS.includes(i)?'<small>event</small>':'')+'</span>';
  return frame('stn roundc','<div class="hd"><span class="kind">Track · 回</span>'+nmHTML('Rounds')+'</div>'+
    '<div class="lrow">'+[1,2,3,4].map(lan).join('')+'</div><div class="lrow">'+[5,6,7].map(lan).join('')+'</div>'+
    '<div class="beltnote"><b>The belt</b>Deal 5 dishes in a row beside this card, newest on the left. Put the last-lap token on the right-hand dish.</div>');
}
function stationBack(){return frame('back stnback','<div class="disc"><span class="jp">厨房</span><span class="en">KITCHEN</span></div>');}
const travelFronts=()=>[iceCard(),...LOCS.map(stationCard),roundsCard()];

// both boards on one A3 sheet, with a cut line between them
const boardSheet=()=>{const b=board(); return '<div class="boardpage"><div class="bwrap belt">'+b.belt+'</div><div class="bwrap kitchen">'+b.kitchen+'</div></div>';};
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
.hd{position:absolute;left:-${CARD.bleed}mm;right:-${CARD.bleed}mm;top:-${CARD.bleed}mm;height:${20 + CARD.bleed}mm;padding:${CARD.bleed + 1.4}mm ${CARD.bleed + 17.5}mm 1.4mm ${CARD.bleed + 4}mm;justify-content:center;gap:.5mm!important;background:linear-gradient(rgba(255,255,255,.12),rgba(0,0,0,.12)),var(--cat,var(--indigo));color:#fff;display:flex;flex-direction:column;gap:.6mm}
.hd .kind{font-size:2.3mm;font-weight:900;letter-spacing:.14em;text-transform:uppercase;opacity:.9}
.hd .nm{font-family:var(--disp);font-size:4.6mm;line-height:1.12}
.hd .nm.long{font-size:3.9mm;line-height:1.05}
.vp{position:absolute;right:2.5mm;top:3mm;width:14mm;height:14mm;border-radius:50%;background:var(--lac);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-8deg);box-shadow:inset 0 0 0 .7mm rgba(255,255,255,.4),0 .6mm 0 var(--lac-2);font-family:var(--disp);line-height:1}
.vp b{font-size:6mm;font-weight:400}.vp small{font-size:1.9mm;letter-spacing:.1em}
.ing{width:7.5mm;height:7.5mm;border-radius:50%;background:#fffdf8;box-shadow:0 0 0 .35mm var(--paper-2),0 .4mm .8mm rgba(0,0,0,.15);display:inline-flex;align-items:center;justify-content:center;flex:none}
.ing img{width:6mm;height:6mm;object-fit:contain}
.ing.sm{width:6mm;height:6mm;vertical-align:middle}.ing.sm img{width:4.8mm;height:4.8mm}
.catdot{display:inline-block;width:3.6mm;height:3.6mm;border-radius:50%;background:var(--cat);box-shadow:0 0 0 .4mm #fff;flex:none}
.catdot.big{width:4.4mm;height:4.4mm}
.regdot{display:inline-block;width:3.6mm;height:3.6mm;border-radius:50%;border:.7mm solid #ff8a6e;background:#fff}

.dish .plate{position:absolute;left:50%;top:24mm;width:37mm;height:37mm;margin-left:-18.5mm;border-radius:50%;background:radial-gradient(circle,#fff 0 60%,#f2ece0 61%);box-shadow:0 0 0 1.6mm var(--cat),0 0 0 2.3mm #fff,0 1.2mm 2.4mm rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center}
.dish .plate img{width:32mm;height:32mm;object-fit:contain}
.dish .cost{position:absolute;left:0;right:0;top:64mm;display:flex;justify-content:center;gap:1mm}
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

.portrait{position:absolute;left:50%;top:23.5mm;width:36mm;height:36mm;margin-left:-18mm;border-radius:50%;overflow:hidden;box-shadow:0 0 0 1.4mm var(--pc,var(--indigo)),0 0 0 2.1mm #fff,0 1.2mm 2.4mm rgba(0,0,0,.25);background:#f6ecd8}
.portrait img{width:100%;height:100%;object-fit:cover}
.guest .wants{position:absolute;left:5mm;right:5mm;top:63mm;bottom:4.5mm;display:flex;flex-direction:column;align-items:center;gap:1.4mm;border-radius:2.4mm;background:rgba(255,255,255,.65);box-shadow:inset 0 0 0 .45mm var(--indigo);padding:1.8mm 2mm}
.guest .wants small{font-size:2mm;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--indigo)}
.wlist{flex:1;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:1.2mm 3mm}
.want{display:inline-flex;align-items:center;gap:1.2mm;font-size:3.6mm;font-weight:900}
.want b{font-family:var(--disp);font-weight:400;font-size:4.4mm}
.fishrow{gap:.8mm}
.wlist.many{display:grid;grid-template-columns:auto auto;gap:.8mm 4mm;align-content:center}
.wlist.many .want{font-size:3.1mm}.wlist.many .want b{font-size:3.6mm}.wlist.many .catdot.big{width:3.6mm;height:3.6mm}

.chef .title{position:absolute;left:0;right:0;top:62.5mm;text-align:center;font-family:var(--disp);font-size:4mm;color:var(--pc)}
.chef .ability{position:absolute;left:5mm;right:5mm;top:69mm;bottom:5mm;border-radius:2mm;background:rgba(255,255,255,.6);box-shadow:inset 0 0 0 .4mm var(--pc);padding:1.6mm 2.4mm;font-size:3mm;font-weight:700;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:.5mm}
.chef .ability{align-items:center;gap:1.2mm}
.abw{display:flex;align-items:center;gap:1.4mm}
.abw img{width:6mm;height:6mm;object-fit:contain}
.abw b{font-size:3mm;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.abg{display:flex;align-items:center;gap:1mm}
.abg img{width:6.5mm;height:6.5mm;object-fit:contain}
.abn{font-family:var(--disp);font-size:5.2mm;color:var(--pc);line-height:1}
.abg small{font-size:2.6mm;font-weight:900;color:var(--ink-2);margin-left:.5mm}
.vpi{font-family:var(--disp);font-weight:400;font-size:3mm;color:#fff;background:var(--lac);border-radius:50%;width:7mm;height:7mm;display:flex;align-items:center;justify-content:center}

.guest .hd{background:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.1)),url(art/tex-noren.webp) 0 0/60mm,var(--indigo)}
.event .hd{background:linear-gradient(rgba(255,255,255,.1),rgba(0,0,0,.15)),#8f1f17}
.event .night{position:absolute;left:-${CARD.bleed}mm;right:-${CARD.bleed}mm;top:17mm;height:41mm;background:url(art/ev-lantern.webp) 50% 50%/cover,#142640;overflow:hidden}
.event .biglan{position:absolute;left:50%;top:10mm;width:20mm;height:25.5mm;margin-left:-10mm;display:flex;align-items:center;justify-content:center}
.event .biglan span{font-family:var(--disp);color:#2a120c;font-size:8.2mm;line-height:1.05;writing-mode:vertical-rl;opacity:.88;mix-blend-mode:multiply;text-shadow:0 0 .6mm rgba(255,210,150,.35)}
.event .fx{position:absolute;left:5mm;right:5mm;top:61mm;bottom:4.5mm;border-radius:2.4mm;background:rgba(255,255,255,.65);box-shadow:inset 0 0 0 .45mm #8f1f17;padding:1.8mm 2.4mm;display:flex;flex-direction:column;justify-content:center;gap:1mm}
.event .fx small{text-align:center;font-size:2mm;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#8f1f17}
.event .fx .arow{font-size:2.7mm}.event .fx .av{font-size:3.2mm;color:#8f1f17}

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
.aid .trim{gap:.9mm;padding-top:4mm}
.aid .aidh{font-size:3.2mm;padding:.7mm 2.4mm}
.wi{width:3mm;height:3mm;object-fit:contain;vertical-align:-.7mm;display:inline}
.arow{display:flex;align-items:center;gap:1.6mm;font-size:2.45mm;line-height:1.15;min-height:5.2mm}
.ai{flex:none;width:5.2mm;height:5.2mm;border-radius:50%;background:#fff;box-shadow:0 0 0 .3mm var(--paper-2);display:flex;align-items:center;justify-content:center;overflow:hidden}
.ai img{width:4.6mm;height:4.6mm;object-fit:contain}
.ai img[src*="chef-"]{width:100%;height:100%;object-fit:cover}
.at{flex:1;min-width:0}.at b{font-weight:900}
.av{flex:none;font-family:var(--disp);font-size:2.7mm;color:var(--ink);display:flex;align-items:center;gap:.4mm}
.tri{display:flex;gap:.3mm}.tri .catdot{width:1.6mm;height:1.6mm;box-shadow:none}
.ai .regdot{width:3mm;height:3mm;border-width:.6mm}
.bchip{font-family:var(--disp);font-size:2.2mm;color:#fff;background:var(--indigo);border-radius:2mm;padding:.2mm .8mm}
.minus{font-family:var(--disp);font-size:2.6mm;color:var(--lac)}

/* ---------- print sheets ---------- */
.sheet{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}
.sheet .grid{position:absolute;left:${(210 - 3 * CARD.w) / 2}mm;top:${(297 - 3 * CARD.h) / 2}mm;display:grid;grid-template-columns:repeat(3,${CARD.w}mm);grid-auto-rows:${CARD.h}mm}
.cell{position:relative;width:${CARD.w}mm;height:${CARD.h}mm;overflow:hidden}
.cell>.card{position:absolute;left:-${CARD.bleed}mm;top:-${CARD.bleed}mm}
.cut{position:absolute;background:#999}
.pcell{position:absolute;overflow:hidden}
.tslot{position:absolute;width:${TOKEN + 4}mm;height:${TOKEN + 4}mm;display:flex;align-items:center;justify-content:center}
.tslot .tok{outline:.2mm dashed rgba(255,255,255,.85);outline-offset:-.1mm}
.tslot .vpt{box-shadow:inset 0 0 0 1.1mm var(--ring),inset 0 0 0 1.7mm rgba(255,255,255,.45),0 0 0 1.6mm var(--ring)}
.tslot .ingt{box-shadow:inset 0 0 0 1.1mm var(--ring),0 0 0 1.6mm var(--ring)}
.tslot .cheft{box-shadow:inset 0 0 0 1.4mm var(--ring),0 0 0 1.6mm var(--ring)}
.tslot .plust,.tslot .lastt{box-shadow:inset 0 0 0 1.1mm var(--ring),0 0 0 1.6mm var(--ring)}
.tslot .roundt{box-shadow:inset 0 0 0 1.1mm #8f1f17,0 0 0 1.6mm #8f1f17}
.tslot .firstt{width:${TOKEN}mm;height:${TOKEN}mm;box-shadow:inset 0 0 0 1.2mm #ffd27a,0 0 0 1.6mm #ffd27a}.tslot .firstt b{font-size:7.5mm}.tslot .firstt small{font-size:2mm}
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
.plust{background:radial-gradient(circle,#fff 0 30%,var(--bg) 70%);box-shadow:inset 0 0 0 1.1mm var(--ring);color:var(--fg,var(--ring));line-height:1;gap:.2mm}
.plust .pn{font-family:var(--disp);font-size:6mm}.plust img{width:8.5mm;height:8.5mm;object-fit:contain}.plust small{font-size:2mm;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.lastt{background:linear-gradient(rgba(255,255,255,.08),rgba(0,0,0,.1)),url(art/tex-belt.webp) 0 0/20mm 100%,#8d989b;color:#fff;box-shadow:inset 0 0 0 1.1mm var(--ring);line-height:1;text-shadow:0 .3mm .8mm rgba(0,0,0,.5)}
.lastt b{font-family:var(--disp);font-size:8mm;font-weight:400;color:#ffd27a}.lastt small{font-size:1.9mm;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.toksheet{display:flex;flex-wrap:wrap;align-content:flex-start;gap:3mm;padding:12mm 11mm}
.toksheet .tok{outline:.2mm solid #bbb;outline-offset:.4mm}
.toksheet h3{width:100%;margin:2mm 0 0;font-size:3mm;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#888}

/* ---------- board (A3 landscape) ---------- */
.boardpage{width:420mm;height:297mm;position:relative;overflow:hidden}
.bwrap{position:absolute;left:10mm;width:400mm;overflow:hidden;outline:.25mm dashed #999;outline-offset:1.5mm}
.bwrap.belt{top:4mm;height:116mm}
.bwrap.kitchen{top:125mm;height:168mm}
.board{position:absolute;inset:0;padding:6mm 7mm 5mm;background:url(art/tex-ash.webp) 0 0/300mm auto,#e6cd9f;display:flex;flex-direction:column;gap:4mm}
.brand{display:flex;flex-direction:column;align-items:flex-start;color:var(--indigo);flex:none}
.brand .jp{font-family:var(--disp);font-size:8mm;line-height:1}.brand .en{font-family:var(--disp);font-size:3.4mm;letter-spacing:.5em;margin-right:-.5em;color:var(--lac)}
.beltboard{position:absolute;inset:0;padding:6mm 0 0;background:linear-gradient(rgba(255,255,255,.06),rgba(0,0,0,.08)),url(art/tex-belt.webp) 0 0/60mm 100%,#8d989b;display:flex;flex-direction:column;align-items:center}
.beltboard .dir{align-self:stretch;padding-left:${(400 - 5 * (CARD.w + 3) - 4 * 6) / 2}mm}
.beltboard .slots{gap:6mm}
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
.lanterns{position:relative;padding-top:2.4mm;gap:3mm!important;width:max-content}
.lan{position:relative;width:12mm;height:16mm;background:url(art/lantern.webp) 50% 50%/contain no-repeat;color:#2a120c;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:1.6mm;box-sizing:border-box;font-family:var(--disp);line-height:1}
.lan b{font-size:5mm;font-weight:400;opacity:.88}.lan small{font-family:"Zen Kaku Gothic New";font-size:1.7mm;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.85}
.lan:not(.ev){filter:saturate(.55) brightness(.82)}
.lan.ev{filter:drop-shadow(0 0 1.6mm rgba(255,140,60,.85))}
.foot .rules{flex:1;display:flex;flex-direction:column;gap:1mm;align-items:flex-end;text-align:right}
.board>.foot{display:flex;align-items:center;gap:8mm;font-size:3mm;color:var(--ink);background:rgba(252,247,236,.75);border-radius:2mm;padding:2mm 4mm}

/* ---------- travel kitchen cards ---------- */
.stn{background:linear-gradient(rgba(255,246,224,.45),rgba(255,246,224,.3)),url(art/tex-table.webp) 0 0/90mm,#f0dbb0}
.stn .hd{--cat:var(--wood-dk)}
.stn .capb{background:#fcf7ec;color:var(--wood-dk);box-shadow:inset 0 0 0 .7mm var(--wood-dk),0 .6mm 0 rgba(60,35,10,.35);transform:none}
.stn .capb b{font-size:6.6mm}
.stxt{position:absolute;left:4mm;right:4mm;top:22mm;font-size:3.4mm;line-height:1.3;font-weight:500;color:var(--ink-2);text-align:center}
.sart{position:absolute;left:50%;bottom:9mm;width:44mm;height:44mm;margin-left:-22mm;object-fit:contain;filter:drop-shadow(0 1mm 1mm rgba(60,35,10,.3))}
.snote{position:absolute;left:4mm;right:4mm;bottom:3.5mm;text-align:center;font-size:2.4mm;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--wood-dk)}
.icec{background:linear-gradient(rgba(255,255,255,.3),rgba(255,255,255,.3)),url(art/tex-ice-cover.webp) center/cover}
.icec .hd{--cat:#4f6f7a}.icec .stxt{color:#2c3c42}
.roundc .hd{--cat:var(--lac-2)}
.lrow{position:absolute;left:0;right:0;display:flex;justify-content:center;gap:1.6mm}
.lrow:nth-of-type(2){top:23mm}.lrow:nth-of-type(3){top:41mm}
.roundc .lan{width:12.5mm;height:16.5mm}
.beltnote{position:absolute;left:4mm;right:4mm;bottom:4mm;border-radius:2.4mm;background:rgba(255,255,255,.6);box-shadow:inset 0 0 0 .45mm var(--wood-dk);padding:2mm 2.6mm;font-size:2.8mm;line-height:1.3;color:var(--ink-2);font-weight:500}
.beltnote b{display:block;font-size:2.2mm;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--wood-dk);margin-bottom:.6mm}
.stnback{background:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.15)),url(art/tex-table.webp) 0 0/90mm,#7a532b}
.stnback .disc{box-shadow:inset 0 0 0 .8mm #ffd27a;background:rgba(43,31,20,.55)}

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

  /* 1. print-and-play cards: one duplex PDF per deck (and all decks together), 3x3 on A4 with bleed */
  {
    const decks = [
      ['dishes', 'Dish cards', 'DISHES.map(dishFront)', 'DISHES.map(()=>dishBack())'],
      ['regulars', 'Regular cards', 'REGULARS.map(guestFront)', 'REGULARS.map(()=>guestBack())'],
      ['events', 'Event cards', 'EVENTS.map(eventFront)', 'EVENTS.map(()=>eventBack())'],
      ['chefs', 'Chef cards', 'CHARS.map(chefFront)', 'CHARS.map((c,i)=>chefBack(i))'],
      ['kitchen', 'Travel kitchen', 'travelFronts()', 'travelFronts().map(()=>stationBack())'],
    ];
    const pdf = async (builder, file) => {
      const page = await open(builder, { width: 794, height: 1123 });
      await page.pdf({ path: path.join(OUT, file), width: '210mm', height: '297mm', printBackground: true });
      await page.close();
    };
    for (const [id, label, f, b] of decks) await pdf(`()=>dupSheets(${f},${b},'${label}')`, `kaiten-cards-${id}-A4.pdf`);
    await pdf(`()=>${decks.map(([, label, f, b]) => `dupSheets(${f},${b},'${label}')`).join('+')}`, 'kaiten-cards-A4.pdf');
  }

  /* 2. tokens: duplex A4 sheets */
  {
    const page = await open(`()=>tokenSheets()`, { width: 794, height: 1123 });
    await page.pdf({ path: path.join(OUT, 'kaiten-tokens-A4.pdf'), width: '210mm', height: '297mm', printBackground: true });
    await page.close();
  }

  /* 3. board: A3 landscape, plus the same board split over two A4 portrait pages */
  {
    const page = await open(`()=>boardSheet()`, { width: 1588, height: 1123 });
    await page.pdf({ path: path.join(OUT, 'kaiten-board-A3.pdf'), width: '420mm', height: '297mm', printBackground: true });
    await page.screenshot({ path: path.join(OUT, 'contact-board.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1588, height: 1123 }, scale: 'css' });
    for (const k of ['belt', 'kitchen']) await (await page.$('.bwrap.' + k)).screenshot({ path: path.join(OUT, 'contact-board-' + k + '.jpg'), type: 'jpeg', quality: 84 });
    await page.close();
    const tiles = await open(`()=>[0,1].map(i=>'<div class="sheet"><div style="position:absolute;left:'+(-210*i)+'mm;top:0">'+boardSheet()+'</div><div class="label" style="color:#fff;mix-blend-mode:difference">Board '+(i+1)+'/2 · '+(i?'right':'left')+' half</div></div>').join('')`, { width: 794, height: 1123 });
    await tiles.pdf({ path: path.join(OUT, 'kaiten-board-2xA4.pdf'), width: '210mm', height: '297mm', printBackground: true });
    await tiles.close();
  }

  /* 4. contact sheets: overview images of every face, at a viewing resolution */
  {
    const sheets = {
      'contact-dishes': `()=>'<div class="contact wide">'+DISHES.map(dishFront).join('')+'</div>'`,
      'contact-chefs-guests-events': `()=>'<div class="contact wide">'+CHARS.map(chefFront).join('')+REGULARS.map(guestFront).join('')+EVENTS.map(eventFront).join('')+'</div>'`,
      'contact-backs': `()=>'<div class="contact">'+dishBack()+guestBack()+eventBack()+CHARS.map((c,i)=>chefBack(i)).join('')+'</div>'`,
      'contact-travel': `()=>'<div class="contact wide" style="max-width:${5 * (CARD.w + 2 * CARD.bleed + 4) + 12}mm">'+travelFronts().join('')+stationBack()+'</div>'`,
      'contact-tokens': `()=>'<div class="contact" style="max-width:220mm;gap:3mm">'+FISH.concat(['R','N','W']).map(ingTok).join('')+[1,3,5,10].map(vpTok).join('')+CHARS.map(chefTok).join('')+['W','F','R','N'].map(plusTok).join('')+lastTok()+'<div class="tok firstt"><b>先</b><small>FIRST</small></div><div class="tok roundt"><b>回</b><small>ROUND</small></div></div>'`,
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
    const tp = await open(`()=>FISH.concat(['R','N','W']).map(k=>${wrap("token-'+k+'", 'ingTok(k)')}).join('')+[1,3,5,10].map(n=>${wrap("token-vp'+n+'", 'vpTok(n)')}).join('')+CHARS.map((c,i)=>${wrap("token-chef-'+c.id+'", 'chefTok(c,i)')}).join('')+['W','F','R','N'].map(k=>${wrap("token-plus'+k+'", 'plusTok(k)')}).join('')+${wrap('token-lastlap', 'lastTok()')}+${wrap('token-first', `'<div class="tok firstt"><b>先</b><small>FIRST</small></div>'`)}+${wrap('token-round', `'<div class="tok roundt"><b>回</b><small>ROUND</small></div>'`)}`, { width: 900, height: 900 });
    for (const el of await tp.$$('[data-name]')) await (await el.$('.tok')).screenshot({ path: path.join(dir, (await el.getAttribute('data-name')) + '.png'), omitBackground: true });
    await tp.close();
  }

  await browser.close();
  fs.unlinkSync(tmp);
  console.log('Wrote', fs.readdirSync(OUT).filter(f => !f.startsWith('.')).join(', '));
})();
