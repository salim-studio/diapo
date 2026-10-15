/* diapo v1.0 — © 2026 salim-slimani — fast zero-dependency presentation app (Arabic/French/English, RTL).
   Features: library, editor, themes, transitions, present, notes, undo, tables,
   shapes, images, real .pptx import/export, PNG/PDF, IndexedDB autosave. */
"use strict";
/* ============ utils ============ */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=> "id"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
function toast(msg){const d=document.createElement("div");d.className="toast";d.textContent=msg;$("#toasts").appendChild(d);setTimeout(()=>d.remove(),2600);}
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);}
function dataURLtoBytes(d){const[b64]=d.split(",").slice(1);const s=atob(b64);const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
function bytesToB64(u){let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s);}
function crc32(u){let t=crc32.T;if(!t){t=crc32.T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}}let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=t[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
async function deflateRaw(u){const cs=new CompressionStream("deflate-raw");const w=cs.writable.getWriter();w.write(u);w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer());}
async function inflateRaw(u){try{const ds=new DecompressionStream("deflate-raw");const w=ds.writable.getWriter();w.write(u);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer());}catch(e){const ds=new DecompressionStream("deflate");const w=ds.writable.getWriter();w.write(u);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer());}}
const enc=new TextEncoder(), dec=new TextDecoder();
/* ---- minimal ZIP writer/reader (store+deflate) ---- */
async function zipWrite(files){ // files: [{name, data:Uint8Array}]
  const chunks=[];const central=[];let offset=0;
  for(const f of files){
    const name=enc.encode(f.name);
    const raw=f.data; const comp=await deflateRaw(raw);
    const useRaw=comp.length>=raw.length; const data=useRaw?raw:comp;
    const crc=crc32(raw);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0,true);
    lh.setUint16(8,useRaw?0:8,true);lh.setUint16(10,0,true);lh.setUint16(12,0,true);
    lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,raw.length,true);
    lh.setUint16(26,name.length,true);lh.setUint16(28,0,true);
    chunks.push(new Uint8Array(lh.buffer),name,data);
    central.push({name,crc,cl:data.length,ul:raw.length,offset,method:useRaw?0:8});
    offset+=30+name.length+data.length;
  }
  const cstart=offset; const cchunks=[];
  for(const c of central){
    const cd=new DataView(new ArrayBuffer(46));
    cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);
    cd.setUint16(8,0,true);cd.setUint16(10,c.method,true);cd.setUint16(12,0,true);cd.setUint16(14,0,true);
    cd.setUint32(16,c.crc,true);cd.setUint32(20,c.cl,true);cd.setUint32(24,c.ul,true);
    cd.setUint16(28,c.name.length,true);cd.setUint32(42,c.offset,true);
    cchunks.push(new Uint8Array(cd.buffer),c.name);
    offset+=46+c.name.length;
  }
  const csize=offset-cstart;
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,central.length,true);end.setUint16(10,central.length,true);
  end.setUint32(12,csize,true);end.setUint32(16,cstart,true);
  const total=offset+22; const out=new Uint8Array(total); let p=0;
  for(const c of [...chunks,...cchunks,new Uint8Array(end.buffer)]){out.set(c,p);p+=c.length;}
  return out;
}
function zipParse(buf){
  const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
  let eocd=-1;for(let i=buf.length-22;i>=0&&i>=buf.length-66000;i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw new Error("bad zip");
  const count=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);
  const entries=[];
  for(let i=0;i<count;i++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),cl=dv.getUint32(p+20,true),ul=dv.getUint32(p+24,true);
    const nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),fl=dv.getUint16(p+32,true);
    const name=dec.decode(buf.subarray(p+46,p+46+nl));
    const off=dv.getUint32(p+42,true);
    entries.push({name,method,cl,ul,off});p+=46+nl+el+fl;
  }
  return entries;
}
async function zipRead(buf){
  const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
  const out={};
  for(const e of zipParse(buf)){
    const p=e.off;
    if(dv.getUint32(p,true)!==0x04034b50)continue;
    const nl=dv.getUint16(p+26,true),el=dv.getUint16(p+28,true);
    const start=p+30+nl+el;const comp=buf.subarray(start,start+e.cl);
    out[e.name]=e.method===0?comp:await inflateRaw(comp);
  }
  return out;
}
/* ============ i18n ============ */
const STR={
ar:{new:"＋ جديد",open:"فتح",import:"استيراد pptx",present:"عرض",export:"تصدير",save:"حفظ",home:"المكتبة",search:"بحث…",slides:"الشرائح",add:"إضافة شريحة",dup:"تكرار",del:"حذف",hide:"إخفاء",insert:"إدراج",design:"تصميم",trans:"انتقالات",show:"عرض الشرائح",notes:"ملاحظات المحاضر",format:"تنسيق",arrange:"ترتيب",undo:"تراجع",redo:"إعادة",zoom:"تكبير",fit:"ملاءمة",find:"بحث واستبدال",lang:"اللغة",theme:"السمة",dark:"داكن",light:"فاتح",system:"تلقائي",size:"المقاس",bgs:"الخلفية",table:"جدول",image:"صورة",shape:"شكل",textbox:"مربع نص",line:"خط",link:"رابط",front:"للأمام",back:"للخلف",align:"محاذاة",png:"PNG",pdf:"PDF",pptx:"PPTX",copy:"حفظ نسخة",rename:"إعادة تسمية",download:"تنزيل",confirmDel:"حذف نهائي؟",saved:"تم الحفظ ✓",saving:"جارٍ الحفظ…",offline:"محفوظ محلياً",title:"عنوان العرض",untitled:"عرض بدون عنوان",empty:"لا عروض بعد — أنشئ واحداً!",start:"ابدأ من قالب",help:"مساعدة",presentHelp:"أسهم/مسافة للتنقل • Esc خروج • B شاشة سوداء • W بيضاء",notesPh:"اكتب ملاحظاتك هنا…",textPh:"انقر نقراً مزدوجاً للكتابة",tb:"نص",noSel:"اختر عنصراً لتنسيقه"},
en:{new:"+ New",open:"Open",import:"Import pptx",present:"Present",export:"Export",save:"Save",home:"Library",search:"Search…",slides:"Slides",add:"Add slide",dup:"Duplicate",del:"Delete",hide:"Hide",insert:"Insert",design:"Design",trans:"Transitions",show:"Slide Show",notes:"Speaker notes",format:"Format",arrange:"Arrange",undo:"Undo",redo:"Redo",zoom:"Zoom",fit:"Fit",find:"Find & replace",lang:"Language",theme:"Theme",dark:"Dark",light:"Light",system:"Auto",size:"Size",bgs:"Background",table:"Table",image:"Image",shape:"Shape",textbox:"Text box",line:"Line",link:"Link",front:"Bring forward",back:"Send backward",align:"Align",png:"PNG",pdf:"PDF",pptx:"PPTX",copy:"Save a copy",rename:"Rename",download:"Download",confirmDel:"Delete permanently?",saved:"Saved ✓",saving:"Saving…",offline:"Saved locally",title:"Presentation title",untitled:"Untitled deck",empty:"No decks yet — create one!",start:"Start from template",help:"Help",presentHelp:"Arrows/Space navigate • Esc exit • B black • W white",notesPh:"Write your notes here…",textPh:"Double-click to type",tb:"Text",noSel:"Select an object to format"},
fr:{new:"+ Nouveau",open:"Ouvrir",import:"Importer pptx",present:"Diaporama",export:"Exporter",save:"Enregistrer",home:"Bibliothèque",search:"Rechercher…",slides:"Diapos",add:"Ajouter",dup:"Dupliquer",del:"Supprimer",hide:"Masquer",insert:"Insertion",design:"Création",trans:"Transitions",show:"Diaporama",notes:"Notes",format:"Format",arrange:"Disposition",undo:"Annuler",redo:"Rétablir",zoom:"Zoom",fit:"Ajuster",find:"Rechercher",lang:"Langue",theme:"Thème",dark:"Sombre",light:"Clair",system:"Auto",size:"Taille",bgs:"Arrière-plan",table:"Tableau",image:"Image",shape:"Forme",textbox:"Zone de texte",line:"Ligne",link:"Lien",front:"Avant",back:"Arrière",align:"Aligner",png:"PNG",pdf:"PDF",pptx:"PPTX",copy:"Enregistrer copie",rename:"Renommer",download:"Télécharger",confirmDel:"Supprimer ?",saved:"Enregistré ✓",saving:"Enregistrement…",offline:"Enregistré local",title:"Titre",untitled:"Sans titre",empty:"Aucun diaporama — créez-en un !",start:"Partir d'un modèle",help:"Aide",presentHelp:"Flèches/Espace naviguer • Échap quitter • B noir • W blanc",notesPh:"Vos notes ici…",textPh:"Double-cliquez pour écrire",tb:"Texte",noSel:"Sélectionnez un objet"}};
let LANG=localStorage.getItem("diapo.lang")||"en";
const t=k=>(STR[LANG]&&STR[LANG][k])||STR.en[k]||k;
/* ============ themes / constants ============ */
const THEMES=[
 {name:"Diapo",bg:"#ffffff",fg:"#1d1b19",accent:"#4f46e5",accent2:"#c9bff7",font:"Segoe UI, Tahoma, Arial"},
 {name:"Nuit",bg:"#1f1d1c",fg:"#f5efe6",accent:"#f08b73",accent2:"#c44730",font:"Segoe UI, Tahoma, Arial"},
 {name:"Océan",bg:"#f4f9ff",fg:"#0e2a47",accent:"#1668c4",accent2:"#7fb6f5",font:"Segoe UI, Tahoma, Arial"},
 {name:"Forêt",bg:"#f3f7f2",fg:"#17301f",accent:"#1e7a3c",accent2:"#8fd0a2",font:"Segoe UI, Tahoma, Arial"},
 {name:"Sable",bg:"#fdf8ef",fg:"#3d2c17",accent:"#b07d1e",accent2:"#ecd29a",font:"Georgia, serif"},
 {name:"Violet",bg:"#f7f3ff",fg:"#2b2140",accent:"#6c3fd4",accent2:"#b79df5",font:"Segoe UI, Tahoma, Arial"},
 {name:"Monochrome",bg:"#ffffff",fg:"#111111",accent:"#111111",accent2:"#888888",font:"Arial, sans-serif"},
 {name:"Mentor",bg:"#10222e",fg:"#eaf6ff",accent:"#22b8a8",accent2:"#ffd166",font:"Segoe UI, Tahoma, Arial"}];
