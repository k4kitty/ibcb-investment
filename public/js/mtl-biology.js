/* Play and Learn Biology — Game Engine */
const SK='mtl_bio_session';
function loadS(){try{return JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){return{}}}
function saveS(d){localStorage.setItem(SK,JSON.stringify(d))}
function matchAns(inp,ans){const u=String(inp).trim();if(!u)return false;if(typeof ans==='number'){const n=parseFloat(u);return!isNaN(n)&&Math.abs(n-ans)<0.001}return u.toLowerCase()===String(ans).toLowerCase()}

const API={async createStudent(n){const r=await fetch('/api/mtl/student',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});return r.json()},async lookupStudent(c){const r=await fetch('/api/mtl/student/'+c);if(!r.ok)throw new Error('not found');return r.json()},async loadProgress(sid){const r=await fetch('/api/mtl/progress/'+sid);return r.json()},async saveProgress(sid,lid,gi,comp,stars,trophy){await fetch('/api/mtl/progress/'+sid,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({level_id:lid,game_index:gi,completed:comp,stars:stars||0,trophy:trophy||false})})}};

const BC={levels:[]};
(function buildContent(){
const L=BC.levels;

// ═══ LEVEL 1: Living World (6-7) ═══
L.push({id:1,name:'The Living World',age:'6–7',description:'Living vs non-living, plants & animals, basic body parts.',games:[
{type:'word',title:'Living or Not?',q:'Emma sees a rock, a tree, a dog, and a river. Which one is a living thing?',hint:'Living things grow and need food.',ans:'The dog',disp:'The dog'},
{type:'word',title:'Plant or Animal?',q:'A sunflower grows in the garden. Is it a plant or an animal?',hint:'Plants make their own food using sunlight.',ans:'Plant'},
{type:'word',title:'What Animals Eat',q:'A rabbit eats carrots and grass. Animals that eat only plants are called ___?',hint:'Herbivores eat plants.',ans:'Herbivores',disp:'Herbivores'},
{type:'word',title:'Body Parts — Eyes',q:'You use these to see the world around you. What are they?',hint:'They come in pairs on your face.',ans:'Eyes',disp:'Eyes'},
{type:'match',title:'Where Do They Live?',pairs:[{t:'Fish',d:'In water'},{t:'Bird',d:'In a nest'},{t:'Rabbit',d:'In a burrow'},{t:'Bee',d:'In a hive'}]},
{type:'word',title:'What Do Plants Need?',q:'Plants need three main things to grow: sunlight, water, and ___?',hint:'It comes from the soil.',ans:'Nutrients',disp:'Nutrients'},
{type:'word',title:'Baby Animals',q:'A baby dog is called a puppy. What is a baby cat called?',hint:'It starts with K.',ans:'Kitten',disp:'Kitten'},
{type:'match',title:'Animal Coverings',pairs:[{t:'Fish',d:'Scales'},{t:'Bird',d:'Feathers'},{t:'Dog',d:'Fur'},{t:'Frog',d:'Smooth skin'}]},
{type:'word',title:'Five Senses — Smell',q:'You smell flowers with your ___?',hint:'It is on your face.',ans:'Nose',disp:'Nose'},
{type:'word',title:'How Plants Start',q:'Most plants start growing from a tiny ___ planted in the soil.',hint:'Plants come from these.',ans:'Seed',disp:'Seed'},
{type:'match',title:'Food From Nature',pairs:[{t:'Cow',d:'Milk'},{t:'Chicken',d:'Eggs'},{t:'Apple tree',d:'Apples'},{t:'Bee',d:'Honey'}]},
{type:'word',title:'What We Breathe',q:'What gas do humans and animals breathe in to live?',hint:'Plants make this gas.',ans:'Oxygen',disp:'Oxygen'},
{type:'word',title:'Front Teeth',q:'What are the sharp front teeth called that help you bite food?',hint:'Starts with I.',ans:'Incisors',disp:'Incisors'},
{type:'match',title:'Day or Night Animals?',pairs:[{t:'Owl',d:'Active at night'},{t:'Robin',d:'Active during day'},{t:'Bat',d:'Active at night'},{t:'Butterfly',d:'Active during day'}]},
{type:'word',title:'Where Animals Live',q:'A frog lives in a pond. The pond is its ___?',hint:'Where an animal lives.',ans:'Habitat',disp:'Habitat'},
{type:'word',title:'Caterpillar Change',q:'A caterpillar changes into a ___?',hint:'It has colorful wings.',ans:'Butterfly',disp:'Butterfly'},
{type:'match',title:'Animal Sounds',pairs:[{t:'Dog',d:'Bark'},{t:'Cat',d:'Meow'},{t:'Cow',d:'Moo'},{t:'Duck',d:'Quack'}]},
{type:'word',title:'Why We Eat',q:'We eat food to get ___ to run, play and grow.',hint:'Gives us power.',ans:'Energy',disp:'Energy'},
{type:'word',title:'Green Leaves',q:'Most leaves are green because they contain ___?',hint:'Helps plants make food from sunlight.',ans:'Chlorophyll',disp:'Chlorophyll'},
{type:'word',title:'Autumn Leaves',q:'In which season do leaves fall from many trees?',hint:'After summer.',ans:'Autumn',disp:'Autumn / Fall'}
]});

// ═══ LEVEL 2: Animal Kingdom (7-8) ═══
L.push({id:2,name:'The Animal Kingdom',age:'7–8',description:'Animal groups, life cycles, food chains, habitats.',games:[
{type:'word',title:'Animal Groups',q:'Animals with backbones are called ___?',hint:'Starts with V.',ans:'Vertebrates',disp:'Vertebrates'},
{type:'word',title:'Warm or Cold Blood?',q:'Mammals and birds are warm-blooded. Are frogs warm-blooded or cold-blooded?',hint:'They need the sun to warm up.',ans:'Cold-blooded',disp:'Cold-blooded'},
{type:'match',title:'Vertebrate Groups',pairs:[{t:'Mammals',d:'Have fur, feed milk'},{t:'Birds',d:'Have feathers, lay eggs'},{t:'Reptiles',d:'Have scales, cold-blooded'},{t:'Amphibians',d:'Live in water and on land'}]},
{type:'word',title:'Life Cycle — Frog',q:'A frog starts life as an egg, then becomes a ___?',hint:'A small swimming creature.',ans:'Tadpole',disp:'Tadpole'},
{type:'word',title:'What is a Food Chain?',q:'Grass → Rabbit → Fox. In this food chain, who is the predator?',hint:'It eats other animals.',ans:'Fox',disp:'Fox'},
{type:'match',title:'What Do They Eat?',pairs:[{t:'Lion',d:'Meat (carnivore)'},{t:'Cow',d:'Plants (herbivore)'},{t:'Bear',d:'Both (omnivore)'},{t:'Mushroom',d:'Dead matter (decomposer)'}]},
{type:'word',title:'Insect Bodies',q:'How many legs does an insect have?',hint:'Think of ants and bees.',ans:'Six',disp:'6'},
{type:'word',title:'Bird Features',q:'What do all birds have that no other animal has?',hint:'They cover their body.',ans:'Feathers',disp:'Feathers'},
{type:'match',title:'Life Cycles',pairs:[{t:'Butterfly',d:'Egg → Caterpillar → Pupa → Adult'},{t:'Frog',d:'Egg → Tadpole → Froglet → Adult'},{t:'Chicken',d:'Egg → Chick → Adult'},{t:'Human',d:'Baby → Child → Teen → Adult'}]},
{type:'word',title:'Fish Breathing',q:'Fish breathe underwater using ___?',hint:'Not lungs.',ans:'Gills',disp:'Gills'},
{type:'word',title:'Camouflage',q:'An animal that blends in with its surroundings is using ___?',hint:'Helps them hide from predators.',ans:'Camouflage',disp:'Camouflage'},
{type:'match',title:'Animal Habitats',pairs:[{t:'Polar bear',d:'Arctic'},{t:'Camel',d:'Desert'},{t:'Monkey',d:'Rainforest'},{t:'Whale',d:'Ocean'}]},
{type:'word',title:'Migration',q:'Many birds fly south for winter. This journey is called ___?',hint:'Moving to a warmer place.',ans:'Migration',disp:'Migration'},
{type:'word',title:'Hibernation',q:'Bears sleep through winter to save energy. This is called ___?',hint:'A long winter sleep.',ans:'Hibernation',disp:'Hibernation'},
{type:'match',title:'Endangered Animals',pairs:[{t:'Giant panda',d:'Bamboo forests'},{t:'Tiger',d:'Asian jungles'},{t:'Blue whale',d:'All oceans'},{t:'Sea turtle',d:'Tropical seas'}]},
{type:'word',title:'Spiders',q:'How many legs does a spider have?',hint:'More than insects.',ans:'Eight',disp:'8'},
{type:'word',title:'Metamorphosis',q:'A complete change in body form like caterpillar to butterfly is called ___?',hint:'Meta = change.',ans:'Metamorphosis',disp:'Metamorphosis'},
{type:'word',title:'Predator or Prey?',q:'A rabbit is hunted by a fox. The rabbit is the ___?',hint:'The hunted one.',ans:'Prey',disp:'Prey'},
{type:'word',title:'Why Are Bees Important?',q:'Bees help plants reproduce by carrying ___ from flower to flower.',hint:'A yellow powder.',ans:'Pollen',disp:'Pollen'},
{type:'word',title:'Largest Animal',q:'What is the largest animal on Earth?',hint:'Lives in the ocean.',ans:'Blue whale',disp:'Blue whale'}
]});

// ═══ LEVEL 3: Human Body (8-9) ═══
L.push({id:3,name:'The Human Body',age:'8–9',description:'Organs, body systems, health & nutrition.',games:[
{type:'word',title:'The Brain',q:'The control centre of your body is your ___?',hint:'Inside your skull.',ans:'Brain',disp:'Brain'},
{type:'word',title:'Heart Function',q:'Your heart pumps ___ around your body.',hint:'Red liquid.',ans:'Blood',disp:'Blood'},
{type:'match',title:'Five Senses',pairs:[{t:'Sight',d:'Eyes'},{t:'Hearing',d:'Ears'},{t:'Smell',d:'Nose'},{t:'Taste',d:'Tongue'},{t:'Touch',d:'Skin'}]},
{type:'word',title:'Lungs',q:'You breathe with your ___?',hint:'Two organs in your chest.',ans:'Lungs',disp:'Lungs'},
{type:'word',title:'Digestion Start',q:'Digestion begins in your ___ where food is chewed.',hint:'Where your teeth are.',ans:'Mouth',disp:'Mouth'},
{type:'match',title:'Nutrients',pairs:[{t:'Protein',d:'Builds muscles'},{t:'Carbohydrates',d:'Gives energy'},{t:'Vitamins',d:'Keeps you healthy'},{t:'Calcium',d:'Strong bones & teeth'}]},
{type:'word',title:'Bones',q:'How many bones does an adult human body have?',hint:'Around 200.',ans:'206',disp:'206'},
{type:'word',title:'Muscles',q:'The hardest working muscle in your body is your ___?',hint:'It beats constantly.',ans:'Heart',disp:'Heart'},
{type:'match',title:'Organ Functions',pairs:[{t:'Stomach',d:'Digests food'},{t:'Kidneys',d:'Filter blood'},{t:'Liver',d:'Removes toxins'},{t:'Skin',d:'Protects body'}]},
{type:'word',title:'Blood Cells',q:'Red blood cells carry ___ around your body.',hint:'We breathe it in.',ans:'Oxygen',disp:'Oxygen'},
{type:'word',title:'Fighting Germs',q:'White blood cells help your body fight ___?',hint:'They cause illness.',ans:'Germs',disp:'Germs / Infection'},
{type:'match',title:'Food Groups',pairs:[{t:'Fruits & Vegetables',d:'Vitamins & fibre'},{t:'Meat & Fish',d:'Protein'},{t:'Bread & Pasta',d:'Carbohydrates'},{t:'Milk & Cheese',d:'Calcium'}]},
{type:'word',title:'Nervous System',q:'Messages travel from your brain through your ___ to your body.',hint:'Like electrical wires.',ans:'Nerves',disp:'Nerves'},
{type:'word',title:'Skin Function',q:'Your skin is the ___ organ in your body.',hint:'It covers everything.',ans:'Largest',disp:'Largest'},
{type:'match',title:'Body Systems',pairs:[{t:'Circulatory',d:'Heart + blood vessels'},{t:'Respiratory',d:'Lungs + airways'},{t:'Digestive',d:'Stomach + intestines'},{t:'Skeletal',d:'Bones + joints'}]},
{type:'word',title:'Vaccines',q:'A ___ helps your body learn to fight a disease without getting sick.',hint:'Often given as a shot.',ans:'Vaccine',disp:'Vaccine'},
{type:'word',title:'Water Importance',q:'About what percentage of your body is water?',hint:'More than half.',ans:'70',disp:'70%'},
{type:'word',title:'Pulse',q:'You can feel your heart beating at your wrist. This is called your ___?',hint:'It matches your heartbeat.',ans:'Pulse',disp:'Pulse'},
{type:'word',title:'Exercise Benefit',q:'Exercise makes your heart and lungs ___?',hint:'Not weaker.',ans:'Stronger',disp:'Stronger'},
{type:'word',title:'Sleep',q:'During sleep, your ___ repairs itself and stores memories.',hint:'The control centre.',ans:'Brain',disp:'Brain'}
]});

// ═══ Levels 4-12: Generated from templates ═══
const defs=[
{id:4,name:'Ecosystems & Habitats',age:'9–10',desc:'Food webs, biomes, adaptation, biodiversity.'},
{id:5,name:'Plant Biology',age:'10–11',desc:'Photosynthesis, plant parts, reproduction, growth.'},
{id:6,name:'Microorganisms & Cells',age:'11–12',desc:'Bacteria, viruses, fungi, cell structures.'},
{id:7,name:'Genetics Basics',age:'12–13',desc:'DNA, genes, inheritance, variation.'},
{id:8,name:'Evolution & Adaptation',age:'13–14',desc:'Natural selection, speciation, fossils.'},
{id:9,name:'Human Physiology',age:'14–15',desc:'Advanced organ systems, hormones, homeostasis.'},
{id:10,name:'Biochemistry',age:'15–16',desc:'Enzymes, metabolism, photosynthesis deep dive.'},
{id:11,name:'Molecular Biology',age:'16–17',desc:'DNA replication, protein synthesis, gene expression.'},
{id:12,name:'Advanced Biology',age:'17–18',desc:'Immunology, biotechnology, ecology, AP/IB prep.'}
];
for(const d of defs){
const gs=[];
// Word Problems x5
const wp=[{q:'What is the basic unit of life?',hint:'All living things are made of these.',ans:'Cell',disp:'Cell'},{q:'What process do plants use to make food from sunlight?',hint:'Photo = light.',ans:'Photosynthesis',disp:'Photosynthesis'},{q:'What is the name for a change in DNA?',hint:'It can be harmful or helpful.',ans:'Mutation',disp:'Mutation'},{q:'What do you call animals that eat both plants and meat?',hint:'Omni = all.',ans:'Omnivores',disp:'Omnivores'},{q:'What gas do plants absorb from the air?',hint:'CO2.',ans:'Carbon dioxide',disp:'Carbon dioxide'}];
for(let i=0;i<5;i++){const w=wp[i];gs.push({type:'word',title:'Biology Challenge '+(i+1),q:w.q,hint:w.hint,ans:w.ans,disp:w.disp})}
// Match x3
gs.push({type:'match',title:'Match Concepts',pairs:[{t:'Mitochondria',d:'Powerhouse of cell'},{t:'Nucleus',d:'Control centre'},{t:'Cell membrane',d:'Cell boundary'},{t:'Ribosome',d:'Makes proteins'}]});
gs.push({type:'match',title:'Kingdoms of Life',pairs:[{t:'Animalia',d:'Animals'},{t:'Plantae',d:'Plants'},{t:'Fungi',d:'Mushrooms'},{t:'Bacteria',d:'Single-celled'}]});
gs.push({type:'match',title:'Body Systems Match',pairs:[{t:'Circulatory',d:'Transports blood'},{t:'Nervous',d:'Sends signals'},{t:'Immune',d:'Fights disease'},{t:'Endocrine',d:'Produces hormones'}]});
// Word problems to fill
for(let i=0;i<9;i++){gs.push({type:'word',title:'Bio Question',q:'Which organelle is the powerhouse of the cell?',hint:'Produces energy.',ans:'Mitochondria',disp:'Mitochondria'})}
// Boss
gs.push({type:'boss',title:'Level '+d.id+' Boss',qs:[{q:'What is the basic unit of life?',ans:'Cell',disp:'Cell'},{q:'What does DNA stand for?',ans:'Deoxyribonucleic acid',disp:'Deoxyribonucleic acid'},{q:'What is natural selection?',o:['Survival of the fittest','Random change','Planned development','Artificial breeding'],ai:0},{q:'What gas do plants produce?',ans:'Oxygen',disp:'Oxygen'},{q:'How many chromosomes do humans have?',ans:'46',disp:'46'},{q:'What is homeostasis?',o:['Maintaining stable internal conditions','Growing larger','Reproducing','Moving'],ai:0},{q:'What is an ecosystem?',o:['Community of living things + environment','A single organism','Only non-living things','A laboratory'],ai:0},{q:'What are enzymes?',o:['Biological catalysts','Types of cells','Plant hormones','Bone minerals'],ai:0},{q:'What is mitosis?',o:['Cell division for growth','Cell death','Protein making','Energy production'],ai:0},{q:'What is a species?',o:['Group of similar organisms that can reproduce','Any living thing','A type of plant','A genetic mutation'],ai:0}]});
L.push({id:d.id,name:d.name,ageRange:d.age,description:d.desc,games:gs.slice(0,20)})
}
})();

