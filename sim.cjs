// Bot-vs-bot balance check for Kaiten. Usage: node sim.cjs [games]
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const src=html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const mod={exports:{}}; new Function("module",src)(mod);
const K=mod.exports;
const N=+process.argv[2]||400;
for(const nBots of [1,2,3]){
  const n=nBots+1, tot=[], seatWins=Array(n).fill(0), parts={dishes:0,bonus:0,sets:0,regs:0,end:0};
  let hireWins=0, hireN=0, dishes=0, turns=0, cardWins={}, cardSeen={}, hires=0, abilityWins={none:[0,0]};
  for(let g=0;g<N;g++){
    const s=K.newGame({nBots,seed:g*7919+nBots,allBots:true});
    let guard=0;
    while(!s.over&&guard++<500){const m=K.botMove(s,s.turn); K.act(s,s.turn,m.loc,m.args); turns++;}
    const rk=K.ranking(s); seatWins[rk[0].i]++;
    s.players.forEach((p,i)=>{const sc=K.score(p); tot.push(sc.total); for(const k in parts) parts[k]+=sc[k]; dishes+=p.tableau.length; if(p.hired){hires++; hireN++; if(rk[0].i===i) hireWins++;}
      p.tableau.forEach(id=>{cardSeen[id]=(cardSeen[id]||0)+1; if(rk[0].i===i) cardWins[id]=(cardWins[id]||0)+1;});});
  }
  tot.sort((a,b)=>a-b); const P=tot.length;
  console.log(`\n== ${n} players, ${N} games ==`);
  console.log('score avg',(tot.reduce((a,b)=>a+b,0)/P).toFixed(1),'min',tot[0],'p10',tot[P*0.1|0],'median',tot[P/2|0],'p90',tot[P*0.9|0],'max',tot[P-1]);
  console.log('dishes/player',(dishes/P).toFixed(1),'placements/player',(turns/P).toFixed(1),'hire rate',(hires/P).toFixed(2),'hirer win %',(100*hireWins/Math.max(1,hireN)).toFixed(0),'(fair',(100/n).toFixed(0)+')');
  console.log('VP share',Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,(v/P).toFixed(1)])));
  console.log('seat win %',seatWins.map(w=>(100*w/N).toFixed(0)).join(' / '));
  const rows=Object.keys(cardSeen).map(id=>({id,seen:cardSeen[id],wr:(cardWins[id]||0)/cardSeen[id]})).sort((a,b)=>b.wr-a.wr);
  if(nBots===2){console.log('top win-rate dishes', rows.slice(0,5).map(r=>`${r.id}:${(r.wr*100).toFixed(0)}%`).join(' '),' | bottom',rows.slice(-5).map(r=>`${r.id}:${(r.wr*100).toFixed(0)}%`).join(' '));
    console.log('least served',Object.entries(cardSeen).sort((a,b)=>a[1]-b[1]).slice(0,6).map(([k,v])=>k+':'+v).join(' '));}
}