const SIZES={"16:9":{w:960,h:540},"16:10":{w:960,h:600},"4:3":{w:960,h:720}};
const TRANS=[["none","None"],["fade","Fade"],["slide","Slide"],["zoom","Zoom"]];
const SHAPES=["rect","roundRect","ellipse","triangle","diamond","rightArrow","star","heart","cloud","speech"];
const FONTS=["Segoe UI","Tahoma","Arial","Georgia","Times New Roman","Courier New","Amiri","Noto Kufi Arabic","Cairo","Aptos"];
/* ============ model ============ */
function oBox(x,y,w,h,extra={}){return Object.assign({id:uid(),type:"textbox",x,y,w,h,rotation:0,text:"",font:"inherit",size:28,bold:false,italic:false,underline:false,color:"inherit",align:"start",valign:"middle",fill:"transparent",stroke:"transparent",strokeW:2,link:""},extra);}
function newDeck(title){return{id:uid(),title:title||t("untitled"),theme:0,size:"16:9",bg:null,updated:Date.now(),slides:[newSlide("title"),newSlide("title-content"),newSlide("two-col"),newSlide("section"),newSlide("blank")]};}
function newSlide(layout="blank"){
  const s={id:uid(),layout,bg:null,hidden:false,transition:"fade",dur:0.5,notes:"",objects:[]};
  const A="#4f46e5",D="#1d1b19",G="#7a7470";
  if(layout==="title"){s.objects.push(oBox(80,90,800,120,{text:"Presentation title",size:54,bold:true,align:"center",color:D}));
    s.objects.push(oBox(180,240,600,70,{text:"Subtitle text here",size:26,align:"center",color:G}));}
  else if(layout==="title-content"){s.objects.push(oBox(60,30,840,90,{text:"Slide title",size:40,bold:true,color:D}));
    s.objects.push(oBox(60,150,840,300,{text:"• First point\n• Second point\n• Third point",size:26,color:D}));}
  else if(layout==="two-col"){s.objects.push(oBox(60,30,840,90,{text:"Comparison",size:40,bold:true}));
    s.objects.push(oBox(60,150,390,300,{text:"First column\n• Idea 1\n• Idea 2",size:24}));
    s.objects.push(oBox(510,150,390,300,{text:"Second column\n• Idea 1\n• Idea 2",size:24}));}
  else if(layout==="section"){s.objects.push(oBox(60,200,840,120,{text:"New section",size:60,bold:true,align:"center",color:"#ffffff"}));s.bg=A;}
  else if(layout==="pic-cap"){s.objects.push(oBox(60,30,840,80,{text:"Picture and caption",size:38,bold:true}));
    s.objects.push({id:uid(),type:"shape",shape:"rect",x:60,y:140,w:560,h:330,rotation:0,fill:"#e8e2d9",stroke:"#c9c0b4",strokeW:2,text:""});
    s.objects.push(oBox(640,140,260,330,{text:"Write your caption here…",size:22}));}
  return s;
}
/* starter demo decks */
function demoDecks(){
  const d=newDeck("Diapo — "+t("start"));
  d.slides[0].objects[0].text="diapo";d.slides[0].objects[0].size=96;d.slides[0].objects[0].bold=true;
  d.slides[0].objects[1].text="Fast presentations in your browser — no account, no setup";
  d.slides[1].objects[0].text="Why diapo?";d.slides[1].objects[1].text="• Works offline, no account\n• Fast: zero heavy libraries\n• Real .pptx files\n• English / Français / عربي";
  d.slides[2].objects[0].text="Quick comparison";d.slides[2].objects[1].text="diapo\n• Lightweight\n• Free\n• Open";d.slides[2].objects[2].text="Others\n• Heavy\n• Paid\n• Closed";
  d.slides[3].objects[0].text="Start now ✦";
  d.slides[4].objects.length=0;d.slides[4].objects.push(oBox(120,180,720,160,{text:"Blank slide — insert a shape, image or table from the toolbar",size:28,align:"center"}));
  return d;
}
/* ============ storage (IndexedDB + localStorage) ============ */
const DB="diapo-db";
function idb(){return new Promise((res,rej)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore("decks");q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function dbPut(d){try{const db=await idb();await new Promise((res,rej)=>{const tx=db.transaction("decks","readwrite");tx.objectStore("decks").put(JSON.stringify(d),d.id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}catch(e){try{localStorage.setItem("diapo."+d.id,JSON.stringify(d));}catch(_){}}}
async function dbGet(id){try{const db=await idb();return await new Promise((res,rej)=>{const tx=db.transaction("decks","readonly");const g=tx.objectStore("decks").get(id);g.onsuccess=()=>res(g.result?JSON.parse(g.result):null);g.onerror=()=>rej(g.error);});}catch(e){try{const s=localStorage.getItem("diapo."+id);return s?JSON.parse(s):null;}catch(_){return null;}}}
async function dbDel(id){try{const db=await idb();await new Promise(res=>{const tx=db.transaction("decks","readwrite");tx.objectStore("decks").delete(id);tx.oncomplete=res;tx.onerror=res;});}catch(e){}localStorage.removeItem("diapo."+id);}
function idxList(){try{return JSON.parse(localStorage.getItem("diapo.index")||"[]");}catch(e){return[];}}
function idxSave(l){localStorage.setItem("diapo.index",JSON.stringify(l));}
function idxUpsert(d){const l=idxList();const i=l.findIndex(x=>x.id===d.id);const m={id:d.id,title:d.title,updated:d.updated,n:d.slides.length};if(i>=0)l[i]=m;else l.unshift(m);idxSave(l);}
function idxRemove(id){idxSave(idxList().filter(x=>x.id!==id));}
/* ============ color helpers ============ */
function hex(c){if(!c||c==="inherit"||c==="transparent")return null;if(c.startsWith("#")){let h=c.slice(1);if(h.length===3)h=h.split("").map(x=>x+x).join("");return h.toUpperCase();}return null;}
function themeFg(deck,obj){const th=THEMES[deck.theme||0];if(obj&&obj.color&&obj.color!=="inherit")return obj.color;return obj&&obj.onDark? "#ffffff": th.fg;}
/* ============ slide canvas renderer (thumbs / PNG / present) ============ */
function drawRound(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawShapePath(ctx,shape,x,y,w,h){
  ctx.beginPath();
  if(shape==="rect")ctx.rect(x,y,w,h);
  else if(shape==="roundRect"){drawRound(ctx,x,y,w,h,Math.min(w,h)*0.14); }
  else if(shape==="ellipse")ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,7);
  else if(shape==="triangle"){ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();}
  else if(shape==="diamond"){ctx.moveTo(x+w/2,y);ctx.lineTo(x+w,y+h/2);ctx.lineTo(x+w/2,y+h);ctx.lineTo(x,y+h/2);ctx.closePath();}
  else if(shape==="rightArrow"){ctx.moveTo(x,y+h*0.3);ctx.lineTo(x+w*0.65,y+h*0.3);ctx.lineTo(x+w*0.65,y);ctx.lineTo(x+w,y+h/2);ctx.lineTo(x+w*0.65,y+h);ctx.lineTo(x+w*0.65,y+h*0.7);ctx.lineTo(x,y+h*0.7);ctx.closePath();}
  else if(shape==="star"){const cx=x+w/2,cy=y+h/2;for(let i=0;i<10;i++){const r=i%2?0.45:1;const a=-Math.PI/2+i*Math.PI/5;const px=cx+Math.cos(a)*w/2*r,py=cy+Math.sin(a)*h/2*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
  else if(shape==="heart"){ctx.moveTo(x+w/2,y+h*0.9);ctx.bezierCurveTo(x-w*0.1,y+h*0.5,x+w*0.3,y-h*0.1,x+w/2,y+h*0.35);ctx.bezierCurveTo(x+w*0.7,y-h*0.1,x+w*1.1,y+h*0.5,x+w/2,y+h*0.9);}
  else if(shape==="cloud"||shape==="speech"){ctx.ellipse(x+w*0.3,y+h*0.6,w*0.32,h*0.3,0,0,7);ctx.ellipse(x+w*0.55,y+h*0.45,w*0.3,h*0.32,0,0,7);ctx.ellipse(x+w*0.75,y+h*0.62,w*0.25,h*0.26,0,0,7);}
  else ctx.rect(x,y,w,h);
}
function wrapLines(ctx,text,maxW){const out=[];for(const para of String(text||"").split("\n")){const words=para.split(/\s+/).filter(Boolean);if(!words.length){out.push("");continue;}let line="";for(const w of words){const tr=line?line+" "+w:w;if(ctx.measureText(tr).width>maxW&&line){out.push(line);line=w;}else line=tr;}out.push(line);}return out;}
function drawSlideCanvas(cv,deck,si,W,H){
  const s=deck.slides[si];const th=THEMES[deck.theme||0];
  const base=SIZES[deck.size]||SIZES["16:9"];
  const sx=W/base.w, sy=H/base.h;
  const ctx=cv.getContext("2d");cv.width=W;cv.height=H;
  ctx.fillStyle=s.bg||th.bg;ctx.fillRect(0,0,W,H);
  if(deck.bg&&!s.bg){ctx.fillStyle=deck.bg;ctx.fillRect(0,0,W,H);}
  const rtl=(LANG==="ar");
  for(const o of s.objects){
    ctx.save();
    const cx=(o.x+o.w/2)*sx, cy=(o.y+o.h/2)*sy;
    ctx.translate(cx,cy);if(o.rotation)ctx.rotate(o.rotation*Math.PI/180);ctx.translate(-cx,-cy);
    const X=o.x*sx,Y=o.y*sy,Wd=o.w*sx,Ht=o.h*sy;
    if(o.type==="image"&&o.src){try{const img=drawSlideCanvas._img||(drawSlideCanvas._img={});let im=img[o.src];if(!im){im=new Image();im.src=o.src;img[o.src]=im;}if(im.complete&&im.naturalWidth)ctx.drawImage(im,X,Y,Wd,Ht);}catch(e){}}
    else if(o.type==="line"){ctx.strokeStyle=o.stroke||th.accent;ctx.lineWidth=(o.strokeW||3)*sx;ctx.beginPath();ctx.moveTo(X,Y+Ht/2);ctx.lineTo(X+Wd,Y+Ht/2);ctx.stroke();}
    else if(o.type==="table"){drawTable(ctx,o,X,Y,Wd,Ht,th,deck,sx);}
    else{
      const isShape=o.type==="shape";
      const fill=o.fill&&o.fill!=="transparent"?o.fill:(isShape?th.accent2:"transparent");
      const stroke=o.stroke&&o.stroke!=="transparent"?o.stroke:(isShape?th.accent:"transparent");
      if(isShape){drawShapePath(ctx,o.shape||"rect",X,Y,Wd,Ht);if(fill!=="transparent"){ctx.fillStyle=fill;ctx.fill();}if(stroke!=="transparent"){ctx.strokeStyle=stroke;ctx.lineWidth=(o.strokeW||2)*sx;ctx.stroke();}}
      else if(o.fill&&o.fill!=="transparent"){ctx.fillStyle=o.fill;ctx.fillRect(X,Y,Wd,Ht);}
      const col=o.color&&o.color!=="inherit"?o.color:th.fg;
      const font=`${o.italic?"italic ":""}${o.bold?"700":"400"} ${(o.size||24)*sx}px ${o.font&&o.font!=="inherit"?o.font:th.font}`;
      ctx.font=font;ctx.fillStyle=col;ctx.textBaseline="top";
      const align=o.align==="center"?"center":o.align==="end"||(o.align==="start"&&rtl&&false)?"right":"left";
      ctx.textAlign=o.align==="center"?"center":(o.align==="end"?"right":"left");
      const pad=10*sx;const lines=wrapLines(ctx,o.text||"",Wd-pad*2);
      const lh=(o.size||24)*sx*1.32;let ty=Y+pad;
      const blockH=lines.length*lh;
      if(o.valign==="middle")ty=Y+(Ht-blockH)/2;else if(o.valign==="bottom")ty=Y+Ht-blockH-pad;
      lines.forEach((ln,i)=>{let tx=X+pad;if(ctx.textAlign==="center")tx=X+Wd/2;else if(ctx.textAlign==="right")tx=X+Wd-pad;ctx.fillText(ln,tx,ty+i*lh);if(o.underline){const wdt=ctx.measureText(ln).width;let ux=tx;if(ctx.textAlign==="center")ux=tx-wdt/2;else if(ctx.textAlign==="right")ux=tx-wdt;ctx.fillRect(ux,ty+i*lh+lh*0.82,wdt,Math.max(1.5,(o.size||24)*sx*0.05));}});
    }
    ctx.restore();
  }
}
function drawTable(ctx,o,X,Y,Wd,Ht,th,deck,sx){
  const rows=o.rows||2,cols=o.cols||2,cells=o.cells||[];
  const cw=Wd/cols,rh=Ht/rows;
  ctx.font=`400 ${Math.max(8,(o.size||18)*sx)}px ${th.font}`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const x=X+c*cw,y=Y+r*rh;const hdr=r===0&&(o.header!==false);
    ctx.fillStyle=hdr?th.accent:"#ffffff";ctx.fillRect(x,y,cw,rh);
    ctx.strokeStyle=th.accent;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,cw-1,rh-1);
    ctx.fillStyle=hdr?"#fff":th.fg;ctx.textAlign="center";ctx.textBaseline="middle";
    const val=(cells[r]&&cells[r][c])||"";
    ctx.fillText(String(val).slice(0,40),x+cw/2,y+rh/2,{maxWidth:cw-8});
  }
}
/* ============ PPTX export (real, PowerPoint-compatible) ============ */
const EMU=914400/96; // px->emu at 96dpi... use 914400/72? PowerPoint uses 914400 per inch; CSS px = 1/96in
function px2emu(px){return Math.round(px*914400/96);}
function xmlEsc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function aTColor(hexStr){hexStr=(hexStr||"000000").replace("#","");if(hexStr.length===3)hexStr=hexStr.split("").map(c=>c+c).join("");return `<a:srgbClr val="${hexStr.toUpperCase()}"/>`;}
function txBodyXML(o,th){
  const colHex=hex(o.color)||hex(th.fg)||"1D1B19";
  const sz=Math.round((o.size||24)*100);
  const alg=o.align==="center"?"ctr":o.align==="end"?"r":"l";
  const paras=String(o.text||"").split("\n");
  const rPr=`<a:rPr sz="${sz}" b="${o.bold?1:0}" i="${o.italic?1:0}" u="${o.underline?"sng":"none"}"><a:solidFill>${aTColor(colHex)}</a:solidFill><a:latin typeface="${xmlEsc(o.font&&o.font!=="inherit"?o.font:"Calibri")}"/></a:rPr>`;
  return `<p:txBody><a:bodyPr wrap="square" anchor="${o.valign==="top"?"t":o.valign==="bottom"?"b":"ctr"}"/><a:lstStyle/>`+
    paras.map(p=>`<a:p><a:pPr algn="${alg}"/>`+(p?`<a:r>${rPr}<a:t xml:space="preserve">${xmlEsc(p)}</a:t></a:r>`:`<a:endParaRPr lang="en-US"/>`)+`</a:p>`).join("")+`</p:txBody>`;
}
function spXfrm(o,base){return `<a:xfrm><a:off x="${px2emu(o.x*base.w/960)}" y="${px2emu(o.y*base.h/540)}"/><a:ext cx="${px2emu(o.w*base.w/960)}" cy="${px2emu(o.h*base.h/540)}"/></a:xfrm>`;}
function geomFor(shape){const m={rect:"rect",roundRect:"roundRect",ellipse:"ellipse",triangle:"triangle",diamond:"diamond",rightArrow:"rightArrow",star:"star5",heart:"heart",cloud:"cloud",speech:"wedgeRectCallout"};return m[shape]||"rect";}
async function exportPPTX(deck){
  const th=THEMES[deck.theme||0];const base0=SIZES[deck.size]||SIZES["16:9"];
  const base={w:base0.w/96*914400/914400*base0.w,wpx:base0.w,hpx:base0.h}; // keep simple
  const W=deck.size==="4:3"?914400*10:914400*13.333, H=deck.size==="4:3"?914400*7.5:deck.size==="16:10"?914400*8.333:914400*7.5;
  const files=[];let mediaIdx=0;const media=[];
  const bgHex=(hex(th.bg)||"FFFFFF");
  const slideIds=deck.slides.map((_,i)=>256+i);
  // [Content_Types]
  const overrides=deck.slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")+
    deck.slides.map((_,i)=>`<Override PartName="/ppt/notesSlides/notesSlide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`).join("");
  files.push({name:"[Content_Types].xml",data:enc.encode(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${overrides}</Types>`)});
  files.push({name:"_rels/.rels",data:enc.encode(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`)});
  files.push({name:"docProps/core.xml",data:enc.encode(`<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xmlEsc(deck.title)}</dc:title><dc:creator>diapo</dc:creator></cp:coreProperties>`)});
  files.push({name:"docProps/app.xml",data:enc.encode(`<?xml version="1.0"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>diapo</Application><Slides>${deck.slides.length}</Slides></Properties>`)});
  // presentation.xml
  files.push({name:"ppt/presentation.xml",data:enc.encode(`<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${deck.slides.map((_,i)=>`<p:sldId id="${slideIds[i]}" r:id="rId${i+2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`)});
  let presRels=`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`;
  deck.slides.forEach((_,i)=>{presRels+=`<Relationship Id="rId${i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`;});
  files.push({name:"ppt/_rels/presentation.xml.rels",data:enc.encode(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels}</Relationships>`)});
  files.push({name:"ppt/theme/theme1.xml",data:enc.encode(`<?xml version="1.0"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="diapo"><a:themeElements><a:clrScheme name="diapo"><a:dk1><a:srgbClr val="1D1B19"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:accent1><a:srgbClr val="${(hex(th.accent)||"C44730")}"/></a:accent1><a:accent2><a:srgbClr val="${(hex(th.accent2)||"F08B73")}"/></a:accent2></a:clrScheme><a:fmtScheme name="diapo"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst></a:fmtScheme></a:themeElements></a:theme>`)});
  files.push({name:"ppt/slideMasters/_rels/slideMaster1.xml.rels",data:enc.encode(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`)});
  files.push({name:"ppt/slideMasters/slideMaster1.xml",data:enc.encode(`<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bgHex}"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="${H}"/><a:chOff x="0" y="0"/><a:chExt cx="${W}" cy="${H}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`)});
  files.push({name:"ppt/slideLayouts/slideLayout1.xml",data:enc.encode(`<?xml version="1.0"?><p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="blank" preserve="1"><p:cSld name="blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="${H}"/><a:chOff x="0" y="0"/><a:chExt cx="${W}" cy="${H}"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld></p:sldLayout>`)});
  const kx=W/base0.w, ky=H/base0.h; // emu per our 960-based unit
  deck.slides.forEach((s,idx)=>{
    let nid=2;const sp=[];let rels=`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${idx+1}.xml"/>`;
    const sBg=s.bg||th.bg;const sBgHex=hex(sBg)||bgHex;
    for(const o of s.objects){
      nid++;
      const offX=Math.round(o.x/960*W),offY=Math.round(o.y/540*(deck.size==="4:3"?H:H));
      // note: our editor uses base h (540/600/720); normalize:
      const bh=(SIZES[deck.size]||SIZES["16:9"]).h;
      const oy=Math.round(o.y/540*bh/ bh*H* (540/bh) *0 + o.y/bh*H);
      const oX=Math.round(o.x/960*W),oY=Math.round(o.y/bh*H),oCX=Math.round(o.w/960*W),oCY=Math.round(o.h/bh*H);
      if(o.type==="image"&&o.src){
        mediaIdx++;const ext=o.src.startsWith("data:image/jpeg")||o.src.startsWith("data:image/jpg")?"jpg":"png";
        media.push({name:`ppt/media/image${mediaIdx}.${ext}`,data:dataURLtoBytes(o.src)});
        const rId="rId"+(nid+50);rels+=`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${mediaIdx}.${ext}"/>`;
        sp.push(`<p:pic><p:nvPicPr><p:cNvPr id="${nid}" name="img"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${oX}" y="${oY}"/><a:ext cx="${oCX}" cy="${oCY}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`);
      }else if(o.type==="line"){
        sp.push(`<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${nid}" name="line"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="${oX}" y="${oY+H/2*0+oCY/2+oY*0}"/><a:ext cx="${oCX}" cy="12700"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="25400"><a:solidFill>${aTColor(hex(o.stroke)||hex(th.accent)||"C44730")}</a:solidFill></a:ln></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef></p:style></p:cxnSp>`);
      }else if(o.type==="table"){
        const rows=o.rows||2,cols=o.cols||2;const gridW=Math.round(oCX/cols);
        let tbl=`<a:tbl><a:tblPr/><a:tblGrid>${Array.from({length:cols},()=>`<a:gridCol w="${gridW}"/>`).join("")}</a:tblGrid>`;
        for(let r=0;r<rows;r++){tbl+=`<a:tr h="${Math.round(oCY/rows)}">`;for(let c=0;c<cols;c++){const v=((o.cells||[])[r]||[])[c]||"";tbl+=`<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1400"/><a:t xml:space="preserve">${xmlEsc(v)}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>`;}tbl+=`</a:tr>`;}
        tbl+=`</a:tbl>`;
        sp.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${nid}" name="tbl"/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${oX}" y="${oY}"/><a:ext cx="${oCX}" cy="${oCY}"/></a:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">${tbl}</a:graphicData></a:graphic></p:graphicFrame>`);
      }else{
        const isShape=o.type==="shape";
        const fillHex=o.fill&&o.fill!=="transparent"?hex(o.fill):(isShape?(hex(th.accent2)||"F08B73"):null);
        const lnHex=o.stroke&&o.stroke!=="transparent"?hex(o.stroke):(isShape?(hex(th.accent)||"C44730"):null);
        sp.push(`<p:sp><p:nvSpPr><p:cNvPr id="${nid}" name="sp"/><p:cNvSpPr ${isShape?"":"txBox=\"1\" "}/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${oX}" y="${oY}"/><a:ext cx="${oCX}" cy="${oCY}"/></a:xfrm><a:prstGeom prst="${isShape?geomFor(o.shape):"rect"}"><a:avLst/></a:prstGeom>${fillHex?`<a:solidFill>${aTColor(fillHex)}</a:solidFill>`:`<a:noFill/>`}${lnHex?`<a:ln w="${(o.strokeW||2)*12700}"><a:solidFill>${aTColor(lnHex)}</a:solidFill></a:ln>`:`<a:ln><a:noFill/></a:ln>`}</p:spPr>${txBodyXML(o,th)}</p:sp>`);
      }
    }
    files.push({name:`ppt/slides/_rels/slide${idx+1}.xml.rels`,data:enc.encode(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`)});
    files.push({name:`ppt/slides/slide${idx+1}.xml`,data:enc.encode(`<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${sBgHex}"/></a:solidFill></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${W}" cy="${H}"/><a:chOff x="0" y="0"/><a:chExt cx="${W}" cy="${H}"/></a:xfrm></p:grpSpPr>${sp.join("")}</p:spTree></p:cSld></p:sld>`)});
    const notes=xmlEsc(s.notes||"");
    files.push({name:`ppt/notesSlides/notesSlide${idx+1}.xml`,data:enc.encode(`<?xml version="1.0"?><p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6858000" cy="9144000"/><a:chOff x="0" y="0"/><a:chExt cx="6858000" cy="9144000"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="1200"/><a:t xml:space="preserve">${notes}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:notes>`)});
  });
  for(const m of media)files.push(m);
  const zip=await zipWrite(files);
  return new Blob([zip],{type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"});
}
/* ============ PPTX import (basic but real) ============ */
async function importPPTX(buf,name){
  const files=await zipRead(new Uint8Array(buf));
  const pres=dec.decode(files["ppt/presentation.xml"]||new Uint8Array());
  const slideRefs=[...pres.matchAll(/Target="slides\/(slide\d+\.xml)"/g)].map(m=>m[1]);
  const deck={id:uid(),title:(name||"import").replace(/\.pptx$/i,""),theme:0,size:"16:9",bg:null,updated:Date.now(),slides:[]};
  const relsCache={};
  const getRels=s=>{
    const k=`ppt/slides/_rels/${s}.rels`;
    if(relsCache[k]!==undefined)return relsCache[k];
    try{relsCache[k]=dec.decode(files[k]||new Uint8Array());}catch(e){relsCache[k]="";}
    return relsCache[k];
  };
  const emu=v=>Math.round(parseInt(v||"0",10)/914400*96);
  for(const s of slideRefs.length?slideRefs:Object.keys(files).filter(k=>k.startsWith("ppt/slides/slide")&&k.endsWith(".xml"))){
    const key=s.includes("/")?s:("ppt/slides/"+s);const xml=dec.decode(files[key]||new Uint8Array());
    if(!xml)continue;
    const doc=new DOMParser().parseFromString(xml,"application/xml");
    const slide={id:uid(),layout:"blank",bg:null,hidden:false,transition:"fade",dur:.5,notes:"",objects:[]};
    const sps=[...doc.getElementsByTagName("p:sp"),...doc.getElementsByTagName("sp")];
    const W0=13.333*96,H0=7.5*96;
    for(const sp of sps){
      try{
        const off=sp.getElementsByTagName("a:off")[0],ext=sp.getElementsByTagName("a:ext")[0];
        const x=off?emu(off.getAttribute("x"))/W0*960:60,y=off?emu(off.getAttribute("y"))/H0*540:60;
        const w=ext?emu(ext.getAttribute("cx"))/W0*960:300,h=ext?emu(ext.getAttribute("cy"))/H0*540:100;
        const ts=[...sp.getElementsByTagName("a:t"),...sp.getElementsByTagName("t")].map(n=>n.textContent).join("");
        if(!ts.trim()&&sp.querySelector?.("ph"))continue;
        if(!ts.trim())continue;
        const rPr=sp.getElementsByTagName("a:rPr")[0]||sp.getElementsByTagName("rPr")[0];
        slide.objects.push(oBox(clamp(x,0,900),clamp(y,0,500),clamp(w,40,900),clamp(h,30,500),{text:ts,size:rPr&&rPr.getAttribute("sz")?Math.round(parseInt(rPr.getAttribute("sz"))/100):24,bold:rPr?.getAttribute("b")==="1",italic:rPr?.getAttribute("i")==="1"}));
      }catch(e){}
    }
    // images
    const pics=[...doc.getElementsByTagName("p:pic"),...doc.getElementsByTagName("pic")];
    const rels=getRels(s.split("/").pop());
    for(const pic of pics){
      try{
        const off=pic.getElementsByTagName("a:off")[0],ext=pic.getElementsByTagName("a:ext")[0];
        const blip=pic.getElementsByTagName("a:blip")[0];const emb=blip?.getAttribute("r:embed")||blip?.getAttribute("embed");
        const m=rels.match(new RegExp(`Id="${emb}"[^>]*Target="([^"]+)"`));let target=m?m[1]:"";
        target=target.replace("../","ppt/");if(!target.startsWith("ppt/"))target="ppt/slides/"+target.replace(/^\//,"");
        let key=Object.keys(files).find(k=>k.endsWith(target.split("/").pop()));
        if(key&&files[key]){const bytes=files[key];const b64=bytesToB64(bytes);const ext2=key.endsWith("jpg")||key.endsWith("jpeg")?"jpeg":"png";
          const x=off?emu(off.getAttribute("x"))/W0*960:60,y=off?emu(off.getAttribute("y"))/H0*540:60;
          const w=ext?emu(ext.getAttribute("cx"))/W0*960:300,h=ext?emu(ext.getAttribute("cy"))/H0*540:200;
          slide.objects.push({id:uid(),type:"image",x,y,w,h,rotation:0,src:`data:image/${ext2};base64,${b64}`});}
      }catch(e){}
    }
    if(!slide.objects.length)slide.objects.push(oBox(60,60,840,200,{text:"(Imported slide — no text extracted)",size:22}));
    deck.slides.push(slide);
    if(deck.slides.length>=300)break;
  }
  if(!deck.slides.length)deck.slides.push(newSlide("title"));
  return deck;
}
/* ============ app state ============ */
let S={deck:null,si:0,sel:new Set(),zoom:1,mode:"dark-auto",presentIdx:0,presentNotes:false,dirty:false};
let HIST={stack:[],i:-1};
function snap(){return JSON.stringify({deck:S.deck,si:S.si});}
function pushHist(){if(!S.deck)return;HIST.stack=HIST.stack.slice(0,HIST.i+1);HIST.stack.push(snap());if(HIST.stack.length>80)HIST.stack.shift();HIST.i=HIST.stack.length-1;}
function applySnap(j){const o=JSON.parse(j);S.deck=o.deck;S.si=o.si;S.sel=new Set();}
function undo(){if(HIST.i>0){HIST.i--;applySnap(HIST.stack[HIST.i]);rerender();markSaved(false);}}
function redo(){if(HIST.i<HIST.stack.length-1){HIST.i++;applySnap(HIST.stack[HIST.i]);rerender();markSaved(false);}}
const saveSoon=debounce(async()=>{if(!S.deck)return;S.deck.updated=Date.now();await dbPut(S.deck);idxUpsert(S.deck);setSaveState(t("saved"));S.dirty=false;},900);
function markSaved(ok){setSaveState(ok?t("saved"):t("saving"));if(!ok){S.dirty=true;saveSoon();}}
function setSaveState(s){const e=$("#savestate");if(e)e.textContent="● "+s;}
/* ============ shell ============ */
function shell(){
  document.documentElement.lang=LANG;document.documentElement.dir=LANG==="ar"?"rtl":"ltr";
  const dark=localStorage.getItem("diapo.theme")||"auto";
  document.documentElement.dataset.theme=(dark==="dark"||(dark==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches))?"dark":"";
  const app=$("#app");app.innerHTML="";
  const route=location.hash||"#/home";
  if(route.startsWith("#/edit"))return editorView(app);
  return homeView(app);
}
function topbar(showDoc){
  const h=document.createElement("div");h.className="topbar";
  h.innerHTML=`<div class="logo" id="go-home"><span class="dot"><svg width="15" height="15" viewBox="0 0 16 16"><rect x="1.5" y="2" width="13" height="8.6" rx="2" fill="#fff" opacity=".96"/><path d="M6.4 4.3v4.2l3.6-2.1z" fill="#4f46e5"/><rect x="4" y="12.2" width="8" height="1.6" rx=".8" fill="#fff" opacity=".85"/></svg></span><span>diapo</span></div>
  ${showDoc?`<input class="doc-title" id="doc-title" value="${esc(S.deck?.title||"")}" title="${t("title")}"><span class="savestate" id="savestate"></span>`:""}
  <div class="spacer"></div>
  <select class="btn small" id="lang"><option value="ar">عربي</option><option value="en">EN</option><option value="fr">FR</option></select>
  <button class="iconbtn" id="theme-btn" title="${t("theme")}">◐</button>
  ${showDoc?`<button class="btn" id="btn-present">▶ ${t("present")}</button><button class="btn primary" id="btn-save">💾 ${t("save")}</button>`:`<button class="btn primary" id="btn-new2">${t("new")}</button>`}`;
  h.querySelector("#lang").value=LANG;
  h.querySelector("#lang").onchange=e=>{LANG=e.target.value;localStorage.setItem("diapo.lang",LANG);shell();};
  h.querySelector("#theme-btn").onclick=()=>{const cur=localStorage.getItem("diapo.theme")||"auto";const nx=cur==="auto"?"dark":cur==="dark"?"light":"auto";localStorage.setItem("diapo.theme",nx);shell();toast(nx);};
  const gh=h.querySelector("#go-home");if(gh)gh.onclick=()=>location.hash="#/home";
  const bn=h.querySelector("#btn-new2");if(bn)bn.onclick=()=>newDeckFlow();
  if(showDoc){
    h.querySelector("#doc-title").oninput=e=>{S.deck.title=e.target.value;markSaved(false);};
    h.querySelector("#btn-present").onclick=()=>openPresent(S.si);
    h.querySelector("#btn-save").onclick=async()=>{await dbPut(S.deck);idxUpsert(S.deck);setSaveState(t("saved"));toast(t("saved"));};
  }
  return h;
}
/* ============ home ============ */
async function homeView(app){
  app.appendChild(topbar(false));
  const d=document.createElement("div");d.className="home";
  d.innerHTML=`<h1>diapo <span style="color:var(--brand)">✦</span></h1>
  <p class="sub">Fast presentations in the browser — practical, complete, private. ${esc(t("presentHelp"))}</p>
  <div class="actions"><button class="btn primary" id="b-new">${t("new")}</button>
  <button class="btn" id="b-import">📥 ${t("import")}</button>
  <button class="btn" id="b-demo">✨ ${t("start")}</button>
  <input class="btn" id="q" placeholder="${t("search")}" style="min-width:200px"></div>
  <div class="deck-grid" id="grid"></div>
  <footer class="foot"><span>© 2026 salim-slimani</span><span>diapo ✦ fast presentations</span></footer>`;
  app.appendChild(d);
  const grid=d.querySelector("#grid");
  async function draw(filter=""){
    grid.innerHTML="";const list=idxList().filter(x=>x.title.includes(filter));
    if(!list.length){grid.innerHTML=`<div style="color:var(--muted)">${t("empty")}</div>`;}
    for(const m of list){
      const deck=await dbGet(m.id);if(!deck)continue;
      const card=document.createElement("div");card.className="deck";
      const cv=document.createElement("canvas");card.appendChild(cv);
      try{drawSlideCanvas(cv,deck,0,320,180);}catch(e){}
      card.insertAdjacentHTML("beforeend",`<div class="meta"><b>${esc(deck.title)}</b><small>${deck.slides.length} • ${new Date(deck.updated).toLocaleDateString()}</small></div>
      <div class="ops"><button class="btn small">✏️ ${t("open")}</button><button class="btn small" data-a="dl">⬇ ${t("pptx")}</button><button class="btn small" data-a="dup">⧉</button><button class="btn small" data-a="ren">✎</button><button class="btn small" data-a="del">🗑</button></div>`);
      card.onclick=async e=>{
        const a=e.target.closest("button")?.dataset.a;
        if(a==="del"){if(confirm(t("confirmDel"))){await dbDel(deck.id);idxRemove(deck.id);draw(d.querySelector("#q").value);return;}}
        if(a==="dup"){const c=JSON.parse(JSON.stringify(deck));c.id=uid();c.title+=" (2)";await dbPut(c);idxUpsert(c);draw();return;}
        if(a==="ren"){const n=prompt(t("rename"),deck.title);if(n){deck.title=n;await dbPut(deck);idxUpsert(deck);draw();}return;}
        if(a==="dl"){const b=await exportPPTX(deck);download(b,deck.title+".pptx");return;}
        location.hash="#/edit?id="+deck.id;
      };
      grid.appendChild(card);
    }
  }
  draw();
  d.querySelector("#q").oninput=e=>draw(e.target.value);
  d.querySelector("#b-new").onclick=()=>newDeckFlow();
  d.querySelector("#b-demo").onclick=async()=>{const x=demoDecks();await dbPut(x);idxUpsert(x);location.hash="#/edit?id="+x.id;};
  d.querySelector("#b-import").onclick=()=>pickFiles();
  window.onkeydown=e=>{if(e.key==="n"&&(e.ctrlKey||e.metaKey)){e.preventDefault();newDeckFlow();}};
}
async function newDeckFlow(){
  const title=prompt(t("title"),t("untitled"))||t("untitled");
  const d=newDeck(title);await dbPut(d);idxUpsert(d);location.hash="#/edit?id="+d.id;
}
/* file picker */
function pickFiles(){const i=$("#hidden-file");i.value="";i.click();}
document.addEventListener("change",async e=>{
  if(e.target.id!=="hidden-file")return;
  for(const f of e.target.files){
    if(f.name.match(/\.pptx$/i)){toast(t("saving"));const b=await f.arrayBuffer();try{const d=await importPPTX(b,f.name);await dbPut(d);idxUpsert(d);location.hash="#/edit?id="+d.id;}catch(err){toast("Import failed: "+err.message);}}
    else if(f.name.match(/\.json$/i)){try{const d=JSON.parse(await f.text());d.id=uid();await dbPut(d);idxUpsert(d);location.hash="#/edit?id="+d.id;}catch(err){toast("JSON error");}}
    else if(f.type.startsWith("image/")){toast("🖼 "+f.name+" — open a deck, then drop it there");}
  }
});
/* ============ editor ============ */
function editorView(app){
  app.appendChild(topbar(true));
  const ws=document.createElement("div");ws.className="workspace";
  ws.innerHTML=`<aside class="slides-pane"><header><button class="btn small" id="add-slide">${t("add")}</button><span style="font-size:12px;color:var(--muted)">${t("slides")}</span></header><div id="thumb-list"></div></aside>
  <div class="stage-wrap"><div class="ribbon" id="ribbon"></div>
  <div class="stage" id="stage"><div id="slide-holder"><div id="slide"></div><div id="marquee"></div></div></div>
  <div class="statusbar"><span id="pos">16:9</span><span id="cnt"></span><span class="zoom"><button class="iconbtn" id="z-out">−</button><input type="range" id="z" min="25" max="400" value="100" style="width:120px"><span id="z-v">100%</span><button class="iconbtn" id="z-in">+</button><button class="btn small" id="z-fit">${t("fit")}</button></span></div></div>
  <aside class="side-pane" id="side"></aside>`;
  app.appendChild(ws);
  buildRibbon();buildSide();bindStage();
  loadDeck().then(()=>{pushHist();rerender();wireZoom();});
  async function loadDeck(){
    const id=(location.hash.match(/id=([^&]+)/)||[])[1];
    S.deck=await dbGet(id);
    if(!S.deck){S.deck=demoDecks();await dbPut(S.deck);idxUpsert(S.deck);}
    S.si=0;S.sel=new Set();HIST={stack:[],i:-1};
    $("#doc-title").value=S.deck.title;
  }
}
function wireZoom(){
  const z=$("#z");const apply=v=>{S.zoom=v/100;$("#z-v").textContent=v+"%";layoutSlide();};
  z.oninput=e=>apply(+e.target.value);
  $("#z-in").onclick=()=>{z.value=clamp(+z.value+10,25,400);apply(+z.value);};
  $("#z-out").onclick=()=>{z.value=clamp(+z.value-10,25,400);apply(+z.value);};
  $("#z-fit").onclick=fitZoom;
  $("#add-slide").onclick=()=>addSlide("blank");
}
function fitZoom(){
  const st=$("#stage");const base=SIZES[S.deck.size]||SIZES["16:9"];
  const r=st.getBoundingClientRect();const v=clamp(Math.floor(Math.min((r.width-60)/base.w,(r.height-60)/base.h)*100),25,200);
  $("#z").value=v;S.zoom=v/100;$("#z-v").textContent=v+"%";layoutSlide();
}
function layoutSlide(){
  const base=SIZES[S.deck.size]||SIZES["16:9"];
  const holder=$("#slide-holder"),sl=$("#slide");
  sl.style.width=base.w+"px";sl.style.height=base.h+"px";
  holder.style.width=base.w*S.zoom+"px";holder.style.height=base.h*S.zoom+"px";
  sl.style.transform=`scale(${S.zoom})`;
}
function buildRibbon(){
  const r=$("#ribbon");
  r.innerHTML=`
  <div class="grp"><button class="iconbtn" id="r-undo" title="${t("undo")} (Ctrl+Z)">↩</button><button class="iconbtn" id="r-redo" title="${t("redo")} (Ctrl+Y)">↪</button></div>
  <div class="grp"><span class="lbl">${t("insert")}</span>
    <button class="btn small" data-ins="textbox">T ${t("textbox")}</button>
    <button class="btn small" data-ins="shape">▭ ${t("shape")}</button>
    <button class="btn small" data-ins="line">╱ ${t("line")}</button>
    <button class="btn small" data-ins="table">▦ ${t("table")}</button>
    <button class="btn small" data-ins="image">🖼 ${t("image")}</button></div>
  <div class="grp fmt" id="fmt"><span class="lbl">${t("format")}</span>
    <select id="f-font">${FONTS.map(f=>`<option>${f}</option>`).join("")}</select>
    <input type="number" id="f-size" min="8" max="200" value="24">
    <button id="f-b"><b>B</b></button><button id="f-i"><i>I</i></button><button id="f-u"><u>U</u></button>
    <input type="color" id="f-color" value="#1d1b19"><input type="color" id="f-fill" value="#ffffff" title="${t("bgs")}">
    <button id="f-al">⇤</button><button id="f-ac">⇥⇤</button><button id="f-ar">⇥</button>
    <button id="f-front" title="${t("front")}">⤴</button><button id="f-back" title="${t("back")}">⤵</button>
    <button id="f-link" title="${t("link")}">🔗</button><button id="f-del" title="${t("del")}">🗑</button></div>
  <div class="grp"><span class="lbl">${t("design")}</span><select class="btn small" id="r-theme">${THEMES.map((x,i)=>`<option value="${i}">${x.name}</option>`).join("")}</select>
    <select class="btn small" id="r-size"><option>16:9</option><option>16:10</option><option>4:3</option></select>
    <select class="btn small" id="r-trans">${TRANS.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("")}</select></div>
  <div class="grp"><button class="btn small" id="r-find">🔍 ${t("find")}</button>
    <button class="btn small" id="r-notes">📝 ${t("notes")}</button>
    <button class="btn small" id="r-png">⬇ ${t("png")}</button>
    <button class="btn small" id="r-pptx">⬇ ${t("pptx")}</button>
    <button class="btn small" id="r-pdf">🖨 ${t("pdf")}</button>
    <button class="btn small" id="r-help">?</button></div>`;
  r.querySelectorAll("[data-ins]").forEach(b=>b.onclick=()=>insertObj(b.dataset.ins));
  const F=id=>r.querySelector(id);
  F("#f-b").onclick=()=>fmtSel(o=>o.bold=!o.bold);
  F("#f-i").onclick=()=>fmtSel(o=>o.italic=!o.italic);
  F("#f-u").onclick=()=>fmtSel(o=>o.underline=!o.underline);
  F("#f-size").onchange=e=>fmtSel(o=>o.size=+e.target.value);
  F("#f-font").onchange=e=>fmtSel(o=>o.font=e.target.value);
  F("#f-color").oninput=e=>fmtSel(o=>o.color=e.target.value);
  F("#f-fill").oninput=e=>fmtSel(o=>{o.fill=e.target.value;if(o.type==="textbox"&&e.target.value==="#ffffff")o.fill="transparent";});
  F("#f-al").onclick=()=>fmtSel(o=>o.align="start");
  F("#f-ac").onclick=()=>fmtSel(o=>o.align="center");
  F("#f-ar").onclick=()=>fmtSel(o=>o.align="end");
  F("#f-front").onclick=()=>reorder(1);F("#f-back").onclick=()=>reorder(-1);
  F("#f-del").onclick=deleteSel;
  F("#f-link").onclick=()=>{const o=curObjs()[0];if(!o)return toast(t("noSel"));const v=prompt("https://…",o.link||"https://");if(v!==null){o.link=v;pushHist();markSaved(false);}};
  F("#r-theme").value=S.deck?.theme||0;F("#r-theme").onchange=e=>{S.deck.theme=+e.target.value;pushHist();rerender();markSaved(false);};
  F("#r-size").value=S.deck?.size||"16:9";F("#r-size").onchange=e=>{S.deck.size=e.target.value;pushHist();rerender();markSaved(false);};
  F("#r-trans").value=S.deck?.slides[S.si]?.transition||"fade";F("#r-trans").onchange=e=>{curSlide().transition=e.target.value;pushHist();markSaved(false);};
  F("#r-undo").onclick=undo;F("#r-redo").onclick=redo;
  F("#r-find").onclick=findDialog;F("#r-notes").onclick=()=>{const p=$("#side");p.scrollTop=p.scrollHeight;$("#notes-f").focus();};
  F("#r-png").onclick=exportPNGs;F("#r-pptx").onclick=async()=>{const b=await exportPPTX(S.deck);download(b,S.deck.title+".pptx");};
  F("#r-pdf").onclick=()=>window.print();F("#r-help").onclick=helpDialog;
}
function buildSide(){
  const p=$("#side");
  p.innerHTML=`<div><h3>🧭 ${t("slides")}</h3><div class="row"><button class="btn small" data-l="title">⊞ Title</button><button class="btn small" data-l="title-content">☰</button><button class="btn small" data-l="two-col">☷</button><button class="btn small" data-l="section">◼</button><button class="btn small" data-l="pic-cap">🖼</button><button class="btn small" data-l="blank">＋</button></div>
  <div class="row"><button class="btn small" id="s-dup">⧉ ${t("dup")}</button><button class="btn small" id="s-hide">👁 ${t("hide")}</button><button class="btn small" id="s-del">🗑 ${t("del")}</button></div></div>
  <div><h3>🎨 ${t("format")}</h3><div id="fmt-pane" style="font-size:13px;color:var(--muted)">${t("noSel")}</div></div>
  <div><h3>📝 ${t("notes")}</h3><textarea id="notes-f" rows="5" placeholder="${t("notesPh")}" style="width:100%;background:var(--bg);border:1px solid var(--line);border-radius:8px;color:var(--ink);padding:8px"></textarea></div>
  <div><h3>⚡ ${t("trans")}</h3><div class="row"><select class="btn small" id="s-trans">${TRANS.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("")}</select><input type="range" id="s-dur" min="0" max="2" step="0.1" value="0.5"></div></div>
  <div><h3>↔ ${t("arrange")}</h3><div class="row"><button class="btn small" data-a="left">⇤</button><button class="btn small" data-a="cx">⇥⇤</button><button class="btn small" data-a="right">⇥</button><button class="btn small" data-a="top">⇪</button><button class="btn small" data-a="cy">⇪⇪</button><button class="btn small" data-a="bot">⇩</button></div></div>`;
  p.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>addSlide(b.dataset.l));
  p.querySelector("#s-dup").onclick=dupSlide;p.querySelector("#s-hide").onclick=()=>{curSlide().hidden=!curSlide().hidden;pushHist();rerender();markSaved(false);};
  p.querySelector("#s-del").onclick=delSlide;
  p.querySelector("#notes-f").oninput=e=>{curSlide().notes=e.target.value;markSaved(false);};
  p.querySelector("#s-trans").onchange=e=>{curSlide().transition=e.target.value;pushHist();markSaved(false);};
  p.querySelector("#s-dur").oninput=e=>{curSlide().dur=+e.target.value;markSaved(false);};
  p.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>alignSel(b.dataset.a));
}
/* ---- model ops ---- */
const curSlide=()=>S.deck.slides[S.si];
const curObjs=()=>curSlide().objects.filter(o=>S.sel.has(o.id));
function addSlide(layout){S.deck.slides.splice(S.si+1,0,newSlide(layout));S.si++;S.sel=new Set();pushHist();rerender();markSaved(false);}
function dupSlide(){const c=JSON.parse(JSON.stringify(curSlide()));c.id=uid();c.objects.forEach(o=>o.id=uid());S.deck.slides.splice(S.si+1,0,c);S.si++;pushHist();rerender();markSaved(false);}
function delSlide(){if(S.deck.slides.length<=1)return toast("—");S.deck.slides.splice(S.si,1);S.si=clamp(S.si,0,S.deck.slides.length-1);S.sel=new Set();pushHist();rerender();markSaved(false);}
function insertObj(kind){
  const s=curSlide();let o;
  if(kind==="textbox")o=oBox(200,180,420,140,{text:t("textPh"),size:26});
  else if(kind==="shape")o={id:uid(),type:"shape",shape:SHAPES[Math.floor(Math.random()*SHAPES.length)],x:250,y:170,w:300,h:180,rotation:0,fill:THEMES[S.deck.theme].accent2,stroke:THEMES[S.deck.theme].accent,strokeW:3,text:"",size:24,color:"inherit",align:"center",valign:"middle"};
  else if(kind==="line")o={id:uid(),type:"line",x:200,y:250,w:400,h:20,rotation:0,stroke:THEMES[S.deck.theme].accent,strokeW:4};
  else if(kind==="table")o={id:uid(),type:"table",x:180,y:140,w:600,h:260,rotation:0,rows:3,cols:3,header:true,size:20,cells:[["A","B","C"],["1","2","3"],["4","5","6"]]};
  else if(kind==="image")return pickImageForSlide();
  s.objects.push(o);S.sel=new Set([o.id]);pushHist();rerender(true);markSaved(false);
}
function pickImageForSlide(){const i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=true;i.onchange=()=>{for(const f of i.files){const r=new FileReader();r.onload=()=>{let img=new Image();img.onload=()=>{let{w,h}=img;const mx=560;if(w>mx){h=h*mx/w;w=mx;}curSlide().objects.push({id:uid(),type:"image",x:200,y:150,w:Math.round(w/2),h:Math.round(h/2),rotation:0,src:r.result});S.sel=new Set([curSlide().objects.at(-1).id]);pushHist();rerender();markSaved(false);};img.src=r.result;};r.readAsDataURL(f);}};i.click();}
function fmtSel(fn){const os=curObjs();if(!os.length)return toast(t("noSel"));os.forEach(fn);pushHist();rerender(true);markSaved(false);}
function reorder(d){const s=curSlide();curObjs().forEach(o=>{const i=s.objects.indexOf(o);const j=clamp(i+d,0,s.objects.length-1);s.objects.splice(i,1);s.objects.splice(j,0,o);});pushHist();rerender(true);markSaved(false);}
function deleteSel(){const s=curSlide();s.objects=s.objects.filter(o=>!S.sel.has(o.id));S.sel=new Set();pushHist();rerender();markSaved(false);}
function alignSel(a){const base=SIZES[S.deck.size];const os=curObjs();if(!os.length)return;const xs=os.map(o=>o.x),ys=os.map(o=>o.y);
  if(os.length===1){const o=os[0];if(a==="left")o.x=40;if(a==="right")o.x=base.w-o.w-40;if(a==="cx")o.x=(base.w-o.w)/2;if(a==="top")o.y=40;if(a==="bot")o.y=base.h-o.h-40;if(a==="cy")o.y=(base.h-o.h)/2;}
  else{if(a==="left"){const m=Math.min(...xs);os.forEach(o=>o.x=m);}if(a==="right"){const m=Math.max(...os.map(o=>o.x+o.w));os.forEach(o=>o.x=m-o.w);}if(a==="cx"){const m=(Math.min(...xs)+Math.max(...os.map(o=>o.x+o.w)))/2;os.forEach(o=>o.x=m-o.w/2);}if(a==="top"){const m=Math.min(...ys);os.forEach(o=>o.y=m);}if(a==="bot"){const m=Math.max(...os.map(o=>o.y+o.h));os.forEach(o=>o.y=m-o.h);}if(a==="cy"){const m=(Math.min(...ys)+Math.max(...os.map(o=>o.y+o.h)))/2;os.forEach(o=>o.y=m-o.h/2);}}
  pushHist();rerender(true);markSaved(false);}
/* ---- render editor ---- */
function rerender(keepSel){
  if(!S.deck)return;
  layoutSlide();renderThumbs();renderSlide();renderFmtPane();renderStatus();
  const tr=$("#r-trans");if(tr)tr.value=curSlide().transition;
  const st=$("#s-trans");if(st)st.value=curSlide().transition;
  const nf=$("#notes-f");if(nf&&document.activeElement!==nf)nf.value=curSlide().notes||"";
}
function renderStatus(){$("#cnt").textContent=`${S.si+1} / ${S.deck.slides.length}`;$("#pos").textContent=S.deck.size;}
function renderThumbs(){
  const list=$("#thumb-list");list.innerHTML="";
  S.deck.slides.forEach((s,i)=>{
    const d=document.createElement("div");d.className="thumb"+(i===S.si?" sel":"")+(s.hidden?" hidden-slide":"");
    const cv=document.createElement("canvas");d.appendChild(cv);
    try{drawSlideCanvas(cv,S.deck,i,192,Math.round(192*((SIZES[S.deck.size]||SIZES["16:9"]).h/960)));}catch(e){}
    d.insertAdjacentHTML("beforeend",`<span class="n">${i+1}</span>`);
    d.draggable=true;
    d.onclick=e=>{if(e.ctrlKey||e.metaKey){}S.si=i;S.sel=new Set();rerender();};
    d.ondblclick=()=>openPresent(i);
    d.ondragstart=e=>e.dataTransfer.setData("text/slide",i);
    d.ondragover=e=>{e.preventDefault();d.classList.add("drop-target");};
    d.ondragleave=()=>d.classList.remove("drop-target");
    d.ondrop=e=>{e.preventDefault();const from=+e.dataTransfer.getData("text/slide");if(isNaN(from))return;const[mv]=S.deck.slides.splice(from,1);S.deck.slides.splice(i,0,mv);S.si=i;pushHist();rerender();markSaved(false);};
    d.oncontextmenu=e=>{e.preventDefault();slideMenu(e.clientX,e.clientY,i);};
    list.appendChild(d);
  });
  list.scrollTop=Math.max(0,(S.si-2)*120);
}
function renderSlide(){
  const sl=$("#slide");sl.innerHTML="";
  const deck=S.deck,s=curSlide(),th=THEMES[deck.theme||0];
  sl.style.background=s.bg||th.bg;sl.style.color=th.fg;
  sl.style.fontFamily=th.font;
  for(const o of s.objects){
    const el=document.createElement("div");
    el.className="obj"+(S.sel.has(o.id)?" selected":"");
    el.dataset.id=o.id;
    el.style.cssText=`left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;transform:rotate(${o.rotation||0}deg);`;
    if(o.type==="image"){el.innerHTML=`<img src="${o.src}" draggable="false">`;}
    else if(o.type==="line"){el.innerHTML=`<div style="position:absolute;top:50%;left:0;right:0;height:${o.strokeW||3}px;background:${esc(o.stroke||th.accent)};transform:translateY(-50%)"></div>`;}
    else if(o.type==="table"){el.appendChild(tableEl(o,th));}
    else{
      const isShape=o.type==="shape";
      const fill=o.fill&&o.fill!=="transparent"?o.fill:(isShape?th.accent2:"transparent");
      const stroke=o.stroke&&o.stroke!=="transparent"?o.stroke:(isShape?th.accent:"transparent");
      let shapeCss="";
      if(isShape){shapeCss=`background:${fill};border:${o.strokeW||2}px solid ${stroke};`+(o.shape==="ellipse"?"border-radius:50%;":o.shape==="roundRect"?"border-radius:18px;":o.shape==="diamond"?"transform:rotate(0deg);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);":"");}
      else if(o.fill&&o.fill!=="transparent")shapeCss=`background:${esc(o.fill)};`;
      el.innerHTML=`<div class="txt" style="${shapeCss}color:${esc(o.color&&o.color!=="inherit"?o.color:th.fg)};font-size:${o.size||24}px;font-weight:${o.bold?700:400};font-style:${o.italic?"italic":"normal"};text-decoration:${o.underline?"underline":"none"};text-align:${o.align==="center"?"center":o.align==="end"?"right":"left"};display:flex;flex-direction:column;justify-content:${o.valign==="top"?"flex-start":o.valign==="bottom"?"flex-end":"center"};padding:8px;font-family:${o.font&&o.font!=="inherit"?o.font:"inherit"}">${esc(o.text||"")||'<span style="opacity:.35">'+t("textPh")+"</span>"}</div>`;
      if(o.link)el.title="🔗 "+o.link;
    }
    sl.appendChild(el);
  }
  drawHandles();
}
function tableEl(o,th){
  const tb=document.createElement("table");
  tb.style.cssText="width:100%;height:100%;border-collapse:collapse;table-layout:fixed";
  for(let r=0;r<(o.rows||2);r++){const tr=document.createElement("tr");
    for(let c=0;c<(o.cols||2);c++){const td=document.createElement("td");
      td.textContent=((o.cells||[])[r]||[])[c]||"";
      td.contentEditable="true";td.dataset.r=r;td.dataset.c=c;
      td.style.cssText=`border:1px solid ${th.accent};padding:6px;font-size:${o.size||18}px;${r===0&&o.header!==false?`background:${th.accent};color:#fff;font-weight:700;`:"background:#fff;"}`;
      td.oninput=e=>{while(o.cells.length<=r)o.cells.push([]);o.cells[r][c]=e.target.textContent;markSaved(false);};
      td.onmousedown=e=>e.stopPropagation();
      tr.appendChild(td);}
    tb.appendChild(tr);}
  return tb;
}
function drawHandles(){
  $$(".handle").forEach(h=>h.remove());$$(".guide").forEach(h=>h.remove());
  const sl=$("#slide");const os=curObjs();if(!os.length)return;
  const o=os[0];
  if(os.length===1){
    const pos=[["nw",0,0,"nwse-resize"],["n",50,0,"ns-resize"],["ne",100,0,"nesw-resize"],["e",100,50,"ew-resize"],["se",100,100,"nwse-resize"],["s",50,100,"ns-resize"],["sw",0,100,"nesw-resize"],["w",0,50,"ew-resize"]];
    for(const[id,px,py,cur]of pos){const h=document.createElement("div");h.className="handle";h.dataset.h=id;
      h.style.cssText=`left:${o.x+o.w*px/100-6}px;top:${o.y+o.h*py/100-6}px;cursor:${cur}`;sl.appendChild(h);}
    const r=document.createElement("div");r.className="handle rot";r.dataset.h="rot";r.textContent="⟳";r.style.fontSize="11px";r.style.left=(o.x+o.w/2-7)+"px";r.style.top=(o.y-30)+"px";sl.appendChild(r);
  }
}
/* ---- interactions ---- */
function bindStage(){
  const stage=$("#stage"),sl=$("#slide"),mq=$("#marquee");
  let drag=null;
  sl.onmousedown=e=>{
    if(e.button===2)return;
    const cell=e.target.closest("td");if(cell)return;
    const el=e.target.closest(".obj");
    if(e.target.closest(".handle")){startResize(e);return;}
    if(!el){ // marquee
      const hr=$("#slide-holder").getBoundingClientRect();
      const ox=(e.clientX-hr.left)/S.zoom,oy=(e.clientY-hr.top)/S.zoom;
      drag={mode:"marquee",x0:ox,y0:oy};mq.style.display="block";return;
    }
    const id=el.dataset.id;
    if(e.shiftKey){S.sel.has(id)?S.sel.delete(id):S.sel.add(id);renderSlide();return;}
    if(!S.sel.has(id)){S.sel=new Set([id]);renderSlide();}
    const o=curSlide().objects.find(x=>x.id===id);
    const hr=$("#slide-holder").getBoundingClientRect();
    drag={mode:"move",id,dx:(e.clientX-hr.left)/S.zoom-o.x,dy:(e.clientY-hr.top)/S.zoom-o.y,moved:false,ox:o.x,oy:o.y};
  };
  window.onmousemove=e=>{
    if(!drag)return;
    const hr=$("#slide-holder").getBoundingClientRect();
    const mx=(e.clientX-hr.left)/S.zoom,my=(e.clientY-hr.top)/S.zoom;
    if(drag.mode==="marquee"){
      const x=Math.min(drag.x0,mx),y=Math.min(drag.y0,my),w=Math.abs(mx-drag.x0),h=Math.abs(my-drag.y0);
      mq.style.cssText=`display:block;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      S.sel=new Set(curSlide().objects.filter(o=>o.x<x+w&&o.x+o.w>x&&o.y<y+h&&o.y+o.h>y).map(o=>o.id));
      renderSlide();mq.style.cssText=`display:block;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      return;
    }
    const o=curSlide().objects.find(x=>x.id===drag.id);if(!o)return;
    let nx=mx-drag.dx,ny=my-drag.dy;
    if(!e.altKey){ // snapping
      const base=SIZES[S.deck.size];const others=curSlide().objects.filter(x=>x.id!==o.id);
      const guides=[];
      const candX=[0,base.w/2-o.w/2,base.w-o.w,...others.flatMap(p=>[p.x-o.w,p.x+p.w/2-o.w/2,p.x+p.w])];
      const candY=[0,base.h/2-o.h/2,base.h-o.h,...others.flatMap(p=>[p.y-o.h,p.y+p.h/2-o.h/2,p.y+p.h])];
      for(const cx of candX)if(Math.abs(nx-cx)<8){nx=cx;guides.push({x:cx<0?0:cx});break;}
      for(const cy of candY)if(Math.abs(ny-cy)<8){ny=cy;guides.push({y:cy});break;}
      $$(".guide").forEach(g=>g.remove());
      for(const g of guides){const d=document.createElement("div");d.className="guide";
        if(g.x!==undefined)d.style.cssText=`left:${g.x+o.w/2}px;top:0;width:1.5px;height:100%`;else d.style.cssText=`top:${g.y+o.h/2}px;left:0;height:1.5px;width:100%`;
        $("#slide").appendChild(d);}
    }
    o.x=Math.round(nx);o.y=Math.round(ny);drag.moved=true;
    const el=$(`.obj[data-id="${o.id}"]`);if(el){el.style.left=o.x+"px";el.style.top=o.y+"px";}
    drawHandlesPos(o);
  };
  window.onmouseup=e=>{
    if(drag?.mode==="marquee"){mq.style.display="none";renderSlide();renderFmtPane();}
    else if(drag?.moved){pushHist();markSaved(false);renderSlide();renderFmtPane();}
    else if(drag){renderSlide();renderFmtPane();}
    $$(".guide").forEach(g=>g.remove());drag=null;resizing=null;
  };
  let resizing=null;
  function startResize(e){
    const h=e.target.closest(".handle");if(!h)return;e.stopPropagation();
    const o=curObjs()[0];if(!o)return;
    const hr=$("#slide-holder").getBoundingClientRect();
    resizing={h:h.dataset.h,o,x0:(e.clientX-hr.left)/S.zoom,y0:(e.clientY-hr.top)/S.zoom,box:{...o}};
    const mv=ev=>{
      if(!resizing)return;const mx=(ev.clientX-hr.left)/S.zoom,my=(ev.clientY-hr.top)/S.zoom;
      const dx=mx-resizing.x0,dy=my-resizing.y0;const b={...resizing.box};const id=resizing.h;
      if(id.includes("e"))b.w=Math.max(30,b.w+dx);if(id.includes("s"))b.h=Math.max(30,b.h+dy);
      if(id.includes("w")){b.x=b.x+dx;b.w=Math.max(30,b.w-dx);}if(id.includes("n")){b.y=b.y+dy;b.h=Math.max(30,b.h-dy);}
      if(id==="rot"){const cx=b.x+b.w/2,cy=b.y+b.h/2;let a=Math.atan2(my-cy,mx-cx)*180/Math.PI+90;if(ev.shiftKey)a=Math.round(a/15)*15;resizing.o.rotation=Math.round(a);rerenderLight(resizing.o);return;}
      Object.assign(resizing.o,{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.w),h:Math.round(b.h)});
      rerenderLight(resizing.o);
    };
    const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);if(resizing){pushHist();markSaved(false);renderSlide();}resizing=null;};
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  }
  function rerenderLight(o){const el=$(`.obj[data-id="${o.id}"]`);if(el){el.style.left=o.x+"px";el.style.top=o.y+"px";el.style.width=o.w+"px";el.style.height=o.h+"px";el.style.transform=`rotate(${o.rotation||0}deg)`;}drawHandlesPos(o);}
  function drawHandlesPos(o){$$(".handle").forEach(h=>{const id=h.dataset.h;const m={nw:[0,0],n:[50,0],ne:[100,0],e:[100,50],se:[100,100],s:[50,100],sw:[0,100],w:[0,50]}[id];if(!m)return;h.style.left=(o.x+o.w*m[0]/100-6)+"px";h.style.top=(o.y+o.h*m[1]/100-6)+"px";});const r=$(".handle.rot");if(r){r.style.left=(o.x+o.w/2-7)+"px";r.style.top=(o.y-30)+"px";}}
  sl.ondblclick=e=>{
    const el=e.target.closest(".obj");if(!el)return;
    const o=curSlide().objects.find(x=>x.id===el.dataset.id);if(!o||o.type==="image"||o.type==="line"||o.type==="table")return;
    const txt=el.querySelector(".txt");txt.contentEditable="true";txt.focus();
    document.execCommand?.("selectAll",false,null);
    const done=()=>{o.text=txt.innerText.replace(/\n{3,}/g,"\n\n");txt.contentEditable="false";pushHist();rerender();markSaved(false);};
    txt.onblur=done;txt.onkeydown=ev=>{if(ev.key==="Escape"){txt.blur();}ev.stopPropagation();};
  };
  sl.oncontextmenu=e=>{e.preventDefault();const el=e.target.closest(".obj");objMenu(e.clientX,e.clientY,el?.dataset.id);};
  stage.ondragover=e=>e.preventDefault();
  stage.ondrop=e=>{
    e.preventDefault();
    for(const f of e.dataTransfer.files){
      if(f.name.match(/\.pptx$/i)){f.arrayBuffer().then(async b=>{const d=await importPPTX(b,f.name);S.deck=d;S.si=0;S.sel=new Set();await dbPut(d);idxUpsert(d);pushHist();rerender();});}
      else if(f.type.startsWith("image/")){const r=new FileReader();r.onload=()=>{curSlide().objects.push({id:uid(),type:"image",x:200,y:150,w:320,h:200,rotation:0,src:r.result});pushHist();rerender();markSaved(false);};r.readAsDataURL(f);}
    }
  };
  document.onkeydown=keyHandler;
}
function keyHandler(e){
  if(location.hash.startsWith("#/present")||$("#present")?.classList.contains("on"))return presentKeys(e);
  if(!S.deck||!location.hash.startsWith("#/edit"))return;
  const tag=(document.activeElement?.tagName||"").toLowerCase();
  if(tag==="input"||tag==="textarea"||document.activeElement?.isContentEditable)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&!e.shiftKey){e.preventDefault();undo();}
  else if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==="y"||(e.key.toLowerCase()==="z"&&e.shiftKey))){e.preventDefault();redo();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();dbPut(S.deck).then(()=>{idxUpsert(S.deck);toast(t("saved"));});}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"){e.preventDefault();dupSlide();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="x"){e.preventDefault();cutSel();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="c"&&S.sel.size){e.preventDefault();copySel();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="v"){e.preventDefault();pasteSel();}else if(e.key==="Delete"||e.key==="Backspace"){if(S.sel.size){deleteSel();}}
  else if(e.key==="F5"){e.preventDefault();openPresent(S.si);}
  else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){if(S.sel.size){const d=e.key==="ArrowRight"?(LANG==="ar"?-1:1):(LANG==="ar"?1:-1);curObjs().forEach(o=>o.x+=d*(e.shiftKey?10:1));rerender(true);}else{S.si=clamp(S.si+(e.key==="ArrowRight"?(LANG==="ar"?-1:1):(LANG==="ar"?1:-1)),0,S.deck.slides.length-1);S.sel=new Set();rerender();}}
  else if(e.key==="ArrowDown"||e.key==="ArrowUp"){if(S.sel.size){curObjs().forEach(o=>o.y+=e.key==="ArrowDown"?1:-1);rerender(true);}else{S.si=clamp(S.si+(e.key==="ArrowDown"?1:-1),0,S.deck.slides.length-1);S.sel=new Set();rerender();}}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"){e.preventDefault();S.sel=new Set(curSlide().objects.map(o=>o.id));renderSlide();renderFmtPane();}
  else if(e.key==="Escape"){S.sel=new Set();renderSlide();renderFmtPane();}
}
/* ---- format pane ---- */
function renderFmtPane(){
  const p=$("#fmt-pane");if(!p)return;const os=curObjs();
  if(!os.length){p.innerHTML=`<span>${t("noSel")}</span>`;return;}
  const o=os[0];
  p.innerHTML=`<div class="row"><label>X</label><input type="number" id="fp-x" value="${o.x}" style="width:70px"><label>Y</label><input type="number" id="fp-y" value="${o.y}" style="width:70px"></div>
  <div class="row"><label>W</label><input type="number" id="fp-w" value="${o.w}" style="width:70px"><label>H</label><input type="number" id="fp-h" value="${o.h}" style="width:70px"></div>
  <div class="row"><label>⟳</label><input type="range" id="fp-r" min="-180" max="180" value="${o.rotation||0}"><span>${o.rotation||0}°</span></div>
  ${o.type!=="image"&&o.type!=="line"?`<div class="row"><label>Fill</label><input type="color" id="fp-fill" value="${o.fill?.startsWith("#")?o.fill:"#ffffff"}"><label>Line</label><input type="color" id="fp-st" value="${o.stroke?.startsWith("#")?o.stroke:"#c44730"}"></div>`:""}
  ${o.type==="table"?`<div class="row"><button class="btn small" id="fp-tr">+ row</button><button class="btn small" id="fp-tc">+ col</button></div>`:""}
  ${o.text!==undefined?`<div class="row"><textarea id="fp-tx" rows="3" style="width:100%">${esc(o.text||"")}</textarea></div>`:""}`;
  const upd=()=>{o.x=+p.querySelector("#fp-x").value;o.y=+p.querySelector("#fp-y").value;o.w=Math.max(20,+p.querySelector("#fp-w").value);o.h=Math.max(20,+p.querySelector("#fp-h").value);o.rotation=+p.querySelector("#fp-r").value;pushHist();rerender(true);markSaved(false);};
  ["#fp-x","#fp-y","#fp-w","#fp-h"].forEach(s=>p.querySelector(s).onchange=upd);
  p.querySelector("#fp-r").oninput=upd;
  const ff=p.querySelector("#fp-fill");if(ff)ff.oninput=e=>{o.fill=e.target.value;pushHist();rerender(true);markSaved(false);};
  const fs=p.querySelector("#fp-st");if(fs)fs.oninput=e=>{o.stroke=e.target.value;pushHist();rerender(true);markSaved(false);};
  const tx=p.querySelector("#fp-tx");if(tx)tx.oninput=e=>{o.text=e.target.value;markSaved(false);const el=$(`.obj[data-id="${o.id}"] .txt`);if(el)el.textContent=o.text;};
  const tr=p.querySelector("#fp-tr");if(tr)tr.onclick=()=>{o.rows++;o.cells.push(Array(o.cols).fill(""));pushHist();rerender(true);markSaved(false);};
  const tc=p.querySelector("#fp-tc");if(tc)tc.onclick=()=>{o.cols++;o.cells.forEach(r=>r.push(""));pushHist();rerender(true);markSaved(false);};
}
/* ---- menus / dialogs ---- */
function closeCtx(){$$(".ctx").forEach(x=>x.remove());}
document.addEventListener("click",e=>{if(!e.target.closest(".ctx"))closeCtx();});
function menu(x,y,items){
  closeCtx();const d=document.createElement("div");d.className="ctx";d.style.left=x+"px";d.style.top=y+"px";
  for(const it of items){if(it==="-"){d.appendChild(document.createElement("hr"));continue;}
    const b=document.createElement("button");b.innerHTML=it[0];b.onclick=()=>{closeCtx();it[1]();};d.appendChild(b);}
  document.body.appendChild(d);
  const r=d.getBoundingClientRect();if(r.right>innerWidth)d.style.left=(x-r.width)+"px";if(r.bottom>innerHeight)d.style.top=(y-r.height)+"px";
}
function objMenu(x,y,id){
  if(id&&!S.sel.has(id)){S.sel=new Set([id]);renderSlide();}
  menu(x,y,[`✂️ Cut`,()=>cutSel()],[`📋 Copy`,()=>copySel()],[`📌 Paste`,pasteSel],"-",[`⤴ ${t("front")}`,()=>reorder(1)],[`⤵ ${t("back")}`,()=>reorder(-1)],"-",[`⧉ ${t("dup")}`,()=>{const s=curSlide();curObjs().forEach(o=>{const c={...o,id:uid(),x:o.x+20,y:o.y+20};s.objects.push(c)});pushHist();rerender();markSaved(false);}], [`🔗 ${t("link")}`,()=>{const o=curObjs()[0];if(o){const v=prompt("https://…",o.link||"");if(v!==null){o.link=v;pushHist();markSaved(false);}}}],[`🗑 ${t("del")}`,deleteSel]);
}
function slideMenu(x,y,i){
  menu(x,y,[`▶ ${t("present")}`,()=>openPresent(i)],[`⧉ ${t("dup")}`,()=>{S.si=i;dupSlide();}],[`👁 ${t("hide")}`,()=>{S.deck.slides[i].hidden=!S.deck.slides[i].hidden;pushHist();rerender();markSaved(false);}],"-",[`🗑 ${t("del")}`,()=>{S.si=i;delSlide();}]);
}
let CLIP=null;
function cutSel(){CLIP=JSON.stringify(curObjs());deleteSel();}
function copySel(){CLIP=JSON.stringify(curObjs());toast("📋");}
function pasteSel(){if(!CLIP)return;const arr=JSON.parse(CLIP);arr.forEach(o=>{o.id=uid();o.x+=24;o.y+=24;curSlide().objects.push(o);});S.sel=new Set(arr.map(o=>o.id));pushHist();rerender();markSaved(false);}
function findDialog(){
  const d=document.createElement("dialog");
  d.innerHTML=`<h2>🔍 ${t("find")}</h2><div class="row"><input type="text" id="fd-q" placeholder="…"><label><input type="checkbox" id="fd-c"> Aa</label></div><div class="row"><input type="text" id="fd-r" placeholder="↳ …"></div><div class="row"><button class="btn" id="fd-one">1 ⇄</button><button class="btn" id="fd-all">∀ ⇄</button><span id="fd-n" style="color:var(--muted)"></span><div class="spacer" style="flex:1"></div><button class="btn primary" id="fd-x">OK</button></div>`;
  document.body.appendChild(d);d.showModal();
  const count=()=>{const q=d.querySelector("#fd-q").value,cs=d.querySelector("#fd-c").checked;let n=0;S.deck.slides.forEach(s=>s.objects.forEach(o=>{if(o.text){const a=cs?o.text:o.text.toLowerCase(),b=cs?q:q.toLowerCase();if(b&&a.includes(b))n++;}}));d.querySelector("#fd-n").textContent=n+" ✓";};
  d.querySelector("#fd-q").oninput=count;
  const rep=all=>{const q=d.querySelector("#fd-q").value,r=d.querySelector("#fd-r").value,cs=d.querySelector("#fd-c").checked;if(!q)return;let done=false;
    S.deck.slides.forEach(s=>s.objects.forEach(o=>{if(!o.text)return;const has=cs?o.text.includes(q):o.text.toLowerCase().includes(q.toLowerCase());if(has&&(all||!done)){o.text=cs?o.text.split(q).join(r):o.text.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),r);done=true;}}));
    pushHist();rerender();markSaved(false);count();};
  d.querySelector("#fd-one").onclick=()=>rep(false);d.querySelector("#fd-all").onclick=()=>rep(true);
  d.querySelector("#fd-x").onclick=()=>{d.close();d.remove();};
}
function helpDialog(){
  const d=document.createElement("dialog");
  d.innerHTML=`<h2>diapo ✦</h2><div style="font-size:14px;line-height:2">🖱️ <b>Double-click</b> to type • <b>Shift+click</b> multi-select • <b>Alt+drag</b> to disable snapping<br>⌨️ <kbd>Ctrl+Z</kbd> undo <kbd>Ctrl+S</kbd> save <kbd>F5</kbd> present <kbd>Del</kbd> delete <kbd>Ctrl+A</kbd> select all<br>📥 Drop a <b>pptx</b> or an image anywhere • 🖨 Print = PDF • ⬇ PNG per slide or as ZIP<br>🌍 English + Français + عربي • ◐ light / dark • ↔ 16:9 / 16:10 / 4:3</div><div class="row"><button class="btn primary" onclick="this.closest('dialog').close()">OK</button></div>`;
  document.body.appendChild(d);d.showModal();d.addEventListener("close",()=>d.remove());
}
/* ---- PNG export ---- */
async function exportPNGs(){
  toast(t("saving"));
  const base=SIZES[S.deck.size];const cv=document.createElement("canvas");
  if(S.deck.slides.length===1){drawSlideCanvas(cv,S.deck,0,1920,Math.round(1920*base.h/base.w));cv.toBlob(b=>download(b,S.deck.title+".png"),"image/png");return;}
  const files=[];
  for(let i=0;i<S.deck.slides.length;i++){drawSlideCanvas(cv,S.deck,i,1600,Math.round(1600*base.h/base.w));const b=await new Promise(r=>cv.toBlob(r,"image/png"));files.push({name:`slide-${i+1}.png`,data:new Uint8Array(await b.arrayBuffer())});}
  const z=await zipWrite(files);download(new Blob([z],{type:"application/zip"}),S.deck.title+"-png.zip");
}
/* ============ present ============ */
function openPresent(i){
  let ov=$("#present");
  if(!ov){ov=document.createElement("div");ov.id="present";ov.innerHTML=`<div id="present-slide"></div><div id="present-notes"></div><div id="present-bar"><button id="p-prev">‹</button><span id="p-n" style="color:#fff"></span><button id="p-next">›</button><button id="p-notes">📝</button><button id="p-t">⏱</button><button id="p-fs">⛶</button><button id="p-x">✕</button></div><div style="position:fixed;top:10px;color:#888;font-size:12px" id="p-help"></div>`;document.body.appendChild(ov);
    ov.querySelector("#p-prev").onclick=e=>{e.stopPropagation();pGo(S.presentIdx-1);};
    ov.querySelector("#p-next").onclick=e=>{e.stopPropagation();pGo(S.presentIdx+1);};
    ov.querySelector("#p-x").onclick=()=>ov.classList.remove("on");
    ov.querySelector("#p-fs").onclick=()=>{document.fullscreenElement?document.exitFullscreen():ov.requestFullscreen?.();};
    ov.querySelector("#p-notes").onclick=e=>{e.stopPropagation();S.presentNotes=!S.presentNotes;ov.querySelector("#present-notes").style.display=S.presentNotes?"block":"none";};
    ov.onclick=e=>{if(e.target.id==="present")pGo(S.presentIdx+1);};
  }
  ov.classList.remove("black","white");
  ov.querySelector("#p-help").textContent=t("presentHelp");
  S.presentIdx=i??S.si;showP();ov.classList.add("on");
  window.onkeydown=presentKeys;
  function showP(){pGo(S.presentIdx);}
}
function pGo(i){
  const ov=$("#present");if(!ov)return;
  const vis=S.deck.slides.map((s,k)=>({s,k})).filter(x=>!x.s.hidden);
  if(!vis.length)return;
  S.presentIdx=clamp(i,0,S.deck.slides.length-1);
  while(S.deck.slides[S.presentIdx]?.hidden){S.presentIdx+=i>S.presentIdx?1:-1;S.presentIdx=clamp(S.presentIdx,0,S.deck.slides.length-1);}
  const holder=ov.querySelector("#present-slide");
  const W=Math.min(innerWidth-40,innerHeight*16/9*1.0),H=W*(((SIZES[S.deck.size]||SIZES["16:9"]).h)/((SIZES[S.deck.size]||SIZES["16:9"]).w));
  holder.style.width=W+"px";holder.style.height=H+"px";
  const cv=document.createElement("canvas");holder.innerHTML="";holder.appendChild(cv);
  drawSlideCanvas(cv,S.deck,S.presentIdx,1280,Math.round(1280*((SIZES[S.deck.size]).h/(SIZES[S.deck.size]).w)));
  cv.style.width="100%";cv.style.height="100%";
  const tr=S.deck.slides[S.presentIdx].transition||"fade";
  holder.style.animation="none";void holder.offsetWidth;
  holder.style.animation=tr==="none"?"":tr==="zoom"?"pzoom .45s":tr==="slide"?"pslide .45s":"pfade .45s";
  ov.querySelector("#p-n").textContent=(S.presentIdx+1)+" / "+S.deck.slides.length;
  const nt=ov.querySelector("#present-notes");nt.textContent=S.deck.slides[S.presentIdx].notes||"";nt.style.display=S.presentNotes&&nt.textContent?"block":"none";
  if(!document.getElementById("p-anim")){const st=document.createElement("style");st.id="p-anim";st.textContent="@keyframes pfade{from{opacity:0}to{opacity:1}}@keyframes pslide{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}@keyframes pzoom{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}";document.head.appendChild(st);}
}
function presentKeys(e){
  const ov=$("#present");if(!ov?.classList.contains("on"))return keyHandler(e);
  if(["ArrowRight"," ","PageDown","n","N"].includes(e.key)){e.preventDefault();pGo(S.presentIdx+1);}
  else if(["ArrowLeft","PageUp","p","P"].includes(e.key)){e.preventDefault();pGo(S.presentIdx-1);}
  else if(e.key==="Escape"){ov.classList.remove("on");window.onkeydown=keyHandler;}
  else if(e.key==="b"||e.key==="B")ov.classList.toggle("black");
  else if(e.key==="w"||e.key==="W")ov.classList.toggle("white");
  else if(e.key==="f"||e.key==="F"){document.fullscreenElement?document.exitFullscreen():ov.requestFullscreen?.();}
}
/* ============ boot ============ */
window.addEventListener("hashchange",shell);
document.addEventListener("DOMContentLoaded",shell);
