/* Monster Hunter — moo cooperativo (até 4 jogadores). Arquivo separado do index.html.
   Inventário/itens/equipamentos ficam neste navegador (chave mh:<sala>:<uid>), amarrados ao id da sala (rid): sala nova = itens zerados. Também são apagados quando a sala fecha.
   O estado compartilhado da sala usa o nó efêmero "mh/<sala>" do Realtime Database já conectado (apagado ao fechar). */
(()=>{'use strict';
const $=i=>document.getElementById(i),B=()=>window.MHB,d=n=>1+Math.floor(Math.random()*n),R=a=>a[d(a.length)-1],now=()=>Date.now();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug=s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const CL={guerreiro:['Guerreiro','🛡️',120,20,8,'Golpe Devastador'],mago:['Mago','🔮',80,60,15,'Bola de Fogo'],clerigo:['Clérigo','✨',95,50,12,'Luz Curativa'],cacador:['Caçador','🏹',90,30,10,'Tiro Preciso']};
const RAR=[['Comum','#9E9E9E',60],['Incomum','#4CAF50',25],['Raro','#2196F3',9],['Épico','#9C27B0',4],['Lendário','#FF9800',1.5],['Mítico','#F44336',.4],['Divino','#FFD700',.1]];
const MON=['Goblin','Esqueleto','Lobo','Zumbi','Aranha Gigante'],ELI=['Ogre','Necromante','Minotauro','Cavaleiro Maldito'],BOS=['Dragão Escarlate','Rei Lich','Hidra','Demônio Antigo','Colosso de Pedra'];
const BL={guerra:['Bênção da Guerra','+10% dano por nível'],vida:['Bênção da Vida','+15% HP por nível'],fortuna:['Bênção da Fortuna','+20% ouro por nível'],destino:['Bênção do Destino','+1d20 por rolagem, por nível']};
const POT={pp:['Poção Pequena',40,25,'hp'],pm:['Poção Média',100,70,'hp'],pg:['Poção Grande',220,160,'hp'],fm:['Frasco de Mana',35,40,'mp']};
const AT={for:'Força',int:'Inteligência',fe:'Fé',vit:'Vitalidade',des:'Destreza',sor:'Sorte'};
const ATD={for:'+1d20 a cada 5 (usa o maior) · Caçador: +3 de dano por ponto',int:'+1d20 a cada 5 nos ataques do Mago (usa o maior)',fe:'+1d20 a cada 5 na cura do Clérigo (usa o maior)',vit:'+10 HP por ponto',des:'esquiva: +1d20 a cada 5 (esquiva ao tirar 18+)',sor:'+0,5% de crítico por ponto e itens melhores'};
const IDLE=600000,STALE=90000,need=l=>Math.round(30*Math.pow(l,1.7)),
 ATKG=1.1,/* crescimento do ataque dos monstros por andar */ MINDMG=.3;/* a defesa nunca reduz mais que 70% do dano */
let code=null,S=null,L=null,off=null,hbT=null,sel=0,tab='inv',note='',lerr='',conOff=null,jT=null;
const bn=k=>(S&&S.bl&&+S.bl[k])||0,hm=()=>1+.15*bn('vida');/* nível de cada bênção (acumulativa) e multiplicador de HP */

const rf=p=>B().ref(B().db,'mh/'+code+(p?'/'+p:'')),upd=o=>B().update(rf(),o),commit=()=>{S.ts=now();return B().set(rf(),S)};
const me=()=>S&&S.p[B().uid],ids=()=>Object.keys(S.p).filter(u=>now()-S.p[u].hb<STALE).sort(),alive=()=>ids().filter(u=>S.p[u].hp>0);
const K=c=>`mh:${c||code}:${B().uid}`;
const ld=rid=>{try{const x=JSON.parse(localStorage.getItem(K()));if(x&&x.rid===rid)return x}catch(e){}return{rid,inv:[],eq:{arma:null,escudo:null,acc:[]},pot:{pp:2,pm:0,pg:0,fm:1}}};
const sv=()=>{L.ts=now();try{localStorage.setItem(K(),JSON.stringify(L))}catch(e){}};
const clearLocal=c=>{try{localStorage.removeItem(K(c))}catch(e){}};
function sweep(){try{for(const k of Object.keys(localStorage))if(k.startsWith('mh:')){const x=JSON.parse(localStorage.getItem(k));if(!x||now()-x.ts>IDLE*2)localStorage.removeItem(k)}}catch(e){}}

const newP=c=>({name:B().name,cls:c,lv:1,xp:0,hp:CL[c][2],mhp:CL[c][2],mp:CL[c][3],mmp:CL[c][3],at:{for:0,int:0,fe:0,vit:0,des:0,sor:0},pts:0,gold:20,atk:0,mag:0,def:0,crit:0,hb:now(),df:false,stat:{dmg:0,rec:0,heal:0,crit:0,kills:0}});
const roll=n=>{let k=1+Math.floor(n/5)+bn('destino'),m=0;for(;k>0;k--)m=Math.max(m,d(20));return m};
const log=t=>{S.log.push(t);S.log=S.log.slice(-8)};

/* ---- itens ---- */
function mk(f,minR,luck){const w=RAR.map((a,i)=>a[2]*(i>1?1+luck*.1:1)),tot=w.reduce((a,b)=>a+b);let x=Math.random()*tot,r=0;for(;r<6&&x>w[r];r++)x-=w[r];r=Math.max(r,minR);
 const t=R(['arma','arma','escudo','acc','acc']),v=Math.round((2+f*1.2)*(1+r*.6)),n=R({arma:['Espada','Machado','Cajado','Arco','Adaga'],escudo:['Escudo','Broquel'],acc:['Anel','Amuleto','Talismã']}[t]);
 const it={id:now()+'_'+d(9999),t,r,n:`${n} ${R(['Velho','Sólido','Rúnico','Sombrio','Ancestral','Infernal','Celestial'].slice(0,r+1))} ${R(['do Rei Goblin','do Lich','da Hidra','do Colosso','do Dragão'])}`};
 if(t==='arma'){it.atk=v;it.mag=v}else if(t==='escudo')it.def=v;else{it.hp=v*3;it.crit=r}return it}
const iStats=i=>[['atk','Ataque'],['mag','Mag'],['def','Def'],['hp','HP'],['crit','Crít%']].filter(([k])=>i[k]).map(([k,n])=>`${n} +${i[k]}`).join(' · ');
const iCard=(i,btns)=>`<div class="mhi r${i.r}" style="--c:${RAR[i.r][1]}"><b>${esc(i.n)}</b><small>${RAR[i.r][0]} · ${i.t} · ${iStats(i)}</small><div>${btns||''}</div></div>`;
function gearSync(){const g={atk:0,mag:0,def:0,hp:0,crit:0};[L.eq.arma,L.eq.escudo,...L.eq.acc].filter(Boolean).forEach(i=>{for(const k in g)g[k]+=i[k]||0});
 const p=me(),m=Math.round((CL[p.cls][2]+(p.lv-1)*8+p.at.vit*10+g.hp)*hm()),u='p/'+B().uid+'/';
 upd({[u+'atk']:g.atk,[u+'mag']:g.mag,[u+'def']:g.def,[u+'crit']:g.crit,[u+'mhp']:m,[u+'hp']:Math.min(p.hp,m)})}

/* ---- andares ---- */
function enter(){S.floor++;const f=S.floor;S.mon=[];S.loot=S.loot||null;Object.values(S.p).forEach(p=>{if(p.hp<=0)p.hp=Math.round(p.mhp*.5);p.mp=p.mmp});
 const x=Math.random(),rt=f%5===0?'boss':x<.2?'elite':x<.3?'treasure':x<.4?'sanct':x<.47?'trap':x<.55?'merchant':'combat';S.rt=rt;
 if(['combat','elite','boss'].includes(rt)){const n=rt==='boss'?1:rt==='elite'?d(2):d(3),sc=.7+.3*Math.max(1,ids().length);
  for(let i=0;i<n;i++){const k=rt==='boss'?6:rt==='elite'?2.2:1,hp=Math.round(30*Math.pow(1.1,f-1)*k*sc);
   S.mon.push({n:rt==='boss'?BOS[(f/5-1)%5|0]:R(rt==='elite'?ELI:MON),hp,mhp:hp,atk:Math.round(6*Math.pow(ATKG,f-1)*(rt==='boss'?2:rt==='elite'?1.5:1)),df:6+Math.floor(f*.9),xp:Math.round((12+f*3)*Math.pow(1.1,f-1)*k),g:Math.round((8+f*4)*Math.pow(1.15,f-1)*k),boss:rt==='boss'})}
  S.ph='combat';S.turn=alive()[0];log(`Andar ${f}: ${rt==='boss'?'CHEFE!':rt==='elite'?'sala de elite':'combate'} — ${S.mon.map(m=>m.n).join(', ')}`)}
 else{const al=ids();if(rt==='treasure'){const g=Math.round(40*Math.pow(1.15,f-1));al.forEach(u=>S.p[u].gold+=g);S.run.gold+=g*al.length;log(`Tesouro perdido! +${g} ouro para todos.`)}
  else if(rt==='sanct'){al.forEach(u=>S.p[u].hp=Math.min(S.p[u].mhp,S.p[u].hp+Math.round(S.p[u].mhp*.4)));log('Santuário: o grupo recupera 40% do HP.')}
  else if(rt==='trap'){al.forEach(u=>{const p=S.p[u];p.hp=Math.max(1,p.hp-Math.round(p.mhp*.12))});log('Armadilha! Todos perdem 12% do HP.')}
  else log('Comerciante misterioso: aproveite o mercado.');S.ph='market'}}
const after=()=>{S.ph=S.mon[0]&&S.mon[0].boss?'bless':'market'};
function win(){const f=S.floor,al=alive();let xp=0,g=0;S.mon.forEach(m=>{xp+=m.xp;g+=m.g;if(m.boss)S.run.boss++});S.run.mon+=S.mon.length;g=Math.round(g*(1+.2*bn('fortuna')));
 al.forEach(u=>{const p=S.p[u];p.xp+=xp;p.gold+=g;p.stat.kills+=S.mon.length;while(p.xp>=need(p.lv)){p.xp-=need(p.lv);p.lv++;p.mhp+=Math.round(8*hm());p.hp=Math.min(p.mhp,p.hp+Math.round(p.mhp*.25));if(p.lv%3===0)p.pts++}});
 S.run.gold+=g*al.length;log(`Vitória! +${xp} XP e +${g} ouro cada.`);
 const boss=S.mon[0].boss;if(boss||Math.random()<Math.min(.9,.5+.012*f)){const it=mk(f,boss?2:0,al.reduce((a,u)=>a+S.p[u].at.sor,0)/5);if(it.r>=(S.run.bi||-1))S.run.bi=it.r,S.run.best=it.n;S.loot={id:it.id,it,v:{}};S.ph='loot'}else after()}
function resolveLoot(){const l=S.loot,al=alive();if(!l||l.win||S.ph!=='loot')return;if(!al.every(u=>l.v&&l.v[u]))return;
 const w=al.filter(u=>l.v[u]==='want'),rolls={};w.forEach(u=>rolls[u]=d(20)+d(0.0001)*0);
 if(w.length){const best=w.reduce((a,b)=>rolls[b]>rolls[a]?b:a);l.win={u:best,rolls};log(`${S.p[best].name} ficou com ${l.it.n}${w.length>1?' ('+w.map(u=>S.p[u].name+' '+rolls[u]).join(', ')+')':''}.`)}else{l.win={u:'',rolls:{}};log('Ninguém quis o item.')}after();commit()}
function adv(){const al=alive();if(S.mon.every(m=>m.hp<=0))return win();const i=al.indexOf(S.turn);if(i<0){S.turn=al[0];return}
 if(i<al.length-1){S.turn=al[i+1];return}
 S.mon.filter(m=>m.hp>0).forEach(m=>{const a=alive();if(!a.length)return;const u=R(a),p=S.p[u];
  if(roll(p.at.des)>=18){log(`${p.name} esquivou de ${m.n}!`);return}
  const raw=m.atk*(.85+Math.random()*.3);let dm=Math.max(raw*MINDMG,raw-p.def*.5);if(p.df)dm*=p.cls==='guerreiro'?.3:.5;if(p.cls==='guerreiro')dm*=.8;dm=Math.max(1,Math.round(dm));p.hp=Math.max(0,p.hp-dm);p.stat.rec+=dm;log(`${m.n} acerta ${p.name} (-${dm})${p.hp<=0?' ☠️':''}`)});
 Object.values(S.p).forEach(p=>p.df=false);
 if(!alive().length){S.ph='over';log('O grupo caiu...');return}S.turn=alive()[0]}

/* ---- ações do jogador ---- */
function act(k){const u=B().uid,p=S.p[u];if(S.ph!=='combat'||S.turn!==u)return;const c=p.cls,M=c==='mago',sk=k==='sk',tg=S.mon[sel]&&S.mon[sel].hp>0?S.mon[sel]:S.mon.find(m=>m.hp>0);
 if(sk&&p.mp<CL[c][4]){note='MP insuficiente.';return render()}note='';p.mp=Math.min(p.mmp,p.mp+3);
 if(k==='df'){p.df=true;log(`${p.name} se defende.`)}
 else if(sk){p.mp-=CL[c][4]}
 if(k!=='df'){
  if(sk&&c==='clerigo'){const a=alive().map(x=>S.p[x]).sort((x,y)=>x.hp/x.mhp-y.hp/y.mhp)[0],h=Math.round((roll(p.at.fe)+p.lv*2+10)*1.1);a.hp=Math.min(a.mhp,a.hp+h);p.stat.heal+=h;log(`${p.name} cura ${a.name} (+${h}).`)}
  else{(sk&&M?S.mon.filter(m=>m.hp>0):[tg]).forEach(m=>{const r=roll(M?p.at.int:p.at.for),b=(M?p.mag:p.atk)+p.lv+(c==='cacador'?p.at.for*3:0),df=sk&&c==='cacador'?m.df*.5:m.df;
   if(r!==20&&r+b<=df)return log(`${p.name} erra ${m.n} (${r})`);
   const cr=Math.random()<.05+(c==='cacador'?.05:0)+p.crit/100+p.at.sor*.005;let dm=(r*.6+b)*(sk&&c==='guerreiro'?2:1)*(M?1.15:1)*(1+.1*bn('guerra'))*(cr?2:1);dm=Math.max(1,Math.round(dm));
   m.hp=Math.max(0,m.hp-dm);p.stat.dmg+=dm;if(cr)p.stat.crit++;log(`${p.name} ${sk?CL[c][5]:'ataca'} ${m.n}: ${dm}${cr?' CRÍTICO!':''}${m.hp<=0?' ☠️':''}`)})}}
 adv();commit()}
function usePot(k){const p=me();if(!L.pot[k])return;L.pot[k]--;const o=POT[k];if(o[3]==='hp')p.hp=Math.min(p.mhp,p.hp+o[1]);else p.mp=Math.min(p.mmp,p.mp+o[1]);sv();upd({['p/'+B().uid+'/hp']:p.hp,['p/'+B().uid+'/mp']:p.mp});render()}

/* ---- sala ---- */
async function enterRoom(name,cls,create){lerr='';const c=slug(name);if(!c){lerr='Informe o nome da sala.';return render()}
 try{const sn=await B().get(B().ref(B().db,'mh/'+c));let s=sn.val();
  if(s&&(now()-s.ts>IDLE||!Object.values(s.p||{}).some(p=>now()-p.hb<STALE*2))){await B().remove(B().ref(B().db,'mh/'+c));clearLocal(c);s=null}
  if(create&&s)throw'Já existe uma sala com esse nome.';if(!create&&!s)throw'Sala não encontrada.';
  const u=B().uid;if(s&&!s.p[u]&&Object.values(s.p).filter(q=>now()-q.hb<STALE).length>=4)throw'Sala cheia (máx. 4 jogadores).';
  const rid=create?u+'_'+now()+'_'+d(99999):s.rid;code=c;L=ld(rid);
  if(create){S={host:u,rid,ts:now(),floor:0,ph:'market',mon:[],log:[],run:{mon:0,boss:0,gold:0,best:'',bi:-1},bl:{},p:{[u]:newP(cls)}};enter();await commit()}
  else if(!s.p[u])await B().update(rf(),{['p/'+u]:newP(cls)});
  watch()}catch(e){code=null;lerr=typeof e==='string'?e:'Erro: '+(e.code||e.message);render()}}
function watch(){off=B().onValue(rf(),sn=>{S=sn.val();if(!S){leaveRoom('A sala foi fechada.');return}
  S.mon=S.mon||[];S.log=S.log||[];S.bl=S.bl||{};S.run=S.run||{mon:0,boss:0,gold:0,best:''};S.p=S.p||{};
  const l=S.loot;if(l&&l.win&&l.win.u===B().uid&&L.got!==l.id){L.got=l.id;L.inv.length<20?L.inv.push(l.it):0;sv()}
  if(l&&S.ph==='loot'&&ids()[0]===B().uid)resolveLoot();render()});
 armPresence();hbT=setInterval(tick,15000);tick()}
function tick(){if(!S||!code)return;upd({['p/'+B().uid+'/hb']:now()});
 if(now()-S.ts>IDLE)return closeRoom();
 if(S.ph==='combat'){const t=S.p[S.turn];if((!t||now()-t.hb>STALE||t.hp<=0)&&alive()[0]===B().uid){adv();commit()}}}
async function closeRoom(){const c=code;try{await B().remove(rf())}catch(e){}clearLocal(c);leaveRoom('A sala foi fechada por inatividade.')}
/* presença: ao cair a conexão/fechar a aba o servidor zera o batimento do jogador (ele vira "ausente" na hora) */
function armPresence(){conOff=B().onValue(B().ref(B().db,'.info/connected'),sn=>{if(sn.val()!==true||!code)return;
 B().onDisconnect(B().ref(B().db,`mh/${code}/p/${B().uid}/hb`)).set(0).catch(()=>{});upd({['p/'+B().uid+'/hb']:now()}).catch(()=>{})})}
/* limpeza: apaga do Firebase toda sala sem ninguém ativo (ou parada há mais de 10 min) e os itens locais dela */
async function janitor(){try{const all=(await B().get(B().ref(B().db,'mh'))).val()||{};
 for(const [c,s] of Object.entries(all)){if(c===code||!s)continue;
  const act=Object.values(s.p||{}).some(q=>q&&now()-q.hb<STALE*2);
  if(!act||now()-s.ts>IDLE){await B().remove(B().ref(B().db,'mh/'+c));clearLocal(c)}}}catch(e){}}
async function leaveRoom(msg){const c=code,u=B().uid,gone=typeof msg==='string';if(off)off();off=null;if(conOff)conOff();conOff=null;clearInterval(hbT);
 if(c&&!gone&&S){try{await B().onDisconnect(B().ref(B().db,`mh/${c}/p/${u}/hb`)).cancel();await B().remove(B().ref(B().db,`mh/${c}/p/${u}`));
  const p=(await B().get(B().ref(B().db,`mh/${c}/p`))).val()||{};
  if(!Object.values(p).some(q=>q&&now()-q.hb<STALE*2)){await B().remove(B().ref(B().db,'mh/'+c));clearLocal(c)}}catch(e){}}
 if(gone&&c)clearLocal(c);
 code=null;S=null;lerr=gone?msg:'';render()}

/* ---- ações de UI ---- */
const A={
 create:()=>enterRoom($('mhn').value,document.querySelector('input[name=mhc]:checked').value,true),
 join:()=>enterRoom($('mhn').value,document.querySelector('input[name=mhc]:checked').value,false),
 leave:()=>leaveRoom(),atk:()=>act('atk'),sk:()=>act('sk'),df:()=>act('df'),tg:v=>{sel=+v;render()},tab:v=>{tab=v;render()},pot:usePot,
 vote:v=>upd({['loot/v/'+B().uid]:v}),
 bless:k=>{if(S.ph!=='bless'||!BL[k])return;const n=bn(k),f=(1+.15*(n+1))/(1+.15*n);S.bl[k]=n+1;
  if(k==='vida')Object.values(S.p).forEach(p=>{const m=Math.round(p.mhp*f);p.hp+=m-p.mhp;p.mhp=m});
  log(`Bênção escolhida: ${BL[k][0]} (nível ${n+1}).`);S.ph='market';commit()},
skipb:()=>{if(S.ph!=='bless')return;log('O grupo seguiu sem escolher bênção.');S.ph='market';commit()},
 buy:k=>{const p=me(),o=POT[k];if(p.gold<o[2]){note='Ouro insuficiente.';return render()}note='';L.pot[k]++;sv();upd({['p/'+B().uid+'/gold']:p.gold-o[2]})},
 next:()=>{if(S.ph==='market'){enter();commit()}},
 eq:id=>{const i=L.inv.find(x=>x.id===id);if(!i)return;L.inv=L.inv.filter(x=>x!==i);let old;
  if(i.t==='acc'){if(L.eq.acc.length>=3)old=L.eq.acc.shift();L.eq.acc.push(i)}else{old=L.eq[i.t];L.eq[i.t]=i}if(old)L.inv.push(old);sv();gearSync()},
 un:v=>{const[t,x]=v.split(':');let i;if(t==='acc')i=L.eq.acc.splice(+x,1)[0];else{i=L.eq[t];L.eq[t]=null}if(i){if(L.inv.length>=20){L.eq[t==='acc'?'acc':t]=t==='acc'?[...L.eq.acc,i]:i;note='Inventário cheio.';return render()}L.inv.push(i);sv();gearSync()}},
 sell:id=>{const i=L.inv.find(x=>x.id===id);if(!i)return;L.inv=L.inv.filter(x=>x!==i);sv();upd({['p/'+B().uid+'/gold']:me().gold+Math.round(6*(i.r+1)*(1+S.floor*.5))})},
 drop:id=>{L.inv=L.inv.filter(x=>x.id!==id);sv();render()},
 pt:k=>{const p=me();if(p.pts<1)return;const u='p/'+B().uid+'/',o={[u+'pts']:p.pts-1,[u+'at/'+k]:p.at[k]+1};if(k==='vit'){const v=Math.round(10*hm());o[u+'mhp']=p.mhp+v;o[u+'hp']=p.hp+v}upd(o)}};

/* ---- render ---- */
const bar=(v,m,c)=>`<div class="mhb"><i style="width:${Math.max(0,Math.min(100,v/m*100))}%;background:${c}"></i><span>${v}/${m}</span></div>`;
function render(){const el=$('mh');if(!el)return;
 if(!code||!S){el.innerHTML=`<h1>⚔️ Monster Hunter</h1><p>Dungeon infinita cooperativa para até 4 jogadores.</p><div class="card" style="max-width:520px"><div class="mhcl">${Object.entries(CL).map(([k,c],i)=>`<label><input type="radio" name="mhc" value="${k}" ${i?'':'checked'}><span>${c[1]} ${c[0]}</span></label>`).join('')}</div><label for="mhn">Nome da sala</label><input type="text" id="mhn" maxlength="24" placeholder="catacumbas"><div class="row"><button data-a="create">Criar sala</button><button class="ghost" data-a="join">Entrar</button></div><p class="err">${esc(lerr)}</p></div>`;return}
 const u=B().uid,p=me();if(!p)return;const myT=S.ph==='combat'&&S.turn===u&&p.hp>0,sc=S.rt==='boss'?'chefe':S.rt;
 let h=`<div class="bar"><div><h1>Andar ${S.floor} <small>· sala ${esc(code)}</small></h1></div><button class="ghost" data-a="leave">Sair da sala</button></div>
 <div class="mhp">${ids().map(x=>{const q=S.p[x];return`<div class="card ${S.turn===x&&S.ph==='combat'?'mhturn':''} ${q.hp<=0?'mhdead':''}"><b>${CL[q.cls][1]} ${esc(q.name)}</b> <small>Nv ${q.lv} · 💰${q.gold}${q.df?' · 🛡️':''}</small>${bar(q.hp,q.mhp,'#e5484d')}${bar(q.mp,q.mmp,'#4f86f7')}${bar(q.xp,need(q.lv),'#e0a91c')}</div>`}).join('')}</div>`;
 const bs=Object.entries(BL).filter(([k])=>bn(k)).map(([k,b])=>`${b[0]} ×${bn(k)}`);if(bs.length)h+=`<p class="sel" style="margin:10px 0 0">✨ ${bs.join(' · ')}</p>`;
 if(S.ph==='combat')h+=`<div class="card"><h2>Monstros</h2><div class="mhm">${S.mon.map((m,i)=>`<button class="ghost ${m.hp<=0?'mhdead':''} ${sel===i?'on':''}" data-a="tg" data-v="${i}"><b>${esc(m.n)}</b>${bar(m.hp,m.mhp,'#e5484d')}<small>DEF ${m.df} · ATQ ${m.atk}</small></button>`).join('')}</div>
  <div class="row">${myT?`<button data-a="atk">⚔️ Atacar</button><button data-a="df">🛡️ Defender</button><button data-a="sk">${CL[p.cls][5]} (${CL[p.cls][4]} MP)</button>`:`<span class="sel">${p.hp<=0?'Você caiu. Aguarde o próximo andar.':'Turno de '+esc((S.p[S.turn]||{}).name||'...')}</span>`}</div>
  <div class="row"><small class="sel">Item (ação secundária):</small>${Object.keys(POT).map(k=>`<button class="ghost" data-a="pot" data-v="${k}" ${L.pot[k]?'':'disabled'}>${POT[k][0]} ×${L.pot[k]}</button>`).join('')}</div></div>`;
 if(S.ph==='loot'&&S.loot){const v=S.loot.v||{};h+=`<div class="card"><h2>💎 Loot</h2>${iCard(S.loot.it)}<div class="row">${v[u]?`<span class="sel">Você escolheu: ${v[u]==='want'?'Quero':'Passar'}. Aguardando os outros…</span>`:`<button data-a="vote" data-v="want">Quero</button><button class="ghost" data-a="vote" data-v="pass">Passar</button>`}</div></div>`}
 if(S.ph==='bless')h+=`<div class="card"><h2>🏆 Chefe derrotado — escolha uma bênção (pode repetir; os níveis se acumulam)</h2><div class="row">${Object.entries(BL).map(([k,b])=>`<button data-a="bless" data-v="${k}">${b[0]}${bn(k)?' · nv '+bn(k):''}<br><small>${b[1]}</small></button>`).join('')}<button class="ghost" data-a="skipb">Pular</button></div></div>`;
 if(S.ph==='market')h+=`<div class="card"><h2>🏕️ Área segura — mercado</h2><div class="row">${Object.entries(POT).map(([k,o])=>`<button class="ghost" data-a="buy" data-v="${k}">${o[0]} · 💰${o[2]}</button>`).join('')}</div><div class="row"><button data-a="next">Descer ao andar ${S.floor+1} ▶</button></div></div>`;
 if(S.ph==='over'){const t=Object.values(S.p).reduce((a,q)=>{for(const k in q.stat)a[k]=(a[k]||0)+q.stat[k];return a},{});
  h+=`<div class="card"><h2>☠️ Fim da run — Andar ${S.floor}</h2><p>Dano causado: ${t.dmg} · Dano recebido: ${t.rec} · Cura: ${t.heal} · Críticos: ${t.crit}<br>Monstros: ${S.run.mon} · Chefes: ${S.run.boss} · Ouro obtido: ${S.run.gold}<br>Melhor item: ${esc(S.run.best||'—')}</p><button data-a="leave">Voltar</button></div>`}
 if(note)h+=`<p class="err">${esc(note)}</p>`;
 h+=`<div class="card"><div class="tabs"><button class="${tab==='inv'?'on':''}" data-a="tab" data-v="inv">Inventário ${L.inv.length}/20</button><button class="${tab==='at'?'on':''}" data-a="tab" data-v="at">Atributos${p.pts?' ('+p.pts+' pts)':''}</button></div>`;
 if(tab==='inv'){const E=[['arma',L.eq.arma],['escudo',L.eq.escudo],...[0,1,2].map(i=>['acc:'+i,L.eq.acc[i]])];
  h+=`<h2>Equipado</h2><div class="mhg">${E.map(([s,i])=>i?iCard(i,`<button class="ghost" data-a="un" data-v="${s==='arma'||s==='escudo'?s+':0':s}">Remover</button>`):`<div class="mhi mhe">${s.startsWith('acc')?'Acessório':s}</div>`).join('')}</div><h2 style="margin-top:14px">Mochila</h2><div class="mhg">${L.inv.map(i=>iCard(i,`<button data-a="eq" data-v="${i.id}">Equipar</button><button class="ghost" data-a="sell" data-v="${i.id}">Vender</button><button class="link" data-a="drop" data-v="${i.id}">Descartar</button>`)).join('')||'<span class="sel">Vazia.</span>'}</div>`}
 else h+=`<div class="mhg">${Object.entries(AT).map(([k,n])=>`<div class="mhi"><b>${n}: ${p.at[k]}</b><small>${ATD[k]}</small><div><button ${p.pts?'':'disabled'} data-a="pt" data-v="${k}">+1</button></div></div>`).join('')}</div>`;
 h+=`</div><div class="card"><h2>Registro</h2>${S.log.slice().reverse().map(l=>`<div class="sel">${esc(l)}</div>`).join('')}</div>`;
 el.innerHTML=h}

const st=document.createElement('style');st.textContent=`.modes{display:flex;gap:6px}.modes button{background:none;color:var(--mut);padding:8px 12px}.modes button.on{background:var(--bg);color:var(--ink)}
.pickg{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:640px){.pickg{grid-template-columns:1fr}}.pickg button{padding:28px 16px;font-size:1.15rem;background:var(--card);color:var(--ink);border:1px solid var(--line)}.pickg button:hover{border-color:var(--acc)}
#mh{max-width:900px;margin:0 auto}.mhcl{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mhcl label{margin:0;color:var(--ink)}.mhcl span{display:block;border:1px solid var(--line);border-radius:10px;padding:10px;cursor:pointer}.mhcl input{position:absolute;opacity:0}.mhcl input:checked+span{border-color:var(--acc);background:var(--bg)}
.mhp{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.mhp .card{padding:12px;margin:0}.mhturn{border-color:var(--acc)!important}.mhdead{opacity:.45}
.mhb{position:relative;height:14px;background:var(--bg);border-radius:7px;margin-top:5px;overflow:hidden}.mhb i{display:block;height:100%}.mhb span{position:absolute;inset:0;text-align:center;font-size:.7rem;line-height:14px;color:#fff;text-shadow:0 0 2px #000}
.mhm{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.mhm button.on{border-color:var(--acc)}.mhg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.mhi{position:relative;border:2px solid var(--c,var(--line));border-radius:10px;padding:10px;background:var(--bg);overflow:hidden}.mhi b{color:var(--c,var(--ink));display:block}.mhi small{display:block;color:var(--mut);margin:2px 0 6px}.mhi button{padding:5px 9px;font-size:.8rem;margin-right:4px}.mhe{color:var(--mut);display:flex;align-items:center;justify-content:center;min-height:60px;border-style:dashed}
.mhi.r5,.mhi.r6{animation:mhg 1.4s ease-in-out infinite alternate;background:linear-gradient(135deg,var(--bg),color-mix(in srgb,var(--c) 18%,var(--bg)))}.mhi.r6{animation-duration:.9s}
.mhi.r5::after,.mhi.r6::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,var(--c) 1.5px,transparent 2px) 0 0/22px 22px,radial-gradient(circle,#fff 1px,transparent 1.5px) 9px 13px/31px 31px;opacity:.35;animation:mhp 3s linear infinite}
@keyframes mhg{from{box-shadow:0 0 4px var(--c)}to{box-shadow:0 0 18px var(--c),inset 0 0 10px color-mix(in srgb,var(--c) 40%,transparent)}}@keyframes mhp{to{background-position:0 -22px,9px -18px}}`;document.head.appendChild(st);

window.MH={open(){sweep();janitor();clearInterval(jT);jT=setInterval(janitor,60000);const el=$('mh');if(el&&!el._b){el._b=1;el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a])A[b.dataset.a](b.dataset.v)})}render()},close(){clearInterval(jT);jT=null;if(code)leaveRoom()}};
})();
