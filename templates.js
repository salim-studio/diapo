/* diapo templates — © 2026 salim-slimani.
   100 generative Canva-style templates: 10 categories × 12 design motifs × 25 palettes.
   Templates are built on the fly (no storage cost) and instantiate as real editable decks. */
"use strict";
/* ---------- palettes: [bg, fg, accent, accent2] ---------- */
const TPAL=[
["#FAF6EF","#2E2620","#C96F4A","#EFD9C1"],["#EDF2EA","#1E3329","#2F6B4F","#B9D3C0"],
["#0F2440","#FFFFFF","#C9A227","#5B7DB1"],["#FBF1EC","#4A1F2B","#93354B","#F0C9C9"],
["#23272A","#FFFFFF","#3EC1A7","#5B7DB1"],["#F1ECFB","#2E2140","#7C3AED","#D5C6F5"],
["#F6F1E4","#33301F","#7A7A2E","#DCD2A8"],["#EAF3FB","#10233B","#1F6FEB","#BFD9F5"],
["#FFF4EE","#233A3A","#FF6B4E","#0E7C7B"],["#FFF7F0","#4A2E22","#E8834A","#F6CFA8"],
["#ECF8F1","#0C3B2E","#0E9F6E","#BDEBD5"],["#EFEDFB","#232052","#5B54E8","#C9C5F7"],
["#FFF8E6","#26241C","#D9A404","#F2DFA7"],["#FBF3E4","#402419","#A34A24","#EACFA8"],
["#0B2B3A","#EAF6F6","#12A5B4","#F2C14E"],["#2B2140","#FFF4E8","#FF5C38","#FFC24B"],
["#FFFFFF","#111111","#111111","#DDDDDD"],["#F4F8EC","#1C2E1A","#4D7C0F","#D9EAD3"],
["#3A1420","#FBEEDF","#C9A227","#8E2F45"],["#1E293B","#F1F5F9","#06B6D4","#F59E0B"],
["#EFE7DA","#3B2A20","#8A5A33","#D9C6A8"],["#EDF4F8","#1D3A52","#2F80ED","#BCD7F2"],
["#F4F0FA","#2A2733","#8B5CF6","#E2D6FB"],["#F7F4E8","#2C2A1A","#6B7F2A","#E3D9B8"],
["#EAF5F1","#173B36","#0F766E","#F5D9A8"]];
/* ---------- categories ---------- */
const TCAT=[
{n:"Business",f:"Georgia"},{n:"Pitch",f:"inherit"},{n:"Marketing",f:"inherit"},
{n:"Education",f:"Georgia"},{n:"Portfolio",f:"inherit"},{n:"Wedding",f:"Georgia"},
{n:"Medical",f:"inherit"},{n:"Finance",f:"Georgia"},{n:"Technology",f:"inherit"},
{n:"Travel",f:"inherit"}];
const TNAMES=[
["Executive Brief","Board Review","Quarterly Report","Corporate Profile","Meeting Agenda","Project Kickoff","Annual Review","Strategy Deck","Team Update","Consulting Pro"],
["Seed Round","Investor Deck","Startup Pitch","Elevator Pitch","Series A","Product Launch","Vision Deck","Growth Story","Demo Day","Bold Pitch"],
["Brand Guidelines","Campaign Plan","Social Strategy","Content Calendar","Product Promo","Launch Campaign","SEO Report","Email Marketing","Ad Creative","Creator Kit"],
["Lesson Plan","Class Slides","Thesis Defense","Workshop Day","Course Intro","Science Fair","History Lesson","Math Class","Language Lab","Graduation"],
["Creative Portfolio","Design Showcase","Photo Book","Art Gallery","Freelancer Profile","Case Study","Lookbook","Architecture Folio","Illustration Set","UX Case File"],
["Wedding Day","Save the Date","Our Story","Bridal Shower","Anniversary","Engagement","Rustic Vows","Modern Holy","Garden Party","Honeymoon"],
["Health Report","Clinic Profile","Wellness Guide","Dental Care","Pharma Brief","Fitness Plan","Nutrition 101","Mind Care","First Aid","Hospital Intro"],
["Budget Plan","Investment Guide","Financial Report","Crypto Brief","Tax Season","Startup Finance","Banking 101","Stock Market","Savings Plan","Audit Review"],
["AI Overview","SaaS Demo","App Launch","Cloud Guide","Cyber Shield","DevOps 101","Gadget Review","Data Science","Web3 Intro","Robot Lab"],
["Wanderlust","City Guide","Beach Escape","Mountain Trip","Travel Diary","Food Tour","Road Trip","Island Hopping","Euro Trip","Adventure Map"]];
/* ---------- content pools ---------- */
const TAGLINES=["A fresh take on big ideas","Designed to persuade","Simple. Bold. Memorable.","Tell your story beautifully","Make every slide count","Clarity meets style"];
const FOCUS_T=["Our approach","Key insights","What matters most","The big picture"];
const POINTS=["One idea per slide — keep it short","Support it with a single visual","End with a clear next step"];
const STATS=[["120+","Projects delivered"],["98%","Client satisfaction"],["12","Design awards"],["8 yrs","Of experience"],["40+","Team members"],["3x","Faster growth"]];
/* ---------- factories ---------- */
function mkShape(shape,x,y,w,h,fill,rot){
  return{id:uid(),type:"shape",shape,x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),
    rotation:rot||0,fill,stroke:"transparent",strokeW:0,text:" ",size:20,color:"#000000",align:"center",valign:"middle"};
}
function mkText(x,y,w,h,text,o){
  return oBox(Math.round(x),Math.round(y),Math.round(w),Math.round(h),Object.assign(
    {text,font:"inherit",size:28,bold:false,italic:false,underline:false,color:"#1d1b19",
     align:"start",valign:"top",fill:"transparent",stroke:"transparent",strokeW:0},o||{}));
}
/* ---------- 12 design motifs (décor painters) ---------- */
const MOTIFS=[
{side:"center",f(s,P){s.objects.push(mkShape("ellipse",560,-140,560,420,P.a2),mkShape("ellipse",-120,380,320,260,P.acc),mkShape("ellipse",820,420,90,90,P.acc));}},
{side:"center",f(s,P){s.objects.push(mkShape("rect",-100,330,1200,150,P.a2,-16),mkShape("ellipse",830,80,110,110,P.acc));}},
{side:"center",f(s,P){for(let r=0;r<4;r++)for(let c=0;c<5;c++)s.objects.push(mkShape("ellipse",60+c*34,60+r*34,11,11,P.acc));s.objects.push(mkShape("ellipse",700,380,400,260,P.a2));}},
{side:"center",f(s,P){s.objects.push(mkShape("roundRect",90,120,780,560,P.a2),mkShape("ellipse",740,90,120,120,P.acc));}},
{side:"right",f(s,P){s.objects.push(mkShape("rect",0,0,360,540,P.acc),mkShape("rect",360,0,14,540,P.a2));}},
{side:"center",f(s,P){s.objects.push(mkShape("rect",26,26,908,10,P.acc),mkShape("rect",26,504,908,10,P.acc),mkShape("rect",26,26,10,488,P.acc),mkShape("rect",924,26,10,488,P.acc),mkShape("rect",26,26,26,26,P.a2),mkShape("rect",908,26,26,26,P.a2),mkShape("rect",26,488,26,26,P.a2),mkShape("rect",908,488,26,26,P.a2));}},
{side:"left",f(s,P){const hs=[200,300,380,280,340];hs.forEach((h,i)=>s.objects.push(mkShape("rect",640+i*64,540-h,46,h,i%2?P.acc:P.a2)));}},
{side:"center",f(s,P){s.objects.push(mkShape("ellipse",770,60,150,150,P.acc),mkShape("ellipse",795,85,100,100,P.bg),mkShape("diamond",80,400,90,90,P.a2));}},
{side:"center",f(s,P){s.objects.push(mkShape("rect",0,430,960,36,P.acc),mkShape("rect",0,472,960,24,P.a2),mkShape("rect",0,502,960,38,P.acc),mkShape("ellipse",60,60,110,110,P.a2));}},
{side:"right",f(s,P){s.objects.push(mkShape("rect",-170,-170,340,340,P.acc,45),mkShape("rect",-70,-70,140,140,P.a2,45));}},
{side:"center",f(s,P){s.objects.push(mkShape("ellipse",-80,430,420,200,P.a2),mkShape("ellipse",300,460,420,200,P.a2),mkShape("ellipse",640,430,420,200,P.a2),mkShape("ellipse",800,60,120,120,P.acc));}},
{side:"center",f(s,P){s.objects.push(mkShape("diamond",470,96,22,22,P.acc),mkShape("rect",435,470,90,6,P.a2));}}];
/* ---------- template index: 10 cats × 10 = 100 ---------- */
const TPL=[];
TCAT.forEach((C,ci)=>{TNAMES[ci].forEach((nm,k)=>{TPL.push({n:nm,c:ci,m:(ci+k*5)%12,p:(ci*3+k*7)%25});});});
(function(){const seen={};TPL.forEach(e=>{if(!seen[e.m]){seen[e.m]=1;e.feat=1;}});})(); // prettiest of each motif → featured
/* ---------- deck builder ---------- */
function newTplSlide(bg){return{id:uid(),layout:"blank",bg,hidden:false,transition:"fade",dur:.5,notes:"",objects:[]};}
function buildTemplateDeck(i){
  const E=TPL[i],pal=TPAL[E.p],P={bg:pal[0],fg:pal[1],acc:pal[2],a2:pal[3]};
  const font=TCAT[E.c].f,cat=TCAT[E.c].n.toUpperCase(),mot=MOTIFS[E.m];
  const tag=TAGLINES[i%TAGLINES.length];
  const deck={id:uid(),title:E.n,theme:0,size:"16:9",bg:null,updated:Date.now(),slides:[]};
  // 1 — cover
  let s=newTplSlide(P.bg);mot.f(s,P);
  if(mot.side==="right"||mot.side==="left"){
    const x=mot.side==="right"?430:60;
    s.objects.push(mkText(x,130,470,40,cat,{size:20,bold:true,color:P.acc,font}),
      mkText(x,175,470,170,E.n,{size:64,bold:true,color:P.fg,font}),
      mkText(x,355,470,80,tag,{size:24,color:P.fg,font}));
  }else{
    s.objects.push(mkText(120,110,720,40,cat,{size:20,bold:true,color:P.acc,align:"center",font}),
      mkText(90,155,780,175,E.n,{size:78,bold:true,color:P.fg,align:"center",font}),
      mkText(150,350,660,80,tag,{size:25,color:P.fg,align:"center",font}));
  }
  deck.slides.push(s);
  // 2 — agenda
  s=newTplSlide(P.bg);
  s.objects.push(mkShape("ellipse",760,-80,300,220,P.a2));
  s.objects.push(mkText(70,70,820,40,"01 · AGENDA",{size:20,bold:true,color:P.acc,font}),
    mkText(70,115,820,70,"Roadmap",{size:44,bold:true,color:P.fg,font}),
    mkText(70,210,820,60,"01   Where we stand",{size:26,color:P.fg,font}),
    mkText(70,280,820,60,"02   Where we're going",{size:26,color:P.fg,font}),
    mkText(70,350,820,60,"03   How we get there",{size:26,color:P.fg,font}));
  deck.slides.push(s);
  // 3 — focus
  s=newTplSlide(P.bg);
  s.objects.push(mkShape("rect",70,88,64,10,P.acc));
  s.objects.push(mkText(70,110,820,40,"02 · FOCUS",{size:20,bold:true,color:P.acc,font}),
    mkText(70,155,820,70,FOCUS_T[i%FOCUS_T.length],{size:44,bold:true,color:P.fg,font}),
    mkText(70,250,820,220,"• "+POINTS.join("\n• "),{size:26,color:P.fg,font}));
  deck.slides.push(s);
  // 4 — numbers
  s=newTplSlide(P.bg);mot.f(s,P);
  s.objects.push(mkText(70,70,820,40,"03 · NUMBERS",{size:20,bold:true,color:P.acc,align:"center",font}));
  for(let k=0;k<3;k++){const st=STATS[(i+k)%STATS.length];
    s.objects.push(mkText(60+k*290,170,280,90,st[0],{size:58,bold:true,color:P.acc,align:"center",font}),
      mkText(60+k*290,265,280,50,st[1],{size:21,color:P.fg,align:"center",font}));}
  deck.slides.push(s);
  // 5 — thanks
  s=newTplSlide(P.bg);mot.f(s,P);
  s.objects.push(mkText(90,190,780,110,"Thank you",{size:76,bold:true,color:P.fg,align:"center",font}),
    mkText(150,320,660,50,"hello@diapo.studio · diapo.studio",{size:22,color:P.acc,align:"center",font}));
  deck.slides.push(s);
  return deck;
}
/* ---------- gallery UI (called from homeView) ---------- */
function tplCard(i){
  const deck=buildTemplateDeck(i);
  const card=document.createElement("div");
  card.className="deck tpl-card"+(TPL[i].feat?" feat":"");
  const cv=document.createElement("canvas");card.appendChild(cv);
  try{drawSlideCanvas(cv,deck,0,300,169);}catch(e){}
  card.insertAdjacentHTML("beforeend",`<div class="meta"><b>${esc(deck.title)}</b><small>${TCAT[TPL[i].c].n} · 5 slides</small></div><div class="ops"><button class="btn small primary">Use template</button></div>`);
  card.onclick=async()=>{const d2=buildTemplateDeck(i);await dbPut(d2);idxUpsert(d2);location.hash="#/edit?id="+d2.id;};
  return card;
}
function initTemplateGallery(root){
  const catSel=root.querySelector("#tpl-cat"),q=root.querySelector("#tpl-q"),grid=root.querySelector("#tgrid");
  catSel.innerHTML='<option value="-1">All categories</option>'+TCAT.map((c,k)=>`<option value="${k}">${c.n}</option>`).join("");
  const fr=root.querySelector("#feat");fr.innerHTML="";
  TPL.map((e,i)=>i).filter(i=>TPL[i].feat).forEach(i=>fr.appendChild(tplCard(i)));
  function drawTpl(){
    const cf=+catSel.value,qq=(q.value||"").toLowerCase();
    const order=TPL.map((e,i)=>i).filter(idx=>(cf<0||TPL[idx].c===cf)&&(!qq||TPL[idx].n.toLowerCase().includes(qq)));
    order.sort((a,b)=>((TPL[b].feat?1:0)-(TPL[a].feat?1:0))||(TPL[a].c-TPL[b].c)||(TPL[a].n<TPL[b].n?-1:1));
    grid.innerHTML="";
    order.forEach(idx=>grid.appendChild(tplCard(idx)));
    root.querySelector("#tpl-count").textContent="· "+order.length;
  }
  catSel.onchange=drawTpl;q.oninput=drawTpl;drawTpl();
}