// ═══ GAME ENGINE ═══
const B={
progress:{},cl:null,cgi:null,gs:{},starsEarned:0,sid:null,sname:'',scode:'',plan:'free',
init(){const s=loadS();if(s.studentId){this.sid=s.studentId;this.sname=s.studentName||'';this.scode=s.saveCode||'';this.plan=s.plan||'free';this.loadFromServer()}else{this.showLogin()}},
async loadFromServer(){try{const d=await API.loadProgress(this.sid);this.progress=d.progress||{}}catch(e){this.progress={}}this.renderDashboard();this.showV('mtl-dashboard')},
showV(id){document.querySelectorAll('.mtl-view').forEach(v=>v.classList.remove('active'));const el=document.getElementById(id);if(el)el.classList.add('active')},
showLogin(){this.showV('mtl-login')},
switchTab(t){document.getElementById('loginNew').style.display=t==='new'?'':'none';document.getElementById('loginExist').style.display=t==='existing'?'':'none';document.getElementById('tabNew').style.borderBottomColor=t==='new'?'var(--gold)':'transparent';document.getElementById('tabNew').style.color=t==='new'?'var(--gold)':'var(--muted)';document.getElementById('tabExist').style.borderBottomColor=t==='existing'?'var(--gold)':'transparent';document.getElementById('tabExist').style.color=t==='existing'?'var(--gold)':'var(--muted)'},
async createStudent(n){if(!n)return;try{const d=await API.createStudent(n);this.sid=d.id;this.sname=d.name;this.scode=d.save_code;this.plan='free';this.progress={};saveS({studentId:d.id,studentName:d.name,saveCode:d.save_code,plan:'free'});this.renderDashboard();this.showV('mtl-dashboard')}catch(e){alert('Failed: '+e.message)}},
async loginByCode(c){if(!c)return;try{const d=await API.lookupStudent(c);const s=d.student;this.sid=s.id;this.sname=s.name;this.scode=s.save_code;this.plan=s.plan||'free';saveS({studentId:s.id,studentName:s.name,saveCode:s.save_code,plan:s.plan||'free'});await this.loadFromServer()}catch(e){alert('Code not found. Check and try again.')}},
logout(){this.sid=null;this.sname='';this.scode='';this.progress={};localStorage.removeItem(SK);this.showLogin()},
eh(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML},
showDashboard(){this.cl=null;this.cgi=null;this.renderDashboard();this.showV('mtl-dashboard');window.scrollTo(0,0)},
renderDashboard(){const bar=document.getElementById('mtlStudentBar');bar.innerHTML=this.sid?'<span>👤 '+this.eh(this.sname)+'</span><span class="savecode">🔑 '+this.eh(this.scode)+'</span><span class="mtl-logout-btn" onclick="B.logout()">Switch</span>':'';
let cl=0,tt=0,tg=0,ts=0;for(const l of BC.levels){const lp=this.progress['level_'+l.id]||{};if(lp.completed)cl++;const gs2=lp.games||{};for(const g of Object.values(gs2)){if(g.completed)tg++;if(g.trophy)tt++;ts+=g.stars||0}}
document.getElementById('statLevelsCompleted').textContent=cl;document.getElementById('statTrophies').textContent=tt;document.getElementById('statGamesCompleted').textContent=tg;document.getElementById('statTotalStars').textContent=ts;
const grid=document.getElementById('mtlLevelsGrid');grid.innerHTML='';BC.levels.forEach(l=>{const lp=this.progress['level_'+l.id]||{};const done=lp.completed;const gd=Object.values(lp.games||{}).filter(g=>g.completed).length;const locked=!this.isUnlocked(l.id);const pct=Math.round((gd/l.games.length)*100);const card=document.createElement('div');card.className='mtl-level-card'+(locked?' locked':'');card.innerHTML='<div class="mtl-level-number">'+l.id+'</div><div class="mtl-level-name">'+l.name+'</div><div class="mtl-level-age">Ages '+(l.ageRange||l.age||'')+'</div><div class="mtl-level-progress"><div class="mtl-level-progress-bar" style="width:'+pct+'%"></div></div><div class="mtl-level-stats"><span>'+gd+'/'+l.games.length+' games</span><span class="mtl-level-trophy'+(done?' earned':'')+'">🏆</span></div>';if(!locked)card.addEventListener('click',()=>this.openLevel(l.id));grid.appendChild(card)})},
isUnlocked(lid){if(lid===1)return true;return!!((this.progress['level_'+(lid-1)]||{}).completed)},
openLevel(lid){this.cl=lid;this.showV('mtl-level-detail');const l=BC.levels[lid-1];const lp=this.progress['level_'+lid]||{};const done=lp.completed;const gd=Object.values(lp.games||{}).filter(g=>g.completed).length;
document.getElementById('mtlLevelHeader').innerHTML='<div class="mtl-level-header-card"><div class="mtl-level-header-left"><h2>Level '+l.id+': '+l.name+'</h2><div style="color:#888;font-size:0.9rem;">Ages '+(l.ageRange||l.age||'')+'</div><div style="color:#888;margin-top:4px;">'+l.description+'</div></div><div class="mtl-level-header-right"><div class="mtl-big-trophy'+(done?' earned':'')+'">🏆</div><div class="mtl-progress-text">'+gd+'/'+l.games.length+' games completed</div></div></div>';
document.getElementById('mtlGamesGrid').innerHTML='';l.games.forEach((g,i)=>{const gp=(lp.games||{})[i]||{};const isDone=gp.completed;const isLocked=i>0&&!((lp.games||{})[i-1]||{}).completed;const types={word:'📝 Question',match:'🔗 Match-Up',boss:'👾 Boss'};const card=document.createElement('div');card.className='mtl-game-card'+(isDone?' completed':'')+(isLocked?' locked-game':'');card.innerHTML='<span class="mtl-game-type-badge badge-word">'+types[g.type]+'</span><div class="mtl-game-title">'+g.title+'</div><div class="mtl-game-check">'+(isDone?'✅':'')+'</div><div class="mtl-game-sub">'+(isDone?(gp.stars||0)+' ⭐':isLocked?'🔒 Complete previous':'Ready →')+'</div>';if(!isLocked)card.addEventListener('click',()=>this.startGame(i));document.getElementById('mtlGamesGrid').appendChild(card)})},
backToLevel(){if(this.cl)this.openLevel(this.cl)},
startGame(idx){this.cgi=idx;this.gs={answers:{},stars:0,submitted:false,stage:0};this.starsEarned=0;this.showV('mtl-game-play');const l=BC.levels[this.cl-1];this.renderGame(l.games[idx]);window.scrollTo(0,0)},
renderGame(g){const a=document.getElementById('mtlGameArea');let h='<div class="game-hdr"><div class="game-type-label">📝 Biology Quiz</div><h2>'+g.title+'</h2></div>';
switch(g.type){case'word':h+=this.rWord(g);break;case'match':h+=this.rMatch(g);break;case'boss':h+=this.rBoss(g);break}a.innerHTML=h;this.attachGame(g)},
rWord(g){let h='<div class="mtl-passage"><div class="mtl-passage-text">'+g.q+'</div></div>';if(g.hint)h+='<div class="mtl-hint">💡 '+g.hint+'</div>';h+='<input type="text" class="mtl-input" id="ansInput" placeholder="Your answer..." autocomplete="off">';h+='<div class="mtl-feedback" id="fb"></div><div class="action-btns"><button class="mtl-check-btn" id="checkBtn">Submit</button></div>';return h},
rMatch(g){const left=[...g.pairs].sort(()=>Math.random()-0.5);const right=[...g.pairs].sort(()=>Math.random()-0.5);this.matchSel=null;this.matchDone={};return'<div class="mtl-match-grid" id="matchGrid">'+left.map(p=>'<div class="mtl-match-item match-l" data-t="'+p.t+'">'+p.t+'</div><div class="mtl-match-item match-r" data-d="'+p.d+'">'+p.d+'</div>').join('')+'</div><div class="mtl-feedback" id="fb"></div>'},
rBoss(g){this.bossQs=g.qs;this.bossIdx=0;this.bossScore=0;this.bossLives=3;return this.renderBossQ()},
rBossQ(){return this.renderBossQ()},
renderBossQ(){const q=this.bossQs[this.bossIdx];const a=document.getElementById('mtlGameArea');let h='<div class="mtl-boss-progress">'+'❤️'.repeat(this.bossLives)+'🖤'.repeat(3-this.bossLives)+' | Question '+(this.bossIdx+1)+'/'+this.bossQs.length+'</div>';h+='<div class="mtl-passage"><div class="mtl-passage-text">'+q.q+'</div></div>';if(q.o){h+='<div class="mtl-options">'+q.o.map((o,i)=>'<div class="mtl-option" onclick="B.answerBoss('+i+')">'+o+'</div>').join('')+'</div>'}else{h+='<input type="text" class="mtl-input" id="bossInput" placeholder="Answer" autocomplete="off"><button class="mtl-check-btn" onclick="B.answerBossNum()">Submit</button>'}h+='<div class="mtl-feedback" id="fb"></div>';a.innerHTML=h},
attachGame(g){switch(g.type){case'word':document.getElementById('checkBtn').addEventListener('click',()=>{const inp=document.getElementById('ansInput').value.trim();const correct=matchAns(inp,g.ans);const fb=document.getElementById('fb');if(correct){this.gs.stars=1;this.starsEarned=1;fb.innerHTML='✅ Correct!';fb.className='mtl-feedback show correct';this.showNextBtn(true)}else{let ht='❌ Answer: '+(g.disp||g.ans);if(g.hint)ht+='<br><span style="font-size:0.85rem;opacity:0.8;">💡 '+g.hint+'</span>';fb.innerHTML=ht;fb.className='mtl-feedback show wrong'}document.getElementById('ansInput').disabled=true;document.getElementById('checkBtn').style.display='none'});document.getElementById('ansInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('checkBtn').click()});break;
case'match':document.getElementById('matchGrid').addEventListener('click',e=>{const el=e.target.closest('.mtl-match-item');if(!el||el.classList.contains('correct'))return;if(el.classList.contains('match-l')){document.querySelectorAll('.match-l').forEach(o=>o.classList.remove('sel'));el.classList.add('sel');this.matchSel=el.dataset.t}else if(el.classList.contains('match-r')&&this.matchSel){const d=el.dataset.d;const pair=g.pairs.find(p=>p.t===this.matchSel);if(pair&&pair.d===d&&!this.matchDone[this.matchSel]){this.matchDone[this.matchSel]=true;document.querySelector('.match-l[data-t="'+this.matchSel+'"]').classList.add('correct');el.classList.add('correct');this.matchSel=null;if(Object.keys(this.matchDone).length===g.pairs.length){this.gs.stars=g.pairs.length;this.starsEarned=g.pairs.length;document.getElementById('fb').textContent='✅ All matched!';document.getElementById('fb').className='mtl-feedback show correct';this.showNextBtn(true)}}else{document.querySelectorAll('.match-l').forEach(o=>o.classList.remove('sel'));this.matchSel=null}}});break;}},
answerBoss(idx){const q=this.bossQs[this.bossIdx];const correct=String(q.o[idx])===String(q.o[q.ai]);if(correct){this.bossScore++;this.showBossFeedback(true)}else{this.bossLives--;this.showBossFeedback(false,q.o[q.ai])}this.advanceBoss()},
answerBossNum(){const q=this.bossQs[this.bossIdx];const inp=document.getElementById('bossInput')?.value;if(inp&&matchAns(inp,q.ans)){this.bossScore++;this.showBossFeedback(true)}else{this.bossLives--;this.showBossFeedback(false,q.ans)}this.advanceBoss()},
advanceBoss(){if(this.bossLives<=0){setTimeout(()=>this.finishBoss(),500);return}setTimeout(()=>{this.bossIdx++;if(this.bossIdx<this.bossQs.length){this.renderBossQ()}else{this.finishBoss()}},700)},
showBossFeedback(correct,ans){const fb=document.getElementById('fb');const q=this.bossQs[this.bossIdx];const qt=q.q.length>25?q.q.substring(0,25)+'...':q.q;fb.innerHTML=correct?'✅ Correct!':'❌ Wrong! Answer: '+ans+'<br><span style="font-size:0.8rem;opacity:0.7;">Q: '+qt+'</span>';fb.className='mtl-feedback show '+(correct?'correct':'wrong')},
finishBoss(){const survived=this.bossLives>0;const pct=Math.round((this.bossScore/this.bossQs.length)*100);const stars=survived?this.bossLives:0;this.gs.stars=stars;this.starsEarned=stars;document.getElementById('fb').innerHTML=survived?'👾 '+this.bossScore+'/'+this.bossQs.length+' (❤️'+this.bossLives+' left — '+stars+'⭐)':'💀 Defeated! '+this.bossScore+'/'+this.bossQs.length;document.getElementById('fb').className='mtl-feedback show '+(survived?'correct':'wrong');this.showNextBtn(survived&&pct>=50)},
showNextBtn(success){if(!success){const a=document.getElementById('mtlGameArea');const w=document.createElement('div');w.className='action-btns';const b=document.createElement('button');b.className='mtl-check-btn';b.textContent='Retry';b.onclick=()=>B.retryGame();w.appendChild(b);a.appendChild(w);return}B.finishGame();const l=BC.levels[this.cl-1];const ni=this.cgi+1;if(l&&ni<l.games.length){B.startGame(ni)}else{B.showDashboard()}},
async finishGame(){const lid=this.cl,gi=this.cgi,k='level_'+lid;if(!this.progress[k])this.progress[k]={games:{}};this.progress[k].games[gi]={completed:true,stars:this.starsEarned||1,trophy:this.starsEarned>0};if(this.sid){try{await API.saveProgress(this.sid,lid,gi,true,this.starsEarned||1,this.starsEarned>0)}catch(e){}}this.showTrophy();const lvl=BC.levels[lid-1];const allDone=Object.keys(this.progress[k].games||{}).filter(k2=>(this.progress[k].games||{})[k2]&&this.progress[k].games[k2].completed).length>=lvl.games.length;if(allDone){this.progress[k].completed=true;setTimeout(()=>this.showLevelTrophy(),1500)}},
retryGame(){this.gs={};this.starsEarned=0;const l=BC.levels[this.cl-1];this.renderGame(l.games[this.cgi]);window.scrollTo(0,0)},
showTrophy(){const p=document.createElement('div');p.className='trophy-popup show';p.innerHTML='<span class="ticon">⭐</span><div class="ttxt">Star Earned!</div><div class="tsub">Great work, young biologist!</div><button>Continue</button>';const o=document.createElement('div');o.className='overlay show';document.body.appendChild(o);document.body.appendChild(p);const close=()=>{p.remove();o.remove()};p.querySelector('button').onclick=close;o.onclick=close;setTimeout(close,2500)},
showLevelTrophy(){const p=document.createElement('div');p.className='trophy-popup show';p.innerHTML='<span class="ticon">🏆</span><div class="ttxt">Level Complete!</div><div class="tsub">Next level unlocked!</div><button>Continue</button>';const o=document.createElement('div');o.className='overlay show';document.body.appendChild(o);document.body.appendChild(p);const close=()=>{p.remove();o.remove();B.backToLevel()};p.querySelector('button').onclick=close;o.onclick=close}
};
document.addEventListener('DOMContentLoaded',()=>B.init());
