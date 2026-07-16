/* ============================================================
   Play and Learn English — Game Engine
   Server-backed progress with save codes
   ============================================================ */

// ─── STORAGE ────────────────────────────────────────────────
const STORAGE_KEY = 'mtl_english_session';  // only stores student session info
function loadSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
}
function saveSession(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

// ─── API ────────────────────────────────────────────────────
const API = {
    async createStudent(name) {
        const r = await fetch('/api/mtl/student', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || '建立失敗'); }
        return r.json();
    },
    async lookupStudent(code) {
        const r = await fetch('/api/mtl/student/' + encodeURIComponent(code));
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || '找不到儲存碼'); }
        return r.json();
    },
    async loadProgress(studentId) {
        const r = await fetch('/api/mtl/progress/' + encodeURIComponent(studentId));
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        return r.json();
    },
    async saveProgress(studentId, levelId, gameIdx, completed, stars, trophy) {
        const r = await fetch('/api/mtl/progress/' + encodeURIComponent(studentId), {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level_id: levelId, game_index: gameIdx, completed, stars, trophy })
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || '儲存失敗'); }
        return r.json();
    },
    async trackMistake(studentId, levelId, gameIdx, qIdx, word, type) {
        fetch('/api/mtl/mistake', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, level_id: levelId, game_index: gameIdx, question_index: qIdx, word: word || '', mistake_type: type || 'general' })
        }).catch(() => {});
    },
    async getReviewItems(studentId) {
        const r = await fetch('/api/mtl/review/' + encodeURIComponent(studentId));
        if (!r.ok) return { mistakes: [] };
        return r.json();
    },
    async markReviewed(mistakeId) {
        await fetch('/api/mtl/mistake/' + encodeURIComponent(mistakeId) + '/review', { method: 'PUT' });
    }
};

// ─── CONTENT ────────────────────────────────────────────────
// Each level: { id, name, ageRange, description, games: [...] }
// Each game: { type, title, content }
// type: comprehension|spelling|vocabulary|grammar|wordsearch|matching|fillblank|ordering

const MTL_CONTENT = { levels: [] };

(function buildContent() {
    const L = MTL_CONTENT.levels;

    // ─── LEVEL 1: Grade 1 (Age 5-6) ──────────────────────────
    L.push({
        id:1, name:'Grade 1', ageRange:'5–6',
        description:'Beginning English — letters, simple words, short sentences.',
        games:[
            {type:'comprehension', title:'My Pet Dog', passage:'Tom has a dog. The dog is brown. The dog likes to run. Tom likes his dog very much.', questions:[
                {q:'What does Tom have?', opts:['A cat','A dog','A bird','A fish'], ans:1},
                {q:'What color is the dog?', opts:['Black','White','Brown','Red'], ans:2},
                {q:'What does the dog like to do?', opts:['Sleep','Eat','Run','Swim'], ans:2},
                {q:'How does Tom feel about his dog?', opts:['Sad','Angry','Scared','He likes him very much'], ans:3}
            ]},
            {type:'spelling', title:'Spelling: Animals', words:[
                {word:'cat', hint:'A small pet that says meow'},
                {word:'dog', hint:'A pet that barks'},
                {word:'fish', hint:'An animal that swims in water'},
                {word:'bird', hint:'An animal that can fly'}
            ]},
            {type:'comprehension', title:'At the Park', passage:'Anna goes to the park. She sees a big tree. She sees flowers. The flowers are red and yellow. Anna is happy.', questions:[
                {q:'Where does Anna go?', opts:['School','Park','Store','Home'], ans:1},
                {q:'What does Anna see first?', opts:['A flower','A dog','A big tree','A car'], ans:2},
                {q:'What colors are the flowers?', opts:['Blue and green','Red and yellow','White and pink','Purple and orange'], ans:1},
                {q:'How does Anna feel?', opts:['Sad','Tired','Happy','Hungry'], ans:2}
            ]},
            {type:'vocabulary', title:'Colors', pairs:[
                {word:'Red', match:'The color of an apple'},
                {word:'Blue', match:'The color of the sky'},
                {word:'Green', match:'The color of grass'},
                {word:'Yellow', match:'The color of the sun'}
            ]},
            {type:'comprehension', title:'My Family', passage:'I have a family. My mom is kind. My dad is tall. I have a little sister. We are happy together.', questions:[
                {q:'Who is kind?', opts:['Dad','Sister','Mom','Grandma'], ans:2},
                {q:'Who is tall?', opts:['Mom','Dad','Sister','Brother'], ans:1},
                {q:'Does the writer have a brother or sister?', opts:['Brother','No sibling','Little sister','Big brother'], ans:2},
                {q:'How does the family feel?', opts:['Sad','Angry','Happy','Bored'], ans:2}
            ]},
            {type:'spelling', title:'Spelling: Colors', words:[
                {word:'red', hint:'The color of a stop sign'},
                {word:'blue', hint:'The color of the ocean'},
                {word:'green', hint:'The color of a leaf'},
                {word:'pink', hint:'The color of cotton candy'}
            ]},
            {type:'grammar', title:'Is / Are', sentences:[
                {sentence:'The cat ___ small.', opts:['is','are','am','be'], ans:0, blank:'___'},
                {sentence:'The dogs ___ big.', opts:['is','are','am','be'], ans:1, blank:'___'},
                {sentence:'I ___ happy.', opts:['is','are','am','be'], ans:2, blank:'___'},
                {sentence:'She ___ my friend.', opts:['is','are','am','be'], ans:0, blank:'___'}
            ]},
            {type:'comprehension', title:'Rainy Day', passage:'It is raining today. Lily wears a yellow raincoat. She has red boots. She jumps in puddles. Splash! Lily loves the rain.', questions:[
                {q:'What is the weather like?', opts:['Sunny','Snowy','Rainy','Windy'], ans:2},
                {q:'What color is the raincoat?', opts:['Red','Blue','Yellow','Green'], ans:2},
                {q:'What does Lily wear on her feet?', opts:['Shoes','Sandals','Red boots','Socks'], ans:2},
                {q:'What does Lily love?', opts:['Snow','Rain','Sun','Wind'], ans:1}
            ]},
            {type:'wordsearch', title:'Find the Animals', grid:[
                ['C','A','T','X','M'],
                ['D','W','O','D','O'],
                ['O','B','I','R','D'],
                ['G','F','I','S','H'],
                ['E','K','S','P','U']
            ], words:['CAT','DOG','BIRD','FISH'], size:5},
            {type:'matching', title:'Match: Animal Sounds', left:[
                {id:'a',text:'Dog'},{id:'b',text:'Cat'},{id:'c',text:'Cow'},{id:'d',text:'Duck'}
            ], right:[
                {id:'1',text:'Moo'},{id:'2',text:'Woof'},{id:'3',text:'Quack'},{id:'4',text:'Meow'}
            ], pairs:[['a','2'],['b','4'],['c','1'],['d','3']]},
            {type:'fillblank', title:'A Day at School', text:'I go to ___ . I see my ___ . We ___ together. School is ___.',
                blanks:[
                    {pos:0, opts:['school','park','store','beach'], ans:0},
                    {pos:1, opts:['teacher','dog','car','tree'], ans:0},
                    {pos:2, opts:['play','cry','sleep','run away'], ans:0},
                    {pos:3, opts:['fun','sad','dark','cold'], ans:0}
                ]},
            {type:'comprehension', title:'Ice Cream', passage:'Sam loves ice cream. His favorite flavor is chocolate. He gets one scoop on a cone. The ice cream is cold and sweet. Yum!', questions:[
                {q:'What does Sam love?', opts:['Cake','Ice cream','Candy','Fruit'], ans:1},
                {q:'What flavor is his favorite?', opts:['Vanilla','Strawberry','Chocolate','Mint'], ans:2},
                {q:'How many scoops does he get?', opts:['Two','Three','One','Four'], ans:2},
                {q:'How does the ice cream taste?', opts:['Hot and spicy','Cold and sweet','Sour','Bitter'], ans:1}
            ]},
            {type:'spelling', title:'Spelling: Food', words:[
                {word:'apple', hint:'A round red or green fruit'},
                {word:'milk', hint:'A white drink from cows'},
                {word:'bread', hint:'Made from flour, you make sandwiches with it'},
                {word:'egg', hint:'Comes from a chicken'}
            ]},
            {type:'vocabulary', title:'Body Parts', pairs:[
                {word:'Head', match:'On top of your body'},
                {word:'Hand', match:'You use it to hold things'},
                {word:'Foot', match:'You stand on it'},
                {word:'Eye', match:'You see with it'}
            ]},
            {type:'grammar', title:'A or An', sentences:[
                {sentence:'I see ___ cat.', opts:['a','an'], ans:0, blank:'___'},
                {sentence:'She has ___ apple.', opts:['a','an'], ans:1, blank:'___'},
                {sentence:'It is ___ big dog.', opts:['a','an'], ans:0, blank:'___'},
                {sentence:'He ate ___ egg.', opts:['a','an'], ans:1, blank:'___'}
            ]},
            {type:'ordering', title:'Make a Sentence', sentence:'The cat is on the mat', words:['the','mat','is','The','on','cat']},
            {type:'comprehension', title:'Bedtime', passage:'It is night time. Ben puts on his pajamas. He brushes his teeth. Mom reads a story. Ben goes to sleep.', questions:[
                {q:'What time is it?', opts:['Morning','Afternoon','Night time','Evening'], ans:2},
                {q:'What does Ben put on?', opts:['Shoes','Pajamas','Hat','Coat'], ans:1},
                {q:'Who reads a story?', opts:['Dad','Sister','Mom','Grandma'], ans:2},
                {q:'What does Ben do at the end?', opts:['Play','Eat','Go to sleep','Watch TV'], ans:2}
            ]},
            {type:'wordsearch', title:'Find the Colors', grid:[
                ['R','E','D','P','B'],
                ['B','L','U','E','L'],
                ['P','I','N','K','G'],
                ['G','R','E','E','N'],
                ['Y','X','W','Z','M']
            ], words:['RED','BLUE','GREEN','PINK'], size:5},
            {type:'vocabulary', title:'Weather Words', pairs:[
                {word:'Sunny', match:'The sun is shining'},
                {word:'Rainy', match:'Water falls from the sky'},
                {word:'Windy', match:'The air moves fast'},
                {word:'Snowy', match:'White flakes fall down'}
            ]},
            {type:'matching', title:'Match: Food Groups', left:[
                {id:'a',text:'Apple'},{id:'b',text:'Milk'},{id:'c',text:'Bread'},{id:'d',text:'Carrot'}
            ], right:[
                {id:'1',text:'Grain'},{id:'2',text:'Vegetable'},{id:'3',text:'Fruit'},{id:'4',text:'Dairy'}
            ], pairs:[['a','3'],['b','4'],['c','1'],['d','2']]}
        ]
    });

    // ─── LEVEL 2: Grade 2 (Age 6-7) ──────────────────────────
    L.push({
        id:2, name:'Grade 2', ageRange:'6–7',
        description:'Building sentences — longer stories, more words, basic grammar.',
        games:[
            {type:'comprehension', title:'The Lost Kitten', passage:'Emma found a small kitten under the tree. The kitten was white with black spots. It looked scared and hungry. Emma gave it some milk. She decided to take the kitten home and call it Snowy.', questions:[
                {q:'Where did Emma find the kitten?', opts:['In a box','Under the tree','In her house','At school'], ans:1},
                {q:'What color was the kitten?', opts:['All black','Brown','White with black spots','Gray'], ans:2},
                {q:'What did Emma give the kitten?', opts:['Water','Fish','Bread','Milk'], ans:3},
                {q:'What name did Emma choose?', opts:['Fluffy','Snowy','Spot','Kitty'], ans:1}
            ]},
            {type:'spelling', title:'Spelling: Nature', words:[
                {word:'tree', hint:'A tall plant with leaves and a trunk'},
                {word:'flower', hint:'A colorful plant that blooms'},
                {word:'river', hint:'Water that flows to the sea'},
                {word:'mountain', hint:'A very tall hill'}
            ]},
            {type:'comprehension', title:'A Trip to the Zoo', passage:'Last Saturday, Jack and his dad went to the zoo. They saw monkeys swinging in trees. They saw a big lion sleeping. The penguins were swimming in cold water. Jack\'s favorite was the elephant because it was so big and gentle.', questions:[
                {q:'When did they go to the zoo?', opts:['Sunday','Last Saturday','Monday','Friday'], ans:1},
                {q:'Who went with Jack?', opts:['His mom','His friend','His dad','His sister'], ans:2},
                {q:'What were the monkeys doing?', opts:['Sleeping','Eating','Swinging','Running'], ans:2},
                {q:'What was Jack\'s favorite animal?', opts:['Lion','Penguin','Monkey','Elephant'], ans:3}
            ]},
            {type:'grammar', title:'Past Tense: Regular Verbs', sentences:[
                {sentence:'Yesterday, I ___ (play) in the park.', opts:['play','plays','played','playing'], ans:2, blank:'___'},
                {sentence:'She ___ (walk) to school this morning.', opts:['walk','walks','walking','walked'], ans:3, blank:'___'},
                {sentence:'We ___ (watch) a movie last night.', opts:['watch','watches','watched','watching'], ans:2, blank:'___'},
                {sentence:'He ___ (clean) his room on Saturday.', opts:['clean','cleans','cleaning','cleaned'], ans:3, blank:'___'}
            ]},
            {type:'vocabulary', title:'Feelings', pairs:[
                {word:'Excited', match:'Very happy about something coming'},
                {word:'Worried', match:'Afraid something bad may happen'},
                {word:'Proud', match:'Feeling good about what you did'},
                {word:'Lonely', match:'Feeling sad because you are alone'}
            ]},
            {type:'comprehension', title:'The Vegetable Garden', passage:'Grandma has a garden behind her house. She grows tomatoes, carrots, and lettuce. Every morning she waters the plants. In summer, the tomatoes turn red and juicy. Grandma says homegrown vegetables taste the best.', questions:[
                {q:'Where is the garden?', opts:['In front','Behind the house','On the roof','At the park'], ans:1},
                {q:'What does Grandma NOT grow?', opts:['Tomatoes','Carrots','Lettuce','Apples'], ans:3},
                {q:'When do the tomatoes turn red?', opts:['Spring','Winter','Summer','Autumn'], ans:2},
                {q:'What does Grandma say about homegrown vegetables?', opts:['They are cheap','They taste the best','They are small','They are hard to grow'], ans:1}
            ]},
            {type:'spelling', title:'Spelling: School', words:[
                {word:'pencil', hint:'You write with it'},
                {word:'teacher', hint:'The person who helps you learn'},
                {word:'library', hint:'A place with many books'},
                {word:'homework', hint:'School work you do at home'}
            ]},
            {type:'matching', title:'Match: Opposites', left:[
                {id:'a',text:'Big'},{id:'b',text:'Hot'},{id:'c',text:'Day'},{id:'d',text:'Fast'}
            ], right:[
                {id:'1',text:'Night'},{id:'2',text:'Slow'},{id:'3',text:'Small'},{id:'4',text:'Cold'}
            ], pairs:[['a','3'],['b','4'],['c','1'],['d','2']]},
            {type:'fillblank', title:'The Beach Trip', text:'We went to the ___ . The sand was ___ . We built a ___ . We swam in the ___ . It was a great day!',
                blanks:[
                    {pos:0, opts:['beach','mountain','city','forest'], ans:0},
                    {pos:1, opts:['cold','hard','soft','wet'], ans:2},
                    {pos:2, opts:['house','sandcastle','tower','bridge'], ans:1},
                    {pos:3, opts:['pool','lake','river','ocean'], ans:3}
                ]},
            {type:'wordsearch', title:'Find the Fruits', grid:[
                ['A','P','P','L','E','M'],
                ['O','R','A','N','G','E'],
                ['G','R','A','P','E','B'],
                ['M','A','N','G','O','O'],
                ['K','I','W','I','P','L'],
                ['P','E','A','R','N','S']
            ], words:['APPLE','ORANGE','GRAPE','MANGO','PEAR','KIWI'], size:6},
            {type:'comprehension', title:'Baking Cookies', passage:'Mom and Sophie baked cookies today. They mixed flour, sugar, and butter in a big bowl. They added chocolate chips. The kitchen smelled wonderful while the cookies were in the oven. When they were ready, Sophie ate two warm cookies with a glass of milk.', questions:[
                {q:'Who baked cookies with Sophie?', opts:['Her dad','Her grandma','Her mom','Her friend'], ans:2},
                {q:'What did they NOT use?', opts:['Flour','Sugar','Butter','Eggs'], ans:3},
                {q:'What did they add to the cookies?', opts:['Nuts','Chocolate chips','Raisins','Candy'], ans:1},
                {q:'What did Sophie drink with her cookies?', opts:['Juice','Water','Milk','Tea'], ans:2}
            ]},
            {type:'grammar', title:'There is / There are', sentences:[
                {sentence:'___ a book on the table.', opts:['There is','There are'], ans:0, blank:'___'},
                {sentence:'___ three birds in the tree.', opts:['There is','There are'], ans:1, blank:'___'},
                {sentence:'___ some milk in the fridge.', opts:['There is','There are'], ans:0, blank:'___'},
                {sentence:'___ many stars in the sky.', opts:['There is','There are'], ans:1, blank:'___'}
            ]},
            {type:'ordering', title:'Make a Sentence', sentence:'She likes to read books at night', words:['read','likes','at','She','night','to','books']},
            {type:'vocabulary', title:'Action Words', pairs:[
                {word:'Whisper', match:'Speak very quietly'},
                {word:'Shout', match:'Speak very loudly'},
                {word:'Stumble', match:'Almost fall while walking'},
                {word:'Glance', match:'Look quickly at something'}
            ]},
            {type:'comprehension', title:'The New Bicycle', passage:'For his birthday, Leo got a red bicycle. It had shiny silver wheels and a bell that went "ding ding." Leo was nervous at first, but his dad held the seat and ran beside him. After a week of practice, Leo could ride all by himself. He felt so proud!', questions:[
                {q:'What did Leo get for his birthday?', opts:['A toy','A book','A bicycle','A game'], ans:2},
                {q:'What color was the bicycle?', opts:['Blue','Red','Green','Black'], ans:1},
                {q:'Who helped Leo learn to ride?', opts:['His mom','His friend','His dad','His teacher'], ans:2},
                {q:'How did Leo feel after learning?', opts:['Tired','Proud','Sad','Scared'], ans:1}
            ]},
            {type:'spelling', title:'Spelling: Weather', words:[
                {word:'sunny', hint:'Bright with sunshine'},
                {word:'cloudy', hint:'The sky is full of gray clouds'},
                {word:'stormy', hint:'With thunder and lightning'},
                {word:'rainbow', hint:'Colorful arc in the sky after rain'}
            ]},
            {type:'matching', title:'Match: Where They Live', left:[
                {id:'a',text:'Fish'},{id:'b',text:'Bird'},{id:'c',text:'Bee'},{id:'d',text:'Rabbit'}
            ], right:[
                {id:'1',text:'Hive'},{id:'2',text:'Burrow'},{id:'3',text:'Water'},{id:'4',text:'Nest'}
            ], pairs:[['a','3'],['b','4'],['c','1'],['d','2']]},
            {type:'grammar', title:'Do / Does', sentences:[
                {sentence:'___ you like ice cream?', opts:['Do','Does'], ans:0, blank:'___'},
                {sentence:'___ she play the piano?', opts:['Do','Does'], ans:1, blank:'___'},
                {sentence:'___ they live near here?', opts:['Do','Does'], ans:0, blank:'___'},
                {sentence:'___ he have a pet?', opts:['Do','Does'], ans:1, blank:'___'}
            ]},
            {type:'wordsearch', title:'Find the Verbs', grid:[
                ['R','U','N','J','M','P'],
                ['W','A','L','K','U','L'],
                ['J','U','M','P','F','A'],
                ['S','I','N','G','L','Y'],
                ['R','E','A','D','Y','W'],
                ['S','W','I','M','Z','Q']
            ], words:['RUN','WALK','JUMP','SING','READ','SWIM'], size:6},
            {type:'comprehension', title:'Show and Tell', passage:'It was Friday, show-and-tell day at school. Mia brought her seashell collection. She had shells from three different beaches. One shell was pink, one was spiral-shaped, and one was as big as her hand. Her classmates asked many questions. Mia felt happy sharing something she loved.', questions:[
                {q:'What day was show-and-tell?', opts:['Monday','Wednesday','Friday','Tuesday'], ans:2},
                {q:'What did Mia bring?', opts:['Stamps','Seashells','Rocks','Coins'], ans:1},
                {q:'How many beaches had she visited?', opts:['One','Two','Three','Four'], ans:2},
                {q:'How did Mia feel about sharing?', opts:['Nervous','Happy','Bored','Angry'], ans:1}
            ]},
            {type:'fillblank', title:'At the Farm', text:'The farmer wakes up ___ . He feeds the ___ . The cow gives ___ . The farmer works ___ .',
                blanks:[
                    {pos:0, opts:['late','early','at noon','at night'], ans:1},
                    {pos:1, opts:['animals','cars','toys','books'], ans:0},
                    {pos:2, opts:['water','milk','juice','soda'], ans:1},
                    {pos:3, opts:['hard','slowly','angrily','sadly'], ans:0}
                ]}
        ]
    });

    // ─── LEVEL 3: Grade 3 (Age 7-8) ──────────────────────────
    L.push({
        id:3, name:'Grade 3', ageRange:'7–8',
        description:'Reading longer stories — paragraphs, dialogue, compare and contrast.',
        games:[
            {type:'comprehension', title:'The Magic Paintbrush', passage:'Once upon a time, there was a poor artist named Ming. One night, an old man gave him a magic paintbrush. Whatever Ming painted with this brush became real! He painted food for hungry people and warm clothes for those who were cold. The greedy king heard about the brush and demanded Ming paint gold for him. Ming refused. The king threw Ming in prison, but Ming painted a door on the wall and escaped.', questions:[
                {q:'What was the artist\'s name?', opts:['Lee','Ming','Chen','Wei'], ans:1},
                {q:'What was special about the paintbrush?', opts:['It was gold','It could talk','Whatever was painted became real','It never ran out of paint'], ans:2},
                {q:'What did the king want?', opts:['Food','Gold','Clothes','A picture'], ans:1},
                {q:'How did Ming escape?', opts:['He climbed the wall','The guard helped him','He painted a door','He broke the bars'], ans:2}
            ]},
            {type:'spelling', title:'Spelling: Tricky Words', words:[
                {word:'because', hint:'For the reason that'},
                {word:'beautiful', hint:'Very pretty or nice to look at'},
                {word:'favorite', hint:'The one you like the most'},
                {word:'different', hint:'Not the same as something else'}
            ]},
            {type:'comprehension', title:'Why the Sky Is Blue', passage:'Have you ever wondered why the sky is blue? Sunlight looks white, but it is actually made of many colors. When sunlight hits the air, the blue light bounces around more than other colors. This is called scattering. That is why we see a blue sky during the day. At sunset, the light travels through more air, so we see red and orange instead.', questions:[
                {q:'What color is sunlight really?', opts:['Blue','Yellow','White','Red'], ans:2},
                {q:'What happens to blue light in the air?', opts:['It disappears','It scatters more','It turns red','It becomes white'], ans:1},
                {q:'What is this effect called?', opts:['Reflection','Scattering','Absorption','Refraction'], ans:1},
                {q:'Why are sunsets red and orange?', opts:['The sun changes color','Light travels through more air','Blue light disappears','The sky is different at night'], ans:1}
            ]},
            {type:'grammar', title:'Irregular Past Tense', sentences:[
                {sentence:'She ___ (go) to the store yesterday.', opts:['go','goes','gone','went'], ans:3, blank:'(go)'},
                {sentence:'I ___ (see) a rainbow this morning.', opts:['see','saw','seen','seeing'], ans:1, blank:'(see)'},
                {sentence:'He ___ (eat) all his vegetables.', opts:['eat','eats','ate','eating'], ans:2, blank:'(eat)'},
                {sentence:'They ___ (run) very fast in the race.', opts:['run','runs','running','ran'], ans:3, blank:'(run)'}
            ]},
            {type:'vocabulary', title:'Synonyms', pairs:[
                {word:'Happy', match:'Glad / Joyful'},
                {word:'Big', match:'Large / Huge'},
                {word:'Smart', match:'Clever / Intelligent'},
                {word:'Brave', match:'Courageous / Fearless'}
            ]},
            {type:'comprehension', title:'The Water Cycle', passage:'Water on Earth is always moving. The sun heats water in oceans and lakes, turning it into vapor that rises into the air. This is called evaporation. The vapor cools and forms clouds — that is condensation. When the clouds get heavy, the water falls as rain or snow — precipitation. Then the water flows back to the oceans, and the cycle begins again.', questions:[
                {q:'What turns water into vapor?', opts:['Wind','The sun','Clouds','Rain'], ans:1},
                {q:'What is it called when vapor forms clouds?', opts:['Evaporation','Condensation','Precipitation','Collection'], ans:1},
                {q:'What is rain or snow called in the water cycle?', opts:['Evaporation','Condensation','Precipitation','Scattering'], ans:2},
                {q:'Where does the water go after it rains?', opts:['It disappears','It stays on the ground','Back to the oceans','Into space'], ans:2}
            ]},
            {type:'spelling', title:'Spelling: Science Words', words:[
                {word:'planet', hint:'A large body that orbits a star, like Earth'},
                {word:'energy', hint:'The power to do work'},
                {word:'oxygen', hint:'The gas we breathe'},
                {word:'temperature', hint:'How hot or cold something is'}
            ]},
            {type:'wordsearch', title:'Find the Planets', grid:[
                ['M','E','R','C','U','R','Y'],
                ['V','E','N','U','S','X','W'],
                ['E','A','R','T','H','M','Z'],
                ['M','A','R','S','J','U','P'],
                ['S','A','T','U','R','N','V'],
                ['N','E','P','T','U','N','E']
            ], words:['MERCURY','VENUS','EARTH','MARS','SATURN','NEPTUNE'], size:7},
            {type:'matching', title:'Match: Jobs', left:[
                {id:'a',text:'Doctor'},{id:'b',text:'Chef'},{id:'c',text:'Pilot'},{id:'d',text:'Farmer'}
            ], right:[
                {id:'1',text:'Flies airplanes'},{id:'2',text:'Cooks food'},{id:'3',text:'Grows crops'},{id:'4',text:'Helps sick people'}
            ], pairs:[['a','4'],['b','2'],['c','1'],['d','3']]},
            {type:'comprehension', title:'The Ant and the Grasshopper', passage:'All summer, the ant worked hard collecting food for winter. The grasshopper just played music and danced. "Why work so hard?" laughed the grasshopper. "Come dance with me!" The ant said, "I am preparing for winter. You should too." When winter came, the ant had plenty of food in its warm home. The hungry grasshopper knocked on the ant\'s door, asking for help. The ant shared some food, and the grasshopper learned to prepare for the future.', questions:[
                {q:'What did the ant do all summer?', opts:['Danced','Collected food','Played music','Slept'], ans:1},
                {q:'What did the grasshopper do?', opts:['Worked hard','Collected food','Played music and danced','Built a house'], ans:2},
                {q:'What happened when winter came?', opts:['The grasshopper had food','The ant was hungry','The grasshopper was hungry','They both had food'], ans:2},
                {q:'What lesson did the grasshopper learn?', opts:['Dancing is fun','Music is important','Prepare for the future','Ants are mean'], ans:2}
            ]},
            {type:'grammar', title:'Comparatives', sentences:[
                {sentence:'An elephant is ___ (big) than a dog.', opts:['big','biger','bigger','biggest'], ans:2, blank:'(big)'},
                {sentence:'This book is ___ (interesting) than that one.', opts:['interesting','more interesting','interestinger','most interesting'], ans:1, blank:'(interesting)'},
                {sentence:'She runs ___ (fast) than her brother.', opts:['fast','faster','fastest','more fast'], ans:1, blank:'(fast)'},
                {sentence:'Today is ___ (hot) than yesterday.', opts:['hot','hoter','hottest','hotter'], ans:3, blank:'(hot)'}
            ]},
            {type:'ordering', title:'Make a Sentence', sentence:'The brave knight saved the village from the dragon', words:['brave','knight','the','saved','The','dragon','from','village']},
            {type:'vocabulary', title:'Prefixes: un- and re-', pairs:[
                {word:'Unhappy', match:'Not happy'},
                {word:'Rewrite', match:'Write again'},
                {word:'Unfair', match:'Not fair'},
                {word:'Replay', match:'Play again'}
            ]},
            {type:'comprehension', title:'How Bees Make Honey', passage:'Bees are amazing workers. Worker bees fly from flower to flower collecting nectar with their long tongues. They store the nectar in a special honey stomach. Back at the hive, they pass the nectar to other bees who chew it and pass it along. This process turns the nectar into honey. Finally, the bees fan the honey with their wings to dry it, then seal the honeycomb with wax.', questions:[
                {q:'What do bees collect from flowers?', opts:['Pollen only','Nectar','Honey','Wax'], ans:1},
                {q:'Where do bees first store nectar?', opts:['In their mouth','In flowers','In a honey stomach','In the honeycomb'], ans:2},
                {q:'How do bees dry the honey?', opts:['In the sun','With fire','By fanning with wings','By waiting'], ans:2},
                {q:'What do bees use to seal the honeycomb?', opts:['Honey','Nectar','Pollen','Wax'], ans:3}
            ]},
            {type:'fillblank', title:'The Solar System', text:'The ___ is at the center of our solar system. Earth is the ___ planet from the sun. The ___ planet is Jupiter. There are ___ planets in total.',
                blanks:[
                    {pos:0, opts:['moon','sun','Earth','star'], ans:1},
                    {pos:1, opts:['first','second','third','fourth'], ans:2},
                    {pos:2, opts:['smallest','hottest','coldest','largest'], ans:3},
                    {pos:3, opts:['seven','eight','nine','ten'], ans:1}
                ]},
            {type:'spelling', title:'Spelling: Geography', words:[
                {word:'continent', hint:'A very large land mass, like Asia or Africa'},
                {word:'island', hint:'A piece of land surrounded by water'},
                {word:'desert', hint:'A very dry place with little rain'},
                {word:'volcano', hint:'A mountain that can erupt with lava'}
            ]},
            {type:'matching', title:'Match: Country to Capital', left:[
                {id:'a',text:'China'},{id:'b',text:'Japan'},{id:'c',text:'France'},{id:'d',text:'USA'}
            ], right:[
                {id:'1',text:'Washington D.C.'},{id:'2',text:'Beijing'},{id:'3',text:'Paris'},{id:'4',text:'Tokyo'}
            ], pairs:[['a','2'],['b','4'],['c','3'],['d','1']]},
            {type:'grammar', title:'Prepositions', sentences:[
                {sentence:'The cat is ___ the table.', opts:['on','in','at','with'], ans:0, blank:'___'},
                {sentence:'She lives ___ a big city.', opts:['on','in','at','by'], ans:1, blank:'___'},
                {sentence:'We will meet ___ 3 o\'clock.', opts:['on','in','at','for'], ans:2, blank:'___'},
                {sentence:'He goes to school ___ bus.', opts:['on','in','by','with'], ans:2, blank:'___'}
            ]},
            {type:'comprehension', title:'The First Moon Landing', passage:'On July 20, 1969, Neil Armstrong became the first person to walk on the moon. He stepped off the spaceship and said the famous words: "That\'s one small step for a man, one giant leap for mankind." Buzz Aldrin joined him minutes later. They planted an American flag and collected moon rocks to bring back to Earth. Millions of people around the world watched this historic moment on TV.', questions:[
                {q:'When did the first moon landing happen?', opts:['June 20, 1969','July 20, 1969','August 20, 1969','July 20, 1970'], ans:1},
                {q:'Who was the first person on the moon?', opts:['Buzz Aldrin','Neil Armstrong','Michael Collins','Yuri Gagarin'], ans:1},
                {q:'What did they plant on the moon?', opts:['A tree','A flag','A sign','A camera'], ans:1},
                {q:'What did they bring back to Earth?', opts:['Moon rocks','Moon water','Moon plants','Moon dust only'], ans:0}
            ]},
            {type:'wordsearch', title:'Find the Continents', grid:[
                ['A','S','I','A','E','U','R'],
                ['A','F','R','I','C','A','O'],
                ['E','U','R','O','P','E','P'],
                ['S','O','U','T','H','A','M'],
                ['N','O','R','T','H','C','A'],
                ['I','N','D','I','A','L','A']
            ], words:['ASIA','AFRICA','EUROPE','SOUTH','NORTH','INDIA'], size:7},
            {type:'ordering', title:'Make a Sentence', sentence:'The young prince carefully opened the ancient treasure chest', words:['young','chest','The','carefully','ancient','opened','prince','treasure']}
        ]
    });
})();

// ─── GENERATE REMAINING LEVELS (Grades 4-12) ─────────────────
(function buildRemainingLevels() {
    const L = MTL_CONTENT.levels;
    // Grades 4-12 with comprehensive content structures
    const levelDefs = [
        {id:4, name:'Grade 4', age:'8–9', desc:'Paragraph analysis — main ideas, inferences, character traits.'},
        {id:5, name:'Grade 5', age:'9–10', desc:'Critical reading — cause and effect, author\'s purpose, fact vs opinion.'},
        {id:6, name:'Grade 6', age:'10–11', desc:'Advanced comprehension — themes, figurative language, text structure.'},
        {id:7, name:'Grade 7', age:'11–12', desc:'Literary analysis — symbolism, point of view, argument evaluation.'},
        {id:8, name:'Grade 8', age:'12–13', desc:'Persuasive texts — rhetoric, bias detection, evidence analysis.'},
        {id:9, name:'Grade 9', age:'13–14', desc:'Academic English — research texts, formal writing, citations.'},
        {id:10, name:'Grade 10', age:'14–15', desc:'Literature study — poetry, drama, literary devices, critical essays.'},
        {id:11, name:'Grade 11', age:'15–16', desc:'Advanced analysis — SAT/ACT prep, complex arguments, synthesis.'},
        {id:12, name:'Grade 12', age:'16–17', desc:'College prep — academic papers, rhetorical analysis, research skills.'}
    ];

    // Comprehension passage templates by grade band
    const passages = {
        // Grade 4 (ages 8-9): 300-400 words, explicit + implicit questions
        4: [
            {t:'The Invention of the Telephone', p:'Alexander Graham Bell was a teacher of deaf students. He wanted to find a way to send voice through wires. In 1876, while working in his laboratory in Boston, Bell spoke the first words ever transmitted by telephone: "Mr. Watson, come here. I want to see you." His assistant Thomas Watson, in another room, heard Bell\'s voice clearly through the receiver. Bell had invented the telephone! This invention changed the world forever. People could now talk to each other across long distances. Within a few years, thousands of telephones were installed in homes and businesses across America. Bell went on to found the Bell Telephone Company, which grew into one of the largest companies in the world.', qs:[
                {q:'What was Bell\'s profession before inventing the telephone?',o:['Scientist','Teacher of deaf students','Engineer','Doctor'],a:1},
                {q:'What year did Bell invent the telephone?',o:['1874','1875','1876','1877'],a:2},
                {q:'What were Bell\'s first words on the telephone?',o:['Hello, can you hear me?','Mr. Watson, come here. I want to see you.','Testing, one two three.','Is this working?'],a:1},
                {q:'What can you infer about Bell\'s character from this passage?',o:['He was lazy','He was determined and cared about communication','He only cared about money','He gave up easily'],a:1}
            ]},
            {t:'The Great Barrier Reef', p:'The Great Barrier Reef is the largest coral reef system in the world. It is located off the coast of Queensland, Australia. The reef is so big that it can be seen from space! It stretches for over 2,300 kilometers and is made up of nearly 3,000 individual reefs. The reef is home to thousands of species of fish, turtles, sharks, dolphins, and colorful coral. The coral itself is actually made of tiny animals called polyps. Sadly, the Great Barrier Reef is in danger. Warmer ocean temperatures cause coral bleaching, which turns the colorful coral white and can kill it. Scientists and conservationists are working hard to protect this natural wonder for future generations.', qs:[
                {q:'Where is the Great Barrier Reef located?',o:['Hawaii','Queensland, Australia','Florida','Brazil'],a:1},
                {q:'What are corals made of?',o:['Rocks','Plants','Tiny animals called polyps','Sand'],a:2},
                {q:'What causes coral bleaching?',o:['Pollution','Warmer ocean temperatures','Too many fish','Storms'],a:1},
                {q:'What is the main idea of the last two sentences?',o:['The reef is beautiful','The reef needs protection from threats','The reef is the biggest','Tourism is important'],a:1}
            ]},
            {t:'How Chocolate Is Made', p:'Chocolate comes from the cacao tree, which grows in tropical regions near the equator. The tree produces large pods that contain 20 to 50 seeds called cacao beans. First, farmers harvest the pods and remove the beans. The beans are then fermented under banana leaves for several days, which develops their chocolate flavor. After fermentation, the beans are dried in the sun. Next, they are roasted at high temperatures to bring out the deep chocolate taste. The roasted beans are ground into a paste called chocolate liquor. This paste can be separated into cocoa solids and cocoa butter. To make the chocolate bars we eat, manufacturers mix cocoa solids, cocoa butter, sugar, and milk powder together. The mixture is heated, cooled, and shaped into bars. The whole process from tree to candy bar takes several weeks!', qs:[
                {q:'Where do cacao trees grow?',o:['Cold mountains','Tropical regions near the equator','Deserts','Europe'],a:1},
                {q:'What happens to the beans after harvesting?',o:['They are eaten immediately','They are fermented','They are frozen','They are painted'],a:1},
                {q:'What is chocolate liquor?',o:['A drink','Ground cacao bean paste','Alcohol','Sugar syrup'],a:1},
                {q:'What is the text structure of this passage?',o:['Compare and contrast','Problem and solution','Sequence / chronological order','Persuasive argument'],a:2}
            ]},
            {t:'The Amazon Rainforest', p:'The Amazon Rainforest is often called "the lungs of the Earth" because it produces about 20% of the world\'s oxygen. It covers parts of nine South American countries, with the largest portion in Brazil. The Amazon is home to an incredible variety of life — scientists estimate that one in ten known species on Earth lives in the Amazon. This includes jaguars, sloths, macaws, and millions of insect species. The rainforest also contains thousands of plants that are used in modern medicines. Unfortunately, large areas of the Amazon are being cut down every year for farming and logging. When trees are removed, animals lose their homes, and the carbon stored in the trees is released into the atmosphere. Protecting the Amazon is important for the health of our entire planet.', qs:[
                {q:'Why is the Amazon called "the lungs of the Earth"?',o:['It looks like lungs','It produces about 20% of the world\'s oxygen','People breathe differently there','The trees are shaped like lungs'],a:1},
                {q:'Which country has the largest portion of the Amazon?',o:['Argentina','Peru','Brazil','Colombia'],a:2},
                {q:'Why is deforestation harmful?',o:['It creates more jobs','Animals lose homes and carbon is released','There are no negative effects','It rains more'],a:1},
                {q:'What is the author\'s purpose in the last two sentences?',o:['To entertain readers','To persuade readers that protecting the Amazon is important','To describe the animals','To explain how logging works'],a:1}
            ]}
        ],
        // Grade 5 (ages 9-10): cause/effect, author's purpose
        5: [
            {t:'The Industrial Revolution', p:'The Industrial Revolution was a period of major change that began in Britain around 1760 and spread across Europe and America. Before this time, most goods were made by hand in people\'s homes. The invention of machines like the steam engine, spinning jenny, and power loom changed everything. Factories were built where machines could produce goods much faster than humans could by hand. This caused many people to move from farms to cities to work in factories. While the Industrial Revolution brought many advances, it also caused problems. Cities became crowded and dirty. Many factory workers, including children, worked long hours in dangerous conditions. However, these problems eventually led to important reforms — laws were passed to limit working hours, improve safety, and require education for children. The Industrial Revolution shaped the modern world we live in today.', qs:[
                {q:'Where did the Industrial Revolution begin?',o:['America','France','Britain','Germany'],a:2},
                {q:'What caused people to move from farms to cities?',o:['Better weather','Factory jobs','Schools','Hospitals'],a:1},
                {q:'What was a NEGATIVE effect of the Industrial Revolution?',o:['More goods were produced','Cities became crowded and dirty','New machines were invented','Trade increased'],a:1},
                {q:'What is the author\'s main purpose in this passage?',o:['To entertain with a story','To persuade against factories','To inform about the causes and effects of the Industrial Revolution','To describe factory machines in detail'],a:2}
            ]},
            {t:'The Circulatory System', p:'Your heart is an amazing muscle about the size of your fist. It beats about 100,000 times every day, pumping blood through a network of blood vessels that stretches over 96,000 kilometers — enough to circle the Earth twice! The circulatory system has three main parts: the heart, blood vessels, and blood. The heart has four chambers: two atria on top and two ventricles on the bottom. Blood enters the right side of the heart, gets pumped to the lungs to pick up oxygen, returns to the left side, and then gets pumped to the rest of the body. The blood delivers oxygen and nutrients to all your cells and carries away waste products. Red blood cells contain hemoglobin, which gives blood its red color and carries oxygen. White blood cells fight infections, and platelets help blood clot when you get a cut.', qs:[
                {q:'How many times does your heart beat per day?',o:['10,000','50,000','100,000','1,000,000'],a:2},
                {q:'What is the cause-and-effect relationship in blood circulation?',o:['Blood goes to lungs → picks up oxygen → goes to body','Blood goes to body → then lungs → then heart','Oxygen is created in the heart','Blood never goes to the lungs'],a:0},
                {q:'What is the function of white blood cells?',o:['Carry oxygen','Fight infections','Help blood clot','Give blood its color'],a:1},
                {q:'What is hemoglobin and what does it do?',o:['A white blood cell that clots blood','A protein in red blood cells that carries oxygen','A type of blood vessel','A chamber in the heart'],a:1}
            ]},
            {t:'The Story of the Titanic', p:'The RMS Titanic was the largest and most luxurious ship ever built when it set sail on April 10, 1912. It was called "unsinkable" because of its advanced safety features. The ship carried over 2,200 passengers and crew from Southampton, England, to New York City. On the night of April 14, the Titanic struck an iceberg in the North Atlantic Ocean. The iceberg tore a series of holes along the ship\'s side, flooding five of its watertight compartments. The ship was designed to stay afloat with four compartments flooded, but not five. Within two hours and forty minutes, the "unsinkable" ship sank beneath the freezing water. Only about 700 people survived because there were not enough lifeboats for everyone. The Titanic disaster led to major changes in maritime safety laws, including requirements for enough lifeboats for all passengers and 24-hour radio watch on all ships.', qs:[
                {q:'When did the Titanic set sail?',o:['April 10, 1912','April 14, 1912','April 15, 1912','March 10, 1912'],a:0},
                {q:'Why did the Titanic sink despite its safety features?',o:['The crew made a mistake','It hit an iceberg and more compartments flooded than it could handle','The engine failed','There was a fire on board'],a:1},
                {q:'Why did so many people die?',o:['The water was too cold','There were not enough lifeboats','People refused to leave','The ship sank too fast to react'],a:1},
                {q:'What was one effect of the Titanic disaster?',o:['Ships stopped crossing the Atlantic','New maritime safety laws were created','Shipbuilding was banned','Icebergs were destroyed'],a:1}
            ]}
        ],
        // Grade 6 (ages 10-11): themes, figurative language
        6: [
            {t:'The Renaissance', p:'The Renaissance, meaning "rebirth" in French, was a golden age of art, science, and learning that began in Italy in the 14th century and spread across Europe. After centuries often called the Dark Ages, people rediscovered the knowledge and ideas of ancient Greece and Rome. Artists like Leonardo da Vinci and Michelangelo created masterpieces that still amaze us today — the Mona Lisa and the Sistine Chapel ceiling. Scientists like Galileo challenged old ideas about the universe, using observation and experiments instead of just accepting what earlier authorities had said. The invention of the printing press by Johannes Gutenberg around 1440 was crucial — for the first time, books could be produced quickly and cheaply, spreading new ideas across Europe like wildfire. This metaphor captures the explosive spread of knowledge that transformed European society forever.', qs:[
                {q:'What does "Renaissance" mean?',o:['Rebirth','Art','Science','Discovery'],a:0},
                {q:'What did Galileo do differently from earlier scientists?',o:['He only read old books','He used observation and experiments','He never challenged authority','He only studied the stars'],a:1},
                {q:'What figure of speech is "like wildfire"?',o:['Metaphor','Simile','Personification','Hyperbole'],a:1},
                {q:'What was the theme of the Renaissance?',o:['Darkness and ignorance','The rebirth of knowledge, art, and human potential','The superiority of one country','The end of science'],a:1}
            ]},
            {t:'Climate Change: The Evidence', p:'Climate change is one of the biggest challenges facing humanity today. Scientists have gathered extensive evidence showing that Earth\'s average temperature has risen about 1.1°C since the late 19th century. The main cause is the burning of fossil fuels — coal, oil, and gas — which releases carbon dioxide and other greenhouse gases into the atmosphere. These gases trap heat from the sun, like a blanket around the Earth. This is called the greenhouse effect. Evidence of climate change includes rising sea levels (about 20 centimeters since 1880), melting glaciers and ice sheets, more frequent extreme weather events like hurricanes and wildfires, and shifts in animal migration patterns. Ninety-seven percent of climate scientists agree that human activities are the primary cause. Addressing climate change requires global cooperation to reduce emissions and develop clean energy sources.', qs:[
                {q:'How much has Earth\'s temperature risen since the late 19th century?',o:['0.5°C','1.1°C','2.0°C','5.0°C'],a:1},
                {q:'What is compared to a blanket in this passage?',o:['The sun','Greenhouse gases','The ocean','Fossil fuels'],a:1},
                {q:'What percentage of climate scientists agree humans are the primary cause?',o:['50%','75%','97%','100%'],a:2},
                {q:'What text structure does the author mainly use?',o:['Narrative story','Problem and solution with evidence','Chronological order','Compare and contrast'],a:1}
            ]}
        ],
        // Grade 7 (ages 11-12): literary analysis
        7: [
            {t:'Symbolism in Literature', p:'Symbolism is one of the most powerful tools in a writer\'s toolkit. A symbol is an object, character, or event that represents something beyond its literal meaning. In F. Scott Fitzgerald\'s "The Great Gatsby," the green light at the end of Daisy\'s dock symbolizes Gatsby\'s hopes and dreams for the future — always visible but never quite reachable. The valley of ashes represents the moral and social decay hidden beneath the glittering surface of the Roaring Twenties. Symbols work because they add layers of meaning to a story without the author having to state everything explicitly. A skilled reader learns to recognize symbols and think about what they represent. When you encounter a repeated image or object in a story, ask yourself: what might this stand for beyond its literal meaning?', qs:[
                {q:'What is a symbol in literature?',o:['Something that only has one meaning','An object that represents something beyond its literal meaning','A type of character','The title of the book'],a:1},
                {q:'What does the green light symbolize in The Great Gatsby?',o:['Wealth','Gatsby\'s hopes and dreams','Traffic signals','Nature'],a:1},
                {q:'What does the valley of ashes represent?',o:['A real place','Moral and social decay','Beautiful scenery','Industrial progress'],a:1},
                {q:'What is the author\'s advice for recognizing symbols?',o:['Ignore repeated images','Ask what repeated objects might represent beyond literal meaning','Only look at the title','Ask the author directly'],a:1}
            ]},
            {t:'The Power of Persuasion', p:'Persuasion surrounds us every day — in advertisements, political speeches, and even conversations with friends. Aristotle identified three modes of persuasion: ethos, pathos, and logos. Ethos appeals to the speaker\'s credibility and character ("trust me, I\'m a doctor"). Pathos appeals to emotions ("think of the children"). Logos appeals to logic and reason ("studies show that..."). Effective persuaders use all three. However, not all persuasion is honest. Logical fallacies — errors in reasoning — can make weak arguments seem strong. For example, the "straw man" fallacy misrepresents an opponent\'s argument to make it easier to attack. The "ad hominem" fallacy attacks the person instead of addressing their argument. Being able to recognize these techniques makes you a more critical thinker and less susceptible to manipulation.', qs:[
                {q:'What are Aristotle\'s three modes of persuasion?',o:['Beginning, middle, end','Ethos, pathos, logos','Fact, opinion, belief','Past, present, future'],a:1},
                {q:'Which mode appeals to emotions?',o:['Ethos','Pathos','Logos','Sophos'],a:1},
                {q:'What is a "straw man" fallacy?',o:['Using straw in an argument','Misrepresenting an opponent\'s argument to attack it easily','Agreeing with the opponent','Using too many facts'],a:1},
                {q:'What is the main idea of this passage?',o:['Persuasion is always bad','Understanding persuasion techniques helps you think critically','Aristotle was the only philosopher','Emotions should be ignored in arguments'],a:1}
            ]}
        ],
        // Grade 8 (ages 12-13): rhetoric, bias
        8: [
            {t:'Media Bias and Critical Reading', p:'Every news story you read has been shaped by choices — what to include, what to leave out, which words to use, and which sources to quote. Media bias occurs when news reporting is systematically slanted toward a particular perspective. Bias can appear in several forms: selection bias (choosing stories that support one viewpoint), placement bias (giving prominent placement to favored stories), and labeling bias (using loaded language to describe people or groups). For example, describing a group as "protesters" versus "rioters" sends very different messages. To be an informed reader, you should: (1) read news from multiple sources, especially those with different perspectives; (2) check whether factual claims are supported by evidence; (3) distinguish between news reporting and opinion pieces; and (4) ask yourself what might be missing from the story. Critical reading is not about finding an "unbiased" source — it is about understanding the biases that exist in all reporting.', qs:[
                {q:'What is media bias?',o:['When news is always false','When reporting is systematically slanted toward a perspective','When reporters make mistakes','When no one reads the news'],a:1},
                {q:'What is labeling bias?',o:['Using labels on products','Using loaded language to describe people or groups','Putting labels on newspapers','Not using any labels'],a:1},
                {q:'What is one recommended strategy for critical reading?',o:['Only read one source','Read from multiple sources with different perspectives','Trust everything you read','Skip the news entirely'],a:1},
                {q:'What is the author\'s point about "unbiased" sources?',o:['They are easy to find','All reporting has biases; understand them rather than seeking perfect neutrality','Bias doesn\'t exist','Only certain countries have biased media'],a:1}
            ]},
            {t:'The Ethics of Artificial Intelligence', p:'Artificial intelligence is rapidly changing our world, from self-driving cars to medical diagnosis to content creation. But with great power comes great responsibility. AI systems can reflect and amplify human biases if they are trained on biased data. For example, facial recognition systems have been shown to be less accurate for people with darker skin tones because they were trained mostly on lighter-skinned faces. There are also concerns about privacy — AI systems can process vast amounts of personal data. Job displacement is another concern, as AI automation may replace certain types of work. On the positive side, AI can help solve major challenges: detecting diseases earlier, optimizing energy use, and personalizing education. The key question is not whether to develop AI, but how to develop it responsibly — with transparency, fairness, and human oversight built into the systems from the start.', qs:[
                {q:'Why might facial recognition be less accurate for darker skin tones?',o:['The technology cannot see dark colors','The training data had mostly lighter-skinned faces','Darker skin reflects less light','It\'s an unsolvable problem'],a:1},
                {q:'What is one ethical concern about AI mentioned in the passage?',o:['AI is too slow','Privacy concerns','AI cannot do anything useful','AI is too expensive'],a:1},
                {q:'What is one positive application of AI?',o:['Replacing all human workers','Detecting diseases earlier','Eliminating all technology','Making everyone unemployed'],a:1},
                {q:'What is the author\'s central argument?',o:['AI should be stopped entirely','AI should be developed responsibly with fairness and oversight','AI has no risks','Only governments should use AI'],a:1}
            ]}
        ],
        // Grade 9 (ages 13-14): academic English
        9: [
            {t:'The Scientific Method', p:'The scientific method is the foundation of modern science — a systematic process for investigating phenomena, acquiring new knowledge, and correcting previous understanding. The method typically proceeds through several stages: (1) Observation — noticing a pattern or phenomenon; (2) Question — formulating a specific question about the observation; (3) Hypothesis — proposing a testable explanation; (4) Experiment — designing and conducting controlled tests; (5) Analysis — examining the data to determine whether it supports the hypothesis; and (6) Conclusion — accepting, rejecting, or modifying the hypothesis based on the evidence. A crucial feature of the scientific method is falsifiability — a hypothesis must be structured so that it can potentially be proven wrong. If a claim cannot be tested or potentially disproven, it falls outside the realm of science. Peer review, where other scientists critically examine research before publication, adds an additional layer of quality control. The scientific method does not guarantee truth, but it is the most reliable method humans have developed for understanding the natural world.', qs:[
                {q:'What is falsifiability?',o:['When a hypothesis is false','The requirement that a hypothesis can potentially be proven wrong','When an experiment fails','The last step of the method'],a:1},
                {q:'What happens during the analysis stage?',o:['Forming a question','Making observations','Examining data to see if it supports the hypothesis','Publishing results'],a:2},
                {q:'What is peer review?',o:['Asking friends for advice','Other scientists critically examining research before publication','Reviewing your own work','Checking for spelling errors'],a:1},
                {q:'What is the author\'s tone in the final sentence?',o:['Arrogant','Humble and balanced — acknowledging limitations while affirming value','Dismissive','Angry about science'],a:1}
            ]},
            {t:'Macbeth: Ambition and Guilt', p:'Shakespeare\'s "Macbeth" explores the destructive power of unchecked ambition. The play begins with Macbeth, a brave Scottish general, receiving a prophecy from three witches that he will become king. Driven by ambition and urged by his wife Lady Macbeth, he murders King Duncan and seizes the throne. However, the crown brings no peace — guilt consumes both Macbeth and his wife. Lady Macbeth, who initially seemed ruthless, descends into madness, obsessively trying to wash imaginary blood from her hands while crying "Out, damned spot!" Macbeth becomes increasingly paranoid, ordering more murders to secure his position. The play suggests that ambition, when divorced from morality, leads not to fulfillment but to destruction. By the end, Macbeth has lost everything — his wife, his honor, and finally his life. The tragedy serves as a warning about the corrupting influence of power pursued without ethical constraints.', qs:[
                {q:'What prophecy do the witches give Macbeth?',o:['He will die soon','He will become king','He will lose his fortune','He will find true love'],a:1},
                {q:'What does Lady Macbeth\'s hand-washing symbolize?',o:['She is very clean','Her overwhelming guilt that cannot be washed away','She is preparing food','She is nervous about a party'],a:1},
                {q:'What is the central theme of the play?',o:['Love conquers all','The destructive power of unchecked ambition','War is necessary','Friendship is important'],a:1},
                {q:'What happens to Macbeth by the end of the play?',o:['He becomes a good king','He loses everything including his life','He apologizes and steps down','He defeats all his enemies'],a:1}
            ]}
        ],
        // Grade 10 (ages 14-15): literary devices, poetry
        10: [
            {t:'Poetic Devices: Analysis', p:'Poetry uses language in concentrated and deliberate ways to create meaning, emotion, and beauty. Several key devices help poets achieve these effects. Imagery creates sensory experiences through vivid description — "the crimson sun sank beneath sequined waves" appeals to sight. Metaphor makes direct comparisons — "life is a roller coaster" — while simile uses "like" or "as" — "she swam like a fish." Alliteration repeats initial consonant sounds ("wild winds whipped"), creating rhythm and emphasis. Enjambment occurs when a line runs into the next without punctuation, creating momentum and sometimes surprise when the meaning changes across the line break. Understanding these devices helps readers appreciate not just what a poem says, but how it says it — the craftsmanship behind the art.', qs:[
                {q:'What is the difference between a metaphor and a simile?',o:['There is no difference','A simile uses "like" or "as"; a metaphor makes a direct comparison','Metaphors are longer','Similes are only used in songs'],a:1},
                {q:'What is alliteration?',o:['Words that rhyme','Repetition of initial consonant sounds','The end of a sentence','A type of metaphor'],a:1},
                {q:'What effect does enjambment create?',o:['It slows down the poem','Momentum and sometimes surprise across line breaks','It makes the poem rhyme','It ends the poem'],a:1},
                {q:'Why is analyzing poetic devices important?',o:['To count syllables','To appreciate the craftsmanship and how meaning is created','To make poetry harder to understand','To memorize poems'],a:1}
            ]},
            {t:'The Cold War: A Conflict of Ideologies', p:'The Cold War (1947-1991) was a period of geopolitical tension between the United States and the Soviet Union, representing two opposing ideologies: capitalism and communism. Unlike traditional wars, the Cold War was fought not primarily with armies but through proxy wars, nuclear arms races, space competition, espionage, and propaganda. The world was essentially divided into two spheres of influence. The Truman Doctrine and the Marshall Plan represented American efforts to contain the spread of communism, while the Soviets established the Warsaw Pact and supported communist movements worldwide. Key flashpoints included the Berlin Blockade (1948-49), the Korean War (1950-53), the Cuban Missile Crisis (1962), and the Vietnam War (1955-75). The Space Race saw both superpowers competing for technological supremacy, culminating in the American moon landing in 1969. The Cold War ended with the fall of the Berlin Wall in 1989 and the dissolution of the Soviet Union in 1991.', qs:[
                {q:'What two ideologies were in conflict during the Cold War?',o:['Democracy and monarchy','Capitalism and communism','Socialism and feudalism','Fascism and anarchism'],a:1},
                {q:'How was the Cold War primarily fought?',o:['Direct battles between the US and USSR','Through proxy wars, arms races, and propaganda','Only through economic competition','Through diplomatic negotiations only'],a:1},
                {q:'What was the purpose of the Marshall Plan?',o:['To start the Korean War','To contain the spread of communism through economic aid','To build nuclear weapons','To explore space'],a:1},
                {q:'What events marked the end of the Cold War?',o:['The Korean War ending','The moon landing','The fall of the Berlin Wall and dissolution of the Soviet Union','The Vietnam War ending'],a:2}
            ]}
        ],
        // Grade 11 (ages 15-16): complex arguments, SAT prep
        11: [
            {t:'The Federalist Papers: Argument Analysis', p:'The Federalist Papers, written by Alexander Hamilton, James Madison, and John Jay between 1787 and 1788, comprise 85 essays advocating for the ratification of the United States Constitution. In Federalist No. 10, Madison addresses one of the most pressing concerns of the era: the danger of factions. He defines a faction as "a number of citizens, whether amounting to a majority or a minority of the whole, who are united by some common impulse of passion, or of interest, adverse to the rights of other citizens, or to the permanent and aggregate interests of the community." Madison argues that a large republic is actually better equipped to control factions than a small democracy because, in a large republic, diverse interests compete against each other, making it harder for any single faction to dominate. This was a sophisticated counterargument to the prevailing view that republics could only work in small, homogeneous societies.', qs:[
                {q:'Who wrote the Federalist Papers?',o:['Thomas Jefferson','Hamilton, Madison, and Jay','George Washington','Benjamin Franklin'],a:1},
                {q:'How does Madison define a faction?',o:['A political party','Citizens united by passion or interest adverse to others\' rights','A group of soldiers','A committee of experts'],a:1},
                {q:'What was Madison\'s counterintuitive argument?',o:['Small republics are better','Large republics control factions better because diverse interests compete','Factions should be banned','Only one political party should exist'],a:1},
                {q:'What rhetorical strategy does Madison use?',o:['He only appeals to emotion','He defines terms precisely and builds a logical counterargument','He ignores opposing views','He threatens his opponents'],a:1}
            ]},
            {t:'CRISPR: The Future of Genetic Engineering', p:'CRISPR-Cas9 is a revolutionary gene-editing technology that allows scientists to modify DNA with unprecedented precision, efficiency, and affordability. Originally discovered as a bacterial immune system, CRISPR works like molecular scissors — it can cut DNA at specific locations, allowing genes to be removed, added, or altered. The potential applications are staggering: correcting genetic diseases like sickle cell anemia, creating drought-resistant crops, and even engineering mosquitoes that cannot transmit malaria. However, CRISPR also raises profound ethical questions. Should we edit human embryos? Where is the line between treating disease and enhancement? Could gene editing exacerbate social inequality if only the wealthy can access it? The scientific community has called for caution, establishing guidelines that currently prohibit heritable human genome editing. As with many powerful technologies, CRISPR\'s ultimate impact depends not just on what it can do, but on the wisdom with which humanity chooses to use it.', qs:[
                {q:'What is CRISPR-Cas9?',o:['A disease','A gene-editing technology','A type of bacteria','A computer program'],a:1},
                {q:'What is one potential medical application?',o:['Making people taller','Correcting genetic diseases like sickle cell anemia','Creating new species','Eliminating all diseases'],a:1},
                {q:'What ethical concern does the passage raise?',o:['CRISPR is too slow','CRISPR might exacerbate social inequality','CRISPR cannot edit human DNA','CRISPR is too expensive to ever use'],a:1},
                {q:'What is the tone of the final sentence?',o:['Pessimistic','Cautiously optimistic — power depends on wisdom of use','Dismissive','Fearful'],a:1}
            ]}
        ],
        // Grade 12 (ages 16-17): college prep
        12: [
            {t:'Postcolonial Literature: Theory and Context', p:'Postcolonial literature examines the cultural, political, and psychological effects of colonialism on both colonized and colonizing societies. Emerging as a distinct field after World War II as former colonies gained independence, postcolonial theory challenges the narratives imposed by imperial powers and recovers voices that were marginalized or silenced. Key theorists include Edward Said, whose work "Orientalism" (1978) demonstrated how Western scholarship constructed a distorted image of "the East" as exotic, backward, and in need of Western guidance. Frantz Fanon examined the psychological damage of colonialism on the colonized, particularly the internalization of inferiority. Chinua Achebe\'s novel "Things Fall Apart" (1958) is considered a foundational text — it tells the story of Igbo society in Nigeria before and during European colonization from an African perspective, directly challenging the colonial narrative. Postcolonial literature does not simply "write back" to the empire; it fundamentally questions who has the authority to tell stories and whose stories are considered universal.', qs:[
                {q:'What is postcolonial literature concerned with?',o:['Only European history','The effects of colonialism on societies and recovering marginalized voices','Modern technology','Science fiction'],a:1},
                {q:'What did Edward Said\'s "Orientalism" argue?',o:['The East should be studied more','Western scholarship constructed a distorted image of "the East"','Colonialism was beneficial','Eastern scholars should learn from the West'],a:1},
                {q:'Why is "Things Fall Apart" considered a foundational text?',o:['It is the longest novel','It tells the story from an African perspective, challenging colonial narratives','It was the first novel ever written','It supports colonization'],a:1},
                {q:'What fundamental question does postcolonial literature raise?',o:['How to write better','Who has authority to tell stories and whose stories are considered universal','What is the best language for writing','How long should a novel be'],a:1}
            ]},
            {t:'Quantum Computing: A Paradigm Shift', p:'Classical computers process information in bits — each bit is either 0 or 1. Quantum computers use quantum bits, or qubits, which can exist in multiple states simultaneously thanks to the principles of superposition and entanglement. This allows quantum computers to solve certain problems exponentially faster than classical computers. For example, factoring large numbers — the basis of most current encryption — could be done in minutes on a quantum computer versus billions of years on a classical one. This has profound implications for cybersecurity. Quantum computing could also revolutionize drug discovery by simulating molecular interactions that are too complex for classical computers, accelerate materials science, and optimize complex logistics networks. However, building practical quantum computers faces enormous engineering challenges — qubits are extremely fragile and must be kept at temperatures near absolute zero. Despite these challenges, major technology companies and governments are investing billions in quantum research, recognizing that quantum supremacy will reshape the technological landscape.', qs:[
                {q:'How do qubits differ from classical bits?',o:['They are larger','They can exist in multiple states simultaneously','They are slower','They can only be 0'],a:1},
                {q:'What makes current encryption vulnerable to quantum computing?',o:['Quantum computers are faster at everything','Quantum computers can factor large numbers exponentially faster','Encryption has no defenses','Quantum computers can guess passwords'],a:1},
                {q:'What is one major engineering challenge?',o:['Qubits are too cheap','Qubits are extremely fragile and need near-absolute-zero temperatures','No one wants to build quantum computers','There are no applications'],a:1},
                {q:'What is the author\'s overall assessment of quantum computing?',o:['It is impossible','It has revolutionary potential but faces significant challenges','It will never work','It is already obsolete'],a:1}
            ]}
        ]
    };

    // Game templates for each level
    for (const def of levelDefs) {
        const lvl = def.id;
        const games = [];

        // Comprehension passages (5-7 per level)
        const lvlPassages = passages[lvl] || passages[4];
        for (const p of lvlPassages) {
            games.push({
                type: 'comprehension',
                title: p.t,
                passage: p.p,
                questions: p.qs.map(q => ({
                    q: q.q,
                    opts: q.o,
                    ans: q.a
                }))
            });
        }

        // Spelling (3 words per game × 2 games)
        const spellingSets = {
            4: [['necessary','separate','definitely'],['calendar','accidentally','library']],
            5: [['environment','government','temperature'],['February','Wednesday','restaurant']],
            6: [['immediately','independent','knowledge'],['rhythm','embarrass','accommodate']],
            7: [['conscious','controversy','exaggerate'],['pronunciation','questionnaire','recommend']],
            8: [['bureaucracy','phenomenon','sophisticated'],['conscientious','idiosyncrasy','mischievous']],
            9: [['accommodate','bureaucratic','conscientious'],['idiosyncratic','perseverance','unprecedented']],
            10:[['anachronistic','idiosyncratic','paradigmatic'],['quintessential','surreptitious','ubiquitous']],
            11:[['ameliorate','concomitant','ephemeral'],['magnanimous','perspicacious','recalcitrant']],
            12:[['antediluvian','circumlocution','incontrovertible'],['sesquipedalian','verisimilitude','zeugma']]
        }[lvl] || [['challenge','important','continue'],['favorite','special','wonder']];

        const spellingHints = {
            'necessary':'Essential, required','separate':'To divide or keep apart','definitely':'Without doubt',
            'calendar':'Shows days and months','accidentally':'By mistake, not on purpose','library':'A place with many books',
            'environment':'The natural world around us','government':'The group that governs a country','temperature':'How hot or cold something is',
            'February':'The second month','Wednesday':'The middle of the week','restaurant':'A place where you eat out',
            'immediately':'Right away, without delay','independent':'Free, not controlled by others','knowledge':'What you know',
            'rhythm':'A pattern of beats','embarrass':'To make someone feel ashamed','accommodate':'To provide space or adjust',
            'conscious':'Aware, awake','controversy':'A public disagreement','exaggerate':'To make something seem bigger than it is',
            'pronunciation':'How a word is said','questionnaire':'A set of written questions','recommend':'To suggest as good',
            'bureaucracy':'A system of government with many rules','phenomenon':'An observable fact or event','sophisticated':'Complex, refined',
            'conscientious':'Careful and thorough','idiosyncrasy':'A peculiar habit','mischievous':'Playfully naughty',
            'anachronistic':'Out of its proper time period','paradigmatic':'Serving as a typical example','quintessential':'The most perfect example',
            'surreptitious':'Done secretly','ubiquitous':'Found everywhere','ameliorate':'To make better',
            'concomitant':'Happening at the same time','ephemeral':'Lasting a very short time','magnanimous':'Very generous',
            'perspicacious':'Having keen insight','recalcitrant':'Stubbornly uncooperative','antediluvian':'Extremely old',
            'circumlocution':'Talking around a subject','incontrovertible':'Impossible to dispute','sesquipedalian':'Using long words',
            'verisimilitude':'The appearance of being true','zeugma':'A figure of speech using one word in two ways',
            'challenge':'A difficult task','important':'Having great significance','continue':'To keep going',
            'favorite':'Liked the most','special':'Better than ordinary','wonder':'To think about with curiosity'
        };

        for (let i = 0; i < Math.min(spellingSets.length, 2); i++) {
            const words = spellingSets[i].map(w => ({
                word: w,
                hint: spellingHints[w] || 'A word to practice'
            }));
            games.push({ type: 'spelling', title: `Spelling Challenge ${i+1}`, words });
        }

        // Vocabulary
        const vocabSets = {
            4: [{word:'Abundant',m:'More than enough'},{word:'Fragile',m:'Easily broken'},{word:'Genuine',m:'Real, authentic'},{word:'Hostile',m:'Unfriendly, aggressive'}],
            5: [{word:'Beneficial',m:'Helpful, good for you'},{word:'Drastic',m:'Extreme, severe'},{word:'Elaborate',m:'Detailed and complicated'},{word:'Frugal',m:'Careful with money'}],
            6: [{word:'Ambiguous',m:'Having more than one meaning'},{word:'Comprehensive',m:'Thorough, including everything'},{word:'Diligent',m:'Hardworking and careful'},{word:'Eloquent',m:'Fluent and persuasive in speech'}],
            7: [{word:'Benevolent',m:'Kind and generous'},{word:'Candid',m:'Honest, straightforward'},{word:'Dubious',m:'Doubtful, questionable'},{word:'Exemplary',m:'Serving as an excellent example'}],
            8: [{word:'Alleviate',m:'To make pain or suffering less'},{word:'Brevity',m:'Shortness, conciseness'},{word:'Copious',m:'Plentiful, abundant'},{word:'Deleterious',m:'Harmful, damaging'}],
            9: [{word:'Acrimonious',m:'Bitter, angry in tone'},{word:'Bellicose',m:'Aggressive, warlike'},{word:'Capitulate',m:'To surrender, give in'},{word:'Dearth',m:'A scarcity, lack of something'}],
            10:[{word:'Anachronism',m:'Something out of its proper time'},{word:'Cacophony',m:'A harsh mixture of sounds'},{word:'Ephemeral',m:'Short-lived, fleeting'},{word:'Iconoclast',m:'One who challenges traditions'}],
            11:[{word:'Ameliorate',m:'To improve, make better'},{word:'Conflagration',m:'A large destructive fire'},{word:'Enervate',m:'To weaken, drain of energy'},{word:'Gregarious',m:'Sociable, enjoying company'}],
            12:[{word:'Apocryphal',m:'Of doubtful authenticity'},{word:'Concomitant',m:'Occurring at the same time'},{word:'Esoteric',m:'Understood by only a few'},{word:'Pernicious',m:'Having a harmful effect, subtle but deadly'}]
        }[lvl] || [{word:'Analyze',m:'To examine in detail'},{word:'Comprehend',m:'To understand fully'},{word:'Evaluate',m:'To judge the value of'},{word:'Synthesize',m:'To combine into a whole'}];

        games.push({ type: 'vocabulary', title: 'Vocabulary Builder', pairs: vocabSets });

        // Grammar
        const grammarSets = {
            4: {t:'Subject-Verb Agreement', s:[
                {s:'The team ___ (play/plays) well together.',o:['play','plays'],a:1,b:'___'},
                {s:'Each of the students ___ (has/have) a book.',o:['has','have'],a:0,b:'___'},
                {s:'Neither the cat nor the dog ___ (is/are) outside.',o:['is','are'],a:0,b:'___'},
                {s:'The list of items ___ (is/are) on the desk.',o:['is','are'],a:0,b:'___'}
            ]},
            5: {t:'Pronoun-Antecedent Agreement', s:[
                {s:'Everyone should bring ___ (their/his or her) own lunch.',o:['their','his or her'],a:1,b:'___'},
                {s:'The company announced ___ (its/their) new policy.',o:['its','their'],a:0,b:'___'},
                {s:'Neither of the boys finished ___ (his/their) homework.',o:['his','their'],a:0,b:'___'},
                {s:'The jury reached ___ (its/their) verdict.',o:['its','their'],a:0,b:'___'}
            ]},
            6: {t:'Active vs Passive Voice', s:[
                {s:'The cake ___ (was baked/baked) by my grandmother.',o:['was baked','baked'],a:0,b:'___(bake)'},
                {s:'The scientist ___ (discovered/was discovered) a new element.',o:['discovered','was discovered'],a:0,b:'___(discover)'},
                {s:'Mistakes ___ (were made/made) during the experiment.',o:['were made','made'],a:0,b:'___(make)'},
                {s:'Shakespeare ___ (wrote/was written) many famous plays.',o:['wrote','was written'],a:0,b:'___(write)'}
            ]},
            7: {t:'Subjunctive Mood', s:[
                {s:'If I ___ (was/were) you, I would study more.',o:['was','were'],a:1,b:'___'},
                {s:'The teacher insists that he ___ (arrives/arrive) on time.',o:['arrives','arrive'],a:1,b:'___'},
                {s:'I wish it ___ (was/were) warmer outside.',o:['was','were'],a:1,b:'___'},
                {s:'She demanded that the document ___ (is/be) signed.',o:['is','be'],a:1,b:'___'}
            ]},
            8: {t:'Parallel Structure', s:[
                {s:'She likes swimming, running, and ___ (to bike/biking).',o:['to bike','biking'],a:1,b:'___'},
                {s:'The job requires punctuality, dedication, and ___ (to work hard/working hard).',o:['to work hard','working hard'],a:1,b:'___'},
                {s:'He is not only smart ___ (and/but also) kind.',o:['and','but also'],a:1,b:'___'},
                {s:'We need to analyze the data ___ (carefully/thoroughly) and present findings.',o:['carefully','thoroughly'],a:1,b:'___'}
            ]}
        };

        const gram = grammarSets[lvl] || grammarSets[4];
        games.push({ type: 'grammar', title: gram.t || 'Grammar Practice', sentences: gram.s });

        // Word Search
        const wsSets = {
            4: {grid:[['D','A','N','G','E','R'],['F','R','A','G','I','L'],['G','E','N','U','I','N'],['H','O','S','T','I','L'],['A','B','U','N','D','A'],['S','E','C','R','E','T']],w:['DANGER','FRAGIL','GENUIN','HOSTIL','ABUNDA','SECRET'],s:6},
            5: {grid:[['B','E','N','E','F','I','T'],['D','R','A','S','T','I','C'],['E','L','A','B','O','R'],['F','R','U','G','A','L'],['S','T','E','A','D','Y'],['P','R','O','P','E','R']],w:['BENEFIT','DRASTIC','ELABOR','FRUGAL','STEADY','PROPER'],s:7},
            6: {grid:[['A','M','B','I','G','U','O'],['C','O','M','P','R','E','H'],['D','I','L','I','G','E','N'],['E','L','O','Q','U','E','N'],['T','H','O','R','O','U','G'],['F','L','U','E','N','T','S']],w:['AMBIGUO','COMPREH','DILIGEN','ELOQUEN','THOROUG','FLUENTS'],s:7},
            7: {grid:[['B','E','N','E','V','O','L'],['C','A','N','D','I','D','A'],['D','U','B','I','O','U','S'],['E','X','E','M','P','L','A'],['H','O','N','E','S','T','Y'],['K','I','N','D','N','E','S']],w:['BENEVOL','CANDIDA','DUBIOUS','EXEMPLA','HONESTY','KINDNES'],s:7},
            8: {grid:[['A','L','L','E','V','I','A'],['B','R','E','V','I','T','Y'],['C','O','P','I','O','U','S'],['D','E','L','E','T','E','R'],['H','A','R','M','F','U','L'],['P','L','E','N','T','I','F']],w:['ALLEVIA','BREVITY','COPIOUS','DELETER','HARMFUL','PLENTIF'],s:7}
        }[lvl] || {grid:[['W','O','R','D','X','X','X'],['S','E','A','R','C','H','X'],['L','E','A','R','N','X','X'],['P','R','A','C','T','I','C'],['S','T','U','D','Y','X','X'],['E','N','G','L','I','S','H'],['X','X','X','X','X','X','X']],w:['WORD','SEARCH','LEARN','PRACTIC','STUDY','ENGLISH'],s:7};

        games.push({ type: 'wordsearch', title: 'Word Search', grid: wsSets.grid || wsSets, words: wsSets.w || wsSets.words, size: wsSets.s || wsSets.size });

        // Matching
        const matchSets = {
            4: {l:[{id:'a',t:'Democracy'},{id:'b',t:'Monarchy'},{id:'c',t:'Oligarchy'},{id:'d',t:'Anarchy'}],r:[{id:'1',t:'Rule by a few'},{id:'2',t:'Rule by the people'},{id:'3',t:'No government'},{id:'4',t:'Rule by a king or queen'}],p:[['a','2'],['b','4'],['c','1'],['d','3']]},
            5: {l:[{id:'a',t:'Simile'},{id:'b',t:'Metaphor'},{id:'c',t:'Personification'},{id:'d',t:'Hyperbole'}],r:[{id:'1',t:'Direct comparison without like/as'},{id:'2',t:'Giving human traits to non-human'},{id:'3',t:'Extreme exaggeration'},{id:'4',t:'Comparison using like or as'}],p:[['a','4'],['b','1'],['c','2'],['d','3']]},
            6: {l:[{id:'a',t:'Photosynthesis'},{id:'b',t:'Respiration'},{id:'c',t:'Mitosis'},{id:'d',t:'Osmosis'}],r:[{id:'1',t:'Cell division'},{id:'2',t:'Movement of water through membrane'},{id:'3',t:'Plants convert sunlight to energy'},{id:'4',t:'Cells release energy from food'}],p:[['a','3'],['b','4'],['c','1'],['d','2']]}
        }[lvl] || {l:[{id:'a',t:'Noun'},{id:'b',t:'Verb'},{id:'c',t:'Adjective'},{id:'d',t:'Adverb'}],r:[{id:'1',t:'Describes how an action is done'},{id:'2',t:'Person, place, or thing'},{id:'3',t:'Describes a noun'},{id:'4',t:'An action word'}],p:[['a','2'],['b','4'],['c','3'],['d','1']]};

        games.push({ type: 'matching', title: 'Match the Concepts', left: matchSets.l, right: matchSets.r, pairs: matchSets.p });

        // Fill in blank
        const fibSets = {
            4: {t:'A Healthy Lifestyle',tx:'A ___ lifestyle includes eating ___ foods, getting enough ___ , and exercising ___ .',b:[
                {pos:0,o:['healthy','unhealthy','lazy','busy'],ans:0},{pos:1,o:['nutritious','junk','fast','processed'],ans:0},{pos:2,o:['sleep','stress','work','screen time'],ans:0},{pos:3,o:['regularly','rarely','never','sometimes'],ans:0}
            ]},
            5: {t:'The Writing Process',tx:'Good writing follows a ___ : first, ___ your ideas; next, write a ___ ; then revise and ___ .',b:[
                {pos:0,o:['process','random order','mess','single step'],ans:0},{pos:1,o:['brainstorm','forget','hide','delete'],ans:0},{pos:2,o:['draft','final','title','letter'],ans:0},{pos:3,o:['edit','reject','ignore','destroy'],ans:0}
            ]},
            6: {t:'Critical Thinking',tx:'To think ___ , you must ___ evidence, consider multiple ___ , and form ___ conclusions.',b:[
                {pos:0,o:['critically','uncritically','lazily','quickly'],ans:0},{pos:1,o:['evaluate','ignore','dismiss','forget'],ans:0},{pos:2,o:['perspectives','answers','numbers','colors'],ans:0},{pos:3,o:['reasoned','random','biased','hurried'],ans:0}
            ]}
        }[lvl] || {t:'Learning English',tx:'Learning English requires ___ practice and ___ . You should read ___ materials and speak ___ .',b:[
            {pos:0,o:['regular','sporadic','no','minimal'],ans:0},{pos:1,o:['patience','anger','speed','luck'],ans:0},{pos:2,o:['diverse','only easy','limited','one type of'],ans:0},{pos:3,o:['confidently','timidly','rarely','never'],ans:0}
        ]};

        games.push({ type: 'fillblank', title: fibSets.t, text: fibSets.tx, blanks: fibSets.b });

        // Sentence ordering
        const ordSets = {
            4: {s:'The curious scientist carefully examined the mysterious specimen.', w:['examined','specimen','The','carefully','curious','mysterious','scientist']},
            5: {s:'Despite the heavy rain, the dedicated team completed the project on time.', w:['completed','Despite','project','dedicated','rain','the','on','time','heavy','team']},
            6: {s:'Understanding complex ideas requires patience, practice, and an open mind.', w:['and','practice','mind','complex','Understanding','ideas','requires','an','patience','open']}
        }[lvl] || {s:'The diligent student carefully prepared for the important examination.', w:['student','prepared','the','for','The','diligent','examination','important','carefully']};

        games.push({ type: 'ordering', title: 'Scrambled Sentence', sentence: ordSets.s, words: ordSets.w });

        // Fill remaining slots with additional comprehension passages
        // Pad to ~20 games
        while (games.length < 20) {
            const extraPassage = lvlPassages[games.length % lvlPassages.length];
            if (extraPassage) {
                games.push({
                    type: 'comprehension',
                    title: extraPassage.t + ' (Review)',
                    passage: extraPassage.p,
                    questions: extraPassage.qs.map(q => ({
                        q: q.q,
                        opts: q.o,
                        ans: q.a
                    }))
                });
            } else {
                // Grammar filler
                games.push({
                    type: 'grammar',
                    title: 'Grammar Review',
                    sentences: [
                        {sentence:'The results of the experiment ___ (is/are) surprising.', opts:['is','are'], ans:1, blank:'___'},
                        {sentence:'She ___ (has/have) been studying for three hours.', opts:['has','have'], ans:0, blank:'___'},
                        {sentence:'If he ___ (was/were) here, he would help.', opts:['was','were'], ans:1, blank:'___'},
                        {sentence:'The data ___ (show/shows) a clear trend.', opts:['show','shows'], ans:1, blank:'___'}
                    ]
                });
            }
        }

        // Trim to exactly 20
        L.push({
            id: def.id,
            name: def.name,
            ageRange: def.age,
            description: def.desc,
            games: games.slice(0, 20)
        });
    }
})();

// ─── GAME ENGINE ─────────────────────────────────────────────
const MTL = {
    progress: {},
    currentLevel: null,
    currentGameIndex: null,
    gameState: {},
    starsEarned: 0,
    studentId: null,
    studentName: '',
    saveCode: '',

    init() {
        this.loadA11ySettings();
        const session = loadSession();
        if (session.studentId) {
            this.studentId = session.studentId;
            this.studentName = session.studentName || '';
            this.saveCode = session.saveCode || '';
            this.loadFromServer();
        } else {
            this.showLogin();
        }
    },

    async loadFromServer() {
        try {
            const data = await API.loadProgress(this.studentId);
            this.progress = data.progress || {};
        } catch (e) {
            console.warn('Loading from server failed, using empty progress:', e.message);
            this.progress = {};
        }
        this.renderDashboard();
        this.showView('mtl-dashboard');
    },

    // ─── Login / Create Student ──────────────────────────
    showLogin() {
        this.showView('mtl-login');
    },

    async createStudent(name) {
        try {
            const data = await API.createStudent(name);
            this.studentId = data.id;
            this.studentName = data.name;
            this.saveCode = data.save_code;
            this.progress = {};
            saveSession({ studentId: data.id, studentName: data.name, saveCode: data.save_code });
            this.renderDashboard();
            this.showView('mtl-dashboard');
        } catch (e) {
            alert('建立失敗：' + e.message);
        }
    },

    async loginByCode(code) {
        try {
            const data = await API.lookupStudent(code);
            const s = data.student;
            this.studentId = s.id;
            this.studentName = s.name;
            this.saveCode = s.save_code;
            saveSession({ studentId: s.id, studentName: s.name, saveCode: s.save_code });
            await this.loadFromServer();
        } catch (e) {
            alert('登入失敗：' + e.message);
        }
    },

    logout() {
        this.studentId = null;
        this.studentName = '';
        this.saveCode = '';
        this.progress = {};
        localStorage.removeItem(STORAGE_KEY);
        this.showLogin();
    },

    // ─── Student Info Bar ─────────────────────────────────
    renderStudentBar() {
        if (!this.studentId) return '';
        return '<div class="mtl-student-bar"><span>👤 ' + this.escapeH(this.studentName) +
            '</span><span class="mtl-savecode">🔑 Save Code: <strong>' + this.escapeH(this.saveCode) + '</strong></span>' +
            '<button class="mtl-logout-btn" onclick="MTL.logout()">切換學生</button></div>';
    },
    escapeH(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },

    // ─── Accessibility ───────────────────────────────────
    toggleDyslexiaFont() {
        document.body.classList.toggle('mtl-dyslexia');
        const btn = document.getElementById('a11yFont');
        const on = document.body.classList.contains('mtl-dyslexia');
        btn.style.background = on ? 'var(--mtl-gold)' : '';
        btn.style.color = on ? '#fff' : '';
        localStorage.setItem('mtl_a11y_font', on ? '1' : '0');
    },
    changeTextSize(dir) {
        const html = document.documentElement;
        let sz = parseInt(html.style.fontSize || '16');
        sz = Math.max(12, Math.min(24, sz + dir * 1));
        html.style.fontSize = sz + 'px';
        localStorage.setItem('mtl_a11y_size', sz);
    },
    toggleContrast() {
        document.body.classList.toggle('mtl-high-contrast');
        const btn = document.getElementById('a11yContrast');
        const on = document.body.classList.contains('mtl-high-contrast');
        btn.style.background = on ? '#000' : '';
        btn.style.color = on ? '#ff0' : '';
        localStorage.setItem('mtl_a11y_contrast', on ? '1' : '0');
    },
    loadA11ySettings() {
        if (localStorage.getItem('mtl_a11y_font') === '1') this.toggleDyslexiaFont();
        const sz = localStorage.getItem('mtl_a11y_size');
        if (sz) document.documentElement.style.fontSize = sz + 'px';
        if (localStorage.getItem('mtl_a11y_contrast') === '1') this.toggleContrast();
    },

    // ─── Certificate ─────────────────────────────────────
    async printCertificate(levelId) {
        const level = MTL_CONTENT.levels[levelId - 1];
        const name = this.studentName || 'Student';
        const w = window.open('', '_blank', 'width=800,height=600');
        w.document.write(`<!DOCTYPE html><html><head><title>Certificate</title><style>
            body{text-align:center;font-family:Georgia,serif;padding:40px;}
            .cert{border:8px double #d4a843;padding:40px;max-width:700px;margin:0 auto;}
            h1{font-size:2rem;color:#2c3e50;margin-bottom:8px;}
            .name{font-size:2.5rem;color:#d4a843;margin:20px 0;font-weight:700;}
            .detail{font-size:1.1rem;color:#555;margin:8px 0;}
            .date{margin-top:30px;color:#888;}
            .stars{font-size:2rem;margin:16px 0;}
            @media print{body{margin:0;padding:20px;}.cert{border-width:4px;}}</style></head><body>
            <div class="cert"><h1>🏆 Level Complete!</h1><div class="stars">⭐⭐⭐</div>
            <p class="detail">This certifies that</p><div class="name">${name}</div>
            <p class="detail">has successfully completed</p>
            <p class="detail" style="font-size:1.5rem;font-weight:700;">${level.name}</p>
            <p class="detail">Ages ${level.ageRange} · Play and Learn English</p>
            <p class="date">${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
            <p style="margin-top:20px;color:#888;font-size:0.8rem;">IBCB Investment · Play and Learn</p></div>
            <p style="margin-top:20px;"><button onclick="window.print()" style="padding:10px 24px;font-size:1rem;cursor:pointer;">🖨️ Print Certificate</button></p>
            </body></html>`);
        w.document.close();
    },

    // ─── Speech Recognition for Spelling ─────────────────
    startSpeechSpelling(inputId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert('Speech recognition not supported in this browser. Try Chrome.'); return; }
        const recog = new SpeechRecognition();
        recog.lang = 'en-US';
        recog.interimResults = false;
        recog.maxAlternatives = 1;
        recog.onresult = (event) => {
            const word = event.results[0][0].transcript.trim().toLowerCase();
            const input = document.getElementById(inputId);
            if (input) { input.value = word; input.dispatchEvent(new Event('input')); }
        };
        recog.onerror = () => { /* silent */ };
        recog.start();
    },

    speakPassage(btn) {
        const textEl = btn.parentElement.querySelector('.mtl-passage-text');
        if (!textEl || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textEl.textContent);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        btn.textContent = '🔊 Reading...';
        btn.disabled = true;
        utterance.onend = () => { btn.textContent = '🔊 Read Aloud'; btn.disabled = false; };
        utterance.onerror = () => { btn.textContent = '🔊 Read Aloud'; btn.disabled = false; };
        window.speechSynthesis.speak(utterance);
    },

    switchLoginTab(tab) {
        document.getElementById('loginNew').style.display = tab === 'new' ? '' : 'none';
        document.getElementById('loginExisting').style.display = tab === 'existing' ? '' : 'none';
        document.getElementById('tabNew').classList.toggle('active', tab === 'new');
        document.getElementById('tabExisting').classList.toggle('active', tab === 'existing');
    },

    // ─── Placement Quiz ─────────────────────────────────
    quizQuestions: [
        // Grade 1-2 band
        {passage:'', q:'What color is the sky on a sunny day?', opts:['Green','Blue','Red','Yellow'], ans:1, grade:1},
        {passage:'', q:'How many legs does a cat have?', opts:['Two','Three','Four','Six'], ans:2, grade:1},
        // Grade 3-4 band
        {passage:'The sun is a big star. It gives us light and heat. Without the sun, Earth would be very cold and dark.', q:'What does the sun give us?', opts:['Only light','Light and heat','Only heat','Water and air'], ans:1, grade:3},
        {passage:'', q:'Choose the correct sentence:', opts:['He go to school','He goes to school','He going to school','He gone to school'], ans:1, grade:3},
        // Grade 5-6 band
        {passage:'Photosynthesis is the process by which plants convert sunlight into energy. They use carbon dioxide and water to produce glucose and oxygen.', q:'What do plants produce during photosynthesis?', opts:['Carbon dioxide and water','Glucose and oxygen','Sunlight and heat','Nitrogen and soil'], ans:1, grade:5},
        {passage:'', q:'Which word means "very happy"?', opts:['Sad','Angry','Elated','Tired'], ans:2, grade:5},
        // Grade 7-8 band
        {passage:'The Renaissance was a period of great cultural and scientific advancement in Europe, spanning roughly from the 14th to the 17th century.', q:'What does "Renaissance" mean?', opts:['Decline','Rebirth','Destruction','Isolation'], ans:1, grade:7},
        {passage:'', q:'Choose the correct form: "If I ___ you, I would study harder."', opts:['was','were','am','be'], ans:1, grade:7},
        // Grade 9-10 band
        {passage:'The theory of relativity, proposed by Albert Einstein, fundamentally changed our understanding of space, time, and gravity.', q:'Who proposed the theory of relativity?', opts:['Newton','Einstein','Galileo','Hawking'], ans:1, grade:9},
        {passage:'', q:'Which word is closest in meaning to "benevolent"?', opts:['Cruel','Generous','Lazy','Foolish'], ans:1, grade:9},
        // Grade 11-12 band
        {passage:'The Federalist Papers argued for ratification of the U.S. Constitution, addressing concerns about federal power and individual rights.', q:'What was the main purpose of the Federalist Papers?', opts:['To declare independence','To argue for the Constitution\'s ratification','To abolish slavery','To start a war'], ans:1, grade:11},
        {passage:'', q:'Choose the word that means "lasting a very short time":', opts:['Permanent','Eternal','Ephemeral','Enduring'], ans:2, grade:11}
    ],
    quizState: { index:0, score:0, bandResults:{}, recommendedLevel:1, studentName:'' },

    startPlacementQuiz() {
        const name = document.getElementById('newStudentName').value.trim();
        this.quizState = { index:0, score:0, bandResults:{}, recommendedLevel:1, studentName: name };
        this.showView('mtl-quiz');
        this.renderQuizQuestion();
    },

    renderQuizQuestion() {
        const st = this.quizState;
        const q = this.quizQuestions[st.index];
        document.getElementById('quizProgress').textContent = `Question ${st.index+1} of ${this.quizQuestions.length}`;
        document.getElementById('quizPassage').innerHTML = q.passage ? `<div class="mtl-passage" style="font-size:0.95rem;">${q.passage}</div>` : '';
        document.getElementById('quizQuestion').innerHTML = `<div class="mtl-question-text">${q.q}</div>`;
        document.getElementById('quizFeedback').className = 'mtl-feedback';
        document.getElementById('quizNext').style.display = 'none';

        const optsDiv = document.getElementById('quizOptions');
        optsDiv.innerHTML = q.opts.map((o, j) =>
            `<div class="mtl-option" data-o="${j}">${o}</div>`
        ).join('');
        optsDiv.querySelectorAll('.mtl-option').forEach(opt => {
            opt.addEventListener('click', () => this.answerQuizQuestion(parseInt(opt.dataset.o)));
        });
    },

    answerQuizQuestion(idx) {
        const st = this.quizState;
        const q = this.quizQuestions[st.index];
        const correct = idx === q.ans;

        document.querySelectorAll('#quizOptions .mtl-option').forEach(o => {
            o.style.pointerEvents = 'none';
            const oi = parseInt(o.dataset.o);
            if (oi === q.ans) o.classList.add('correct');
            else if (oi === idx && !correct) o.classList.add('wrong');
        });

        if (correct) st.score++;
        const fb = document.getElementById('quizFeedback');
        fb.textContent = correct ? '✅ Correct!' : '❌ Incorrect';
        fb.className = 'mtl-feedback show ' + (correct ? 'correct' : 'wrong');
        document.getElementById('quizNext').style.display = '';
        document.getElementById('quizNext').onclick = () => {
            st.index++;
            if (st.index < this.quizQuestions.length) {
                this.renderQuizQuestion();
            } else {
                this.showQuizResult();
            }
        };
    },

    showQuizResult() {
        const st = this.quizState;
        // Determine recommended level from score
        const pct = st.score / this.quizQuestions.length;
        let rec;
        if (pct <= 0.25) rec = 1;
        else if (pct <= 0.4) rec = 3;
        else if (pct <= 0.55) rec = 5;
        else if (pct <= 0.7) rec = 7;
        else if (pct <= 0.85) rec = 9;
        else rec = 11;
        st.recommendedLevel = rec;

        document.getElementById('quizBox').style.display = 'none';
        document.getElementById('quizResult').style.display = '';
        const level = MTL_CONTENT.levels[rec - 1];
        document.getElementById('quizRecLevel').innerHTML = `<span style="font-size:3rem;">${rec}</span><br>${level.name}<br><span style="color:#888;font-size:0.9rem;">Ages ${level.ageRange}</span>`;
        document.getElementById('quizRecText').textContent = `You got ${st.score} out of ${this.quizQuestions.length} correct (${Math.round(pct*100)}%). We recommend starting at Level ${rec}.`;
    },

    async finishPlacementQuiz() {
        const name = this.quizState.studentName || 'Student';
        const rec = this.quizState.recommendedLevel;
        try {
            const data = await API.createStudent(name);
            this.studentId = data.id;
            this.studentName = data.name;
            this.saveCode = data.save_code;
            this.progress = {};
            // Pre-complete levels below the recommended level
            for (let l = 1; l < rec; l++) {
                const key = 'level_' + l;
                this.progress[key] = { games: {}, completed: true };
                for (let g = 0; g < 20; g++) {
                    this.progress[key].games[g] = { completed: true, stars: 4, trophy: true };
                    if (this.studentId) {
                        API.saveProgress(this.studentId, l, g, true, 4, true).catch(() => {});
                    }
                }
            }
            saveSession({ studentId: data.id, studentName: data.name, saveCode: data.save_code });
            this.renderDashboard();
            this.showView('mtl-dashboard');
        } catch (e) {
            alert('Failed: ' + e.message);
        }
    },

    // ─── Navigation ───────────────────────────────────────
    showView(id) {
        document.querySelectorAll('.mtl-view').forEach(v => v.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    showDashboard() {
        this.currentLevel = null;
        this.currentGameIndex = null;
        this.renderDashboard();
        this.showView('mtl-dashboard');
        window.scrollTo(0, 0);
        if (this.studentId) this.checkReviewBadge();
        if (this.studentId) this.loadSkillStars();
    },

    async loadSkillStars() {
        try {
            const data = await fetch('/api/mtl/skill/progress/' + this.studentId).then(r => r.json());
            const skills = data.skills || {};
            const names = { spelling:'spelling', reading:'reading', grammar:'grammar', vocabulary:'vocabulary' };
            for (const [name, key] of Object.entries(names)) {
                const card = document.querySelector(`.mtl-skill-card[data-skill="${key}"]`);
                if (card) {
                    // Update link to include student context
                    card.href = card.href.replace(/\?.*$/, '') + '?sid=' + this.studentId;
                    const total = skills[key]?._total;
                    const badge = card.querySelector('.skill-badge');
                    if (badge) {
                        const stars = total?.stars || 0;
                        const done = total?.completed || 0;
                        const lessons = total?.lessons || 0;
                        badge.textContent = stars > 0 ? `⭐ ${stars} · ${done}/${lessons} done` : (done > 0 ? `${done}/${lessons} done` : '');
                        badge.style.display = (stars > 0 || done > 0) ? '' : 'none';
                    }
                }
            }
        } catch(e) {}
    },

    async checkReviewBadge() {
        try {
            const data = await API.getReviewItems(this.studentId);
            const count = data.mistakes?.length || 0;
            const badge = document.getElementById('mtlReviewBadge');
            if (badge) {
                badge.style.display = count > 0 ? '' : 'none';
                badge.textContent = '🔁 Review ' + count + ' mistakes';
            }
        } catch(e) {}
    },

    async startReview() {
        if (!this.studentId) return;
        try {
            const data = await API.getReviewItems(this.studentId);
            const mistakes = data.mistakes || [];
            if (mistakes.length === 0) { alert('No mistakes to review! 🎉'); return; }
            this.reviewMistakes = mistakes;
            this.reviewIndex = 0;
            this.showView('mtl-game-play');
            this.renderReviewQuestion();
        } catch(e) { alert('Failed to load review items'); }
    },

    renderReviewQuestion() {
        const m = this.reviewMistakes[this.reviewIndex];
        const area = document.getElementById('mtlGameArea');
        area.innerHTML = `<div class="mtl-game-container"><div class="mtl-game-header">
            <div class="game-type-label">🔁 Mistake Review</div>
            <h2>Review — Question ${this.reviewIndex+1} of ${this.reviewMistakes.length}</h2>
        </div>
        <div class="mtl-review-card">
            <p><strong>Level ${m.level_id} · Game ${m.game_index+1}</strong></p>
            <p style="font-size:1.1rem;">${m.word || 'Previous mistake'} — Practice this item again</p>
        </div>
        <div class="mtl-feedback" id="feedback"></div>
        <div class="mtl-action-btns" id="reviewActions"></div></div>`;

        const actions = document.getElementById('reviewActions');
        const nextBtn = document.createElement('button');
        nextBtn.className = 'mtl-next-btn';
        nextBtn.textContent = 'Got It! →';
        nextBtn.addEventListener('click', async () => {
            await API.markReviewed(m.id);
            this.reviewIndex++;
            if (this.reviewIndex < this.reviewMistakes.length) {
                this.renderReviewQuestion();
            } else {
                area.innerHTML = `<div class="mtl-game-container" style="text-align:center;padding:60px 0;">
                    <div style="font-size:3rem;">🎉</div>
                    <h2>Review Complete!</h2>
                    <p style="color:#888;">All mistakes reviewed. Keep up the great work!</p>
                    <button class="mtl-next-btn" onclick="MTL.showDashboard()">Back to Dashboard</button>
                </div>`;
            }
        });
        actions.appendChild(nextBtn);
    },

    // ─── Dashboard ────────────────────────────────────────
    renderDashboard() {
        const studentBar = this.renderStudentBar();
        const levels = MTL_CONTENT.levels;
        let completedLevels = 0, totalTrophies = 0, totalGamesCompleted = 0;

        // Calculate stats
        for (const lvl of levels) {
            const lp = this.progress['level_' + lvl.id] || {};
            if (lp.completed) completedLevels++;
            const gamesDone = Object.values(lp.games || {}).filter(g => g.completed).length;
            totalGamesCompleted += gamesDone;
            totalTrophies += Object.values(lp.games || {}).filter(g => g.trophy).length;
        }

        document.getElementById('statLevelsCompleted').textContent = completedLevels;
        document.getElementById('statTrophies').textContent = totalTrophies;
        document.getElementById('statGamesCompleted').textContent = totalGamesCompleted;
        document.getElementById('statTotalStars').textContent = this.totalStars();

        // Student bar
        const barEl = document.getElementById('mtlStudentBar');
        if (barEl) barEl.innerHTML = studentBar;

        // Render level cards
        const grid = document.getElementById('mtlLevelsGrid');
        grid.innerHTML = '';
        for (const lvl of levels) {
            const lp = this.progress['level_' + lvl.id] || {};
            const completed = lp.completed || false;
            const gamesCompleted = Object.values(lp.games || {}).filter(g => g.completed).length;
            const locked = !this.isLevelUnlocked(lvl.id);
            const pct = Math.round((gamesCompleted / 20) * 100);

            const card = document.createElement('div');
            card.className = 'mtl-level-card' + (locked ? ' locked' : '');
            card.innerHTML = `
                <div class="mtl-level-lock-icon">🔒</div>
                <div class="mtl-level-number">${lvl.id}</div>
                <div class="mtl-level-name">${lvl.name}</div>
                <div class="mtl-level-age">Ages ${lvl.ageRange}</div>
                <div class="mtl-level-progress"><div class="mtl-level-progress-bar" style="width:${pct}%"></div></div>
                <div class="mtl-level-stats">
                    <span>${gamesCompleted}/20 games</span>
                    <span class="mtl-level-trophy${completed?' earned':''}">🏆</span>
                </div>
            `;
            if (!locked) {
                card.addEventListener('click', () => this.openLevel(lvl.id));
            }
            grid.appendChild(card);
        }
    },

    totalStars() {
        let stars = 0;
        for (const lvl of MTL_CONTENT.levels) {
            const lp = this.progress['level_' + lvl.id] || {};
            for (const g of Object.values(lp.games || {})) {
                stars += g.stars || 0;
            }
        }
        return stars;
    },

    isLevelUnlocked(levelId) {
        if (levelId === 1) return true;
        const prev = this.progress['level_' + (levelId - 1)] || {};
        return !!prev.completed;
    },

    // ─── Level Detail ──────────────────────────────────────
    openLevel(levelId) {
        this.currentLevel = levelId;
        this.showView('mtl-level-detail');
        const lvl = MTL_CONTENT.levels[levelId - 1];
        const lp = this.progress['level_' + levelId] || {};
        const completed = lp.completed || false;
        const gamesCompleted = Object.values(lp.games || {}).filter(g => g.completed).length;

        document.getElementById('mtlLevelHeader').innerHTML = `
            <div class="mtl-level-header-card">
                <div class="mtl-level-header-left">
                    <h2>Level ${lvl.id}: ${lvl.name}</h2>
                    <span class="age">Ages ${lvl.ageRange}</span>
                    <p class="desc">${lvl.description}</p>
                </div>
                <div class="mtl-level-header-right">
                    <div class="mtl-big-trophy${completed?' earned':''}">🏆</div>
                    <div class="mtl-progress-text">${gamesCompleted}/20 games completed</div>
                </div>
            </div>
        `;

        const grid = document.getElementById('mtlGamesGrid');
        grid.innerHTML = '';
        for (let i = 0; i < lvl.games.length; i++) {
            const game = lvl.games[i];
            const gp = (lp.games || {})[i] || {};
            const isCompleted = gp.completed || false;
            const isLocked = i > 0 && !((lp.games || {})[i - 1] || {}).completed;

            const typeLabels = {
                comprehension:'Reading', spelling:'Spelling', vocabulary:'Vocabulary',
                grammar:'Grammar', wordsearch:'Word Search', matching:'Matching',
                fillblank:'Fill Blank', ordering:'Ordering'
            };

            const card = document.createElement('div');
            card.className = 'mtl-game-card' + (isCompleted ? ' completed' : '') + (isLocked ? ' locked-game' : '');
            card.innerHTML = `
                <div class="mtl-game-number">Game ${i + 1}</div>
                <span class="mtl-game-type-badge badge-${game.type}">${typeLabels[game.type] || game.type}</span>
                <div class="mtl-game-title">${game.title}</div>
                <div class="mtl-game-check">${isCompleted ? '✅' : ''}</div>
                <div style="font-size:0.8rem;color:#aaa;margin-top:4px">${isCompleted ? (gp.stars||0) + ' ⭐' : isLocked ? '🔒 Complete previous game first' : 'Ready to play →'}</div>
            `;
            if (!isLocked) {
                card.addEventListener('click', () => this.startGame(i));
            }
            grid.appendChild(card);
        }
        window.scrollTo(0, 0);
    },

    backToLevel() {
        if (this.currentLevel) this.openLevel(this.currentLevel);
    },

    // ─── Game Play ─────────────────────────────────────────
    startGame(index) {
        this.currentGameIndex = index;
        this.gameState = { answers: {}, stars: 0, submitted: false, stage: 0 };
        this.starsEarned = 0;
        this.showView('mtl-game-play');

        const lvl = MTL_CONTENT.levels[this.currentLevel - 1];
        const game = lvl.games[index];
        this.renderGame(game);
        window.scrollTo(0, 0);
    },

    renderGame(game) {
        const area = document.getElementById('mtlGameArea');
        const typeLabels = {
            comprehension:'Reading Comprehension', spelling:'Spelling Challenge',
            vocabulary:'Vocabulary Builder', grammar:'Grammar Practice',
            wordsearch:'Word Search', matching:'Match the Pairs',
            fillblank:'Fill in the Blanks', ordering:'Sentence Ordering'
        };

        let html = `<div class="mtl-game-container"><div class="mtl-game-header">
            <div class="game-type-label">${typeLabels[game.type] || game.type}</div>
            <h2>${game.title}</h2>
            <div class="mtl-stars-bar" id="starsBar">${'<span class="star">⭐</span>'.repeat(game.questions ? game.questions.length : 1)}</div>
        </div>`;

        switch (game.type) {
            case 'comprehension': html += this.renderComprehension(game); break;
            case 'spelling': html += this.renderSpelling(game); break;
            case 'vocabulary': html += this.renderVocabulary(game); break;
            case 'grammar': html += this.renderGrammar(game); break;
            case 'wordsearch': html += this.renderWordSearch(game); break;
            case 'matching': html += this.renderMatching(game); break;
            case 'fillblank': html += this.renderFillBlank(game); break;
            case 'ordering': html += this.renderOrdering(game); break;
        }

        html += '</div>';
        area.innerHTML = html;
        this.attachGameEvents(game);
    },

    renderComprehension(game) {
        let h = `<div class="mtl-passage"><button class="mtl-speak-btn" onclick="MTL.speakPassage(this)" title="Read aloud">🔊 Read Aloud</button><div class="mtl-passage-text">${game.passage.replace(/\n/g, '<br>')}</div></div>`;
        game.questions.forEach((q, i) => {
            h += `<div class="mtl-question-block" id="qblock${i}">
                <div class="mtl-question-text">${i+1}. ${q.q}</div>
                <div class="mtl-options" id="opts${i}">
                    ${q.opts.map((o, j) => `<div class="mtl-option" data-q="${i}" data-o="${j}">${o}</div>`).join('')}
                </div>
            </div>`;
        });
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        h += `<button class="mtl-check-btn" id="checkBtn" disabled>Check All Answers</button>`;
        return h;
    },

    renderSpelling(game) {
        if (!game.words) return '<p>No words data.</p>';
        const idx = this.gameState.stage || 0;
        if (idx >= game.words.length) return this.renderGameComplete();
        const w = game.words[idx];
        let h = `<p style="text-align:center;color:#888;margin-bottom:20px">Word ${idx+1} of ${game.words.length}</p>`;
        h += `<p style="text-align:center;font-size:1.3rem;font-weight:600">Hint: ${w.hint}</p>`;
        h += `<input type="text" class="mtl-spelling-input" id="spellInput" placeholder="Type the word..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
        h += `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">`;
        h += `<button class="mtl-submit-btn" id="spellSubmit">Submit</button>`;
        h += `<button class="mtl-submit-btn" style="background:#888;" onclick="MTL.startSpeechSpelling('spellInput')" title="Speak the word">🎤 Speak</button>`;
        h += `</div>`;
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        return h;
    },

    renderVocabulary(game) {
        let h = `<p style="text-align:center;color:#666;margin-bottom:20px">Match each word to its correct definition.</p>`;
        h += `<div class="mtl-matching-grid" id="vocabMatch">`;
        // Shuffle words and definitions
        const words = [...game.pairs].map(p => ({ word: p.word, match: p.match }));
        const shuffledWords = [...words].sort(() => Math.random() - 0.5);
        const shuffledDefs = [...words].sort(() => Math.random() - 0.5);

        shuffledWords.forEach((w, i) => {
            h += `<div class="mtl-match-item word-item" data-word="${w.word}" id="w${i}">${w.word}</div>`;
            h += `<div class="mtl-match-item def-item" data-def="${w.match}" id="d${i}">${w.match}</div>`;
        });
        h += `</div>`;
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        return h;
    },

    renderGrammar(game) {
        let h = '';
        game.sentences.forEach((s, i) => {
            const parts = s.sentence.split(s.blank || '___');
            h += `<div class="mtl-question-block">
                <div class="mtl-question-text">${i+1}. ${parts[0]}<select class="mtl-fillblank-select" id="gramSel${i}">${s.opts.map((o,j) => `<option value="${j}">${o}</option>`).join('')}</select>${parts[1]||''}</div>
            </div>`;
        });
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        h += `<button class="mtl-check-btn" id="checkBtn">Check Answers</button>`;
        return h;
    },

    renderWordSearch(game) {
        const grid = game.grid, size = game.size || grid.length, words = game.words;
        let h = `<p style="text-align:center;color:#666;margin-bottom:16px">Click letters to select a word, then click "Check Selected Word":</p>`;
        h += `<div class="mtl-wordsearch-words" id="wsWords">`;
        words.forEach((w, i) => {
            h += `<span class="mtl-wordsearch-word" id="wsw${i}" data-word="${w}">${w}</span>`;
        });
        h += `</div>`;
        h += `<div class="mtl-wordsearch-grid" style="grid-template-columns:repeat(${size},36px)" id="wsGrid">`;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                h += `<div class="mtl-wordsearch-cell" data-r="${r}" data-c="${c}">${grid[r]?.[c] || '?'}</div>`;
            }
        }
        h += `</div>`;
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        h += `<button class="mtl-check-btn" id="checkWord" style="display:none;">Check Selected Word</button>`;
        h += `<button class="mtl-check-btn" id="checkAllBtn" style="margin-top:8px;">I Found Them All!</button>`;
        return h;
    },

    renderMatching(game) {
        let h = `<p style="text-align:center;color:#666;margin-bottom:16px">Click a left item, then click its matching right item.</p>`;
        const left = [...game.left].sort(() => Math.random() - 0.5);
        const right = [...game.right].sort(() => Math.random() - 0.5);
        h += `<div class="mtl-matching-grid" id="matchGrid">`;
        left.forEach(it => {
            h += `<div class="mtl-match-item match-left" data-id="${it.id}">${it.text}</div>`;
            h += `<div style="visibility:hidden"></div>`; // spacer
        });
        right.forEach(it => {
            h += `<div style="visibility:hidden"></div>`;
            h += `<div class="mtl-match-item match-right" data-id="${it.id}">${it.text}</div>`;
        });
        h += `</div>`;
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        return h;
    },

    renderFillBlank(game) {
        let h = `<p class="mtl-fillblank-text" id="fibText">`;
        const parts = game.text.split('___');
        game.blanks.forEach((b, i) => {
            h += parts[i] + ` <select class="mtl-fillblank-select" id="fibSel${i}">${b.opts.map((o,j) => `<option value="${j}">${o}</option>`).join('')}</select> `;
        });
        h += parts[parts.length - 1] + `</p>`;
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        h += `<button class="mtl-check-btn" id="checkBtn">Check Answers</button>`;
        return h;
    },

    renderOrdering(game) {
        const words = [...game.words].sort(() => Math.random() - 0.5);
        let h = `<p style="text-align:center;color:#666;margin-bottom:16px">Click the words in the correct order to form a sentence.</p>`;
        h += `<div class="mtl-ordering-sentence" id="orderSentence"></div>`;
        h += `<div class="mtl-ordering-words" id="orderWords">`;
        words.forEach(w => {
            h += `<div class="mtl-ordering-word" data-word="${w}">${w}</div>`;
        });
        h += `</div>`;
        h += `<button class="mtl-submit-btn" id="orderReset" style="background:#888;margin-top:12px">Reset</button>`;
        h += `<div class="mtl-feedback" id="feedback"></div>`;
        h += `<button class="mtl-check-btn" id="checkBtn">Check Sentence</button>`;
        return h;
    },

    renderGameComplete() {
        return `<div class="mtl-game-container" style="text-align:center;padding:60px 0">
            <div style="font-size:4rem;animation:trophyBounce 0.6s cubic-bezier(0.175,0.885,0.32,1.275)">⭐</div>
            <h2 style="margin-top:16px">All words spelled!</h2>
            <p style="color:#888;margin:8px 0 24px">Great work! You earned ${this.gameState.stars || 0} stars.</p>
            <button class="mtl-next-btn" id="finishSpell">Continue</button>
        </div>`;
    },

    // ─── Events ────────────────────────────────────────────
    attachGameEvents(game) {
        switch (game.type) {
            case 'comprehension': this.attachComprehension(game); break;
            case 'spelling': this.attachSpelling(game); break;
            case 'vocabulary': this.attachVocabulary(game); break;
            case 'grammar': this.attachGrammar(game); break;
            case 'wordsearch': this.attachWordSearch(game); break;
            case 'matching': this.attachMatching(game); break;
            case 'fillblank': this.attachFillBlank(game); break;
            case 'ordering': this.attachOrdering(game); break;
        }
    },

    attachComprehension(game) {
        const checkBtn = document.getElementById('checkBtn');
        document.querySelectorAll('.mtl-option').forEach(opt => {
            opt.addEventListener('click', () => {
                if (this.gameState.submitted) return;
                const qIdx = parseInt(opt.dataset.q);
                const oIdx = parseInt(opt.dataset.o);
                // Deselect previous
                document.querySelectorAll(`.mtl-option[data-q="${qIdx}"]`).forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.gameState.answers[qIdx] = oIdx;
                // Enable check if all answered
                checkBtn.disabled = Object.keys(this.gameState.answers).length < game.questions.length;
            });
        });
        checkBtn.addEventListener('click', () => this.checkComprehension(game));
        this.checkBtn = checkBtn;
    },

    checkComprehension(game) {
        if (this.gameState.submitted) return;
        this.gameState.submitted = true;
        let correct = 0;
        game.questions.forEach((q, i) => {
            const userAns = this.gameState.answers[i];
            const optsDiv = document.getElementById('opts' + i);
            optsDiv.querySelectorAll('.mtl-option').forEach(o => {
                o.style.pointerEvents = 'none';
                const oIdx = parseInt(o.dataset.o);
                if (oIdx === q.ans) o.classList.add('correct');
                else if (oIdx === userAns && userAns !== q.ans) o.classList.add('wrong');
            });
            if (userAns === q.ans) {
                correct++;
                this.updateStar(i, true);
            } else if (this.studentId) {
                API.trackMistake(this.studentId, this.currentLevel, this.currentGameIndex, i, q.opts[userAns] || '', 'comprehension');
            }
        });
        this.gameState.stars = correct;
        this.starsEarned = correct;
        const fb = document.getElementById('feedback');
        const pct = Math.round((correct / game.questions.length) * 100);
        fb.textContent = pct >= 75 ? `✅ Great! ${correct}/${game.questions.length} correct (${pct}%)` : `📚 ${correct}/${game.questions.length} correct (${pct}%). Keep practicing!`;
        fb.className = 'mtl-feedback show ' + (pct >= 75 ? 'correct' : 'wrong');
        document.getElementById('checkBtn').style.display = 'none';
        this.showNextBtn(pct >= 75);

        // Reading help diversion on poor performance
        if (pct < 75 && this.studentId) {
            if (!this.gameState.comprehensionFails) this.gameState.comprehensionFails = 0;
            this.gameState.comprehensionFails++;
            if (this.gameState.comprehensionFails >= 2) {
                fb.innerHTML += `<br><br><a href="mtl-reading.html?level=${Math.ceil(this.currentLevel/2)}&return=mtl-english.html" class="mtl-help-link" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#eaf2f8;border:1px solid #2c3e50;border-radius:8px;color:#2c3e50;text-decoration:none;font-weight:600;">📖 Improve Reading Skills →</a>`;
            }
        }
    },

    attachSpelling(game) {
        const input = document.getElementById('spellInput');
        const submit = document.getElementById('spellSubmit');
        const finish = document.getElementById('finishSpell');
        if (input) input.focus();
        if (submit) submit.addEventListener('click', () => this.checkSpelling(game));
        if (finish) finish.addEventListener('click', () => this.finishGame());
        if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') this.checkSpelling(game); });
    },

    checkSpelling(game) {
        const idx = this.gameState.stage || 0;
        if (idx >= game.words.length) return;
        const input = document.getElementById('spellInput');
        const userWord = input.value.trim().toLowerCase();
        const target = game.words[idx].word.toLowerCase();
        const fb = document.getElementById('feedback');

        // Track attempts per word
        if (!this.gameState.spellAttempts) this.gameState.spellAttempts = {};
        if (!this.gameState.spellAttempts[idx]) this.gameState.spellAttempts[idx] = 0;

        if (userWord === target) {
            fb.textContent = '✅ Correct! Well done!';
            fb.className = 'mtl-feedback show correct';
            this.gameState.stars = (this.gameState.stars || 0) + 1;
            this.gameState.stage = idx + 1;
            this.starsEarned = this.gameState.stars;

            if (idx + 1 < game.words.length) {
                setTimeout(() => this.renderGame(game), 800);
            } else {
                this.renderGame(game);
            }
        } else {
            this.gameState.spellAttempts[idx]++;
            const attempts = this.gameState.spellAttempts[idx];

            // Track mistake
            if (this.studentId) {
                API.trackMistake(this.studentId, this.currentLevel, this.currentGameIndex, idx, target, 'spelling');
            }

            fb.innerHTML = `❌ Not quite. The correct spelling is "<strong>${target}</strong>".`;
            fb.className = 'mtl-feedback show wrong';

            // After 2 failed attempts, offer phonics help
            if (attempts >= 2) {
                const mapping = mapWordToPhonics(target);
                const helpUrl = mapping
                    ? `mtl-spelling.html?level=${mapping.level}&lesson=${mapping.lesson}&return=mtl-english.html&game=${this.currentGameIndex}&lvl=${this.currentLevel}`
                    : 'mtl-spelling.html';
                fb.innerHTML += `<br><br><a href="${helpUrl}" class="mtl-help-link" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#fef3e2;border:1px solid #e67e22;border-radius:8px;color:#e67e22;text-decoration:none;font-weight:600;">📖 Learn This Spelling Pattern →</a>`;
                fb.innerHTML += `<br><small style="color:#888;">Come back after practicing to try again</small>`;
                input.disabled = true;
                if (document.getElementById('spellSubmit')) document.getElementById('spellSubmit').disabled = true;
            } else {
                this.gameState.stage = idx + 1;
                if (idx + 1 < game.words.length) {
                    setTimeout(() => this.renderGame(game), 1500);
                } else {
                    this.renderGame(game);
                }
            }
        }
    },

    attachSpelling(game) {
        const input = document.getElementById('spellInput');
        const submit = document.getElementById('spellSubmit');
        const finish = document.getElementById('finishSpell');
        if (input) input.focus();
        if (submit) submit.addEventListener('click', () => this.checkSpelling(game));
        if (finish) finish.addEventListener('click', () => this.finishGame());
        if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') this.checkSpelling(game); });
    },

    attachVocabulary(game) {
        const matched = {};
        document.getElementById('vocabMatch').addEventListener('click', e => {
            const item = e.target.closest('.mtl-match-item');
            if (!item || item.classList.contains('matched')) return;

            if (item.classList.contains('word-item')) {
                document.querySelectorAll('.word-item').forEach(el => el.classList.remove('selected-match'));
                item.classList.add('selected-match');
                selectedLeft = item.dataset.word;
            } else if (item.classList.contains('def-item') && selectedLeft) {
                const def = item.dataset.def;
                // Check if it's the correct match
                const correctMatch = game.pairs.find(p => p.word === selectedLeft)?.match;
                if (def === correctMatch && !matched[selectedLeft]) {
                    matched[selectedLeft] = true;
                    document.querySelector(`.word-item[data-word="${selectedLeft}"]`).classList.add('matched');
                    item.classList.add('matched');
                    selectedLeft = null;
                    document.querySelectorAll('.word-item').forEach(el => el.classList.remove('selected-match'));

                    if (Object.keys(matched).length === game.pairs.length) {
                        this.gameState.stars = game.pairs.length;
                        this.starsEarned = game.pairs.length;
                        document.getElementById('feedback').textContent = '✅ All matched correctly! Great job!';
                        document.getElementById('feedback').className = 'mtl-feedback show correct';
                        this.showNextBtn(true);
                    }
                } else {
                    document.querySelectorAll('.word-item').forEach(el => el.classList.remove('selected-match'));
                    selectedLeft = null;
                }
            }
        });
    },

    attachGrammar(game) {
        document.getElementById('checkBtn').addEventListener('click', () => this.checkGrammar(game));
    },

    checkGrammar(game) {
        if (this.gameState.submitted) return;
        this.gameState.submitted = true;
        let correct = 0;
        game.sentences.forEach((s, i) => {
            const sel = document.getElementById('gramSel' + i);
            sel.disabled = true;
            if (parseInt(sel.value) === s.ans) {
                correct++;
                sel.style.borderColor = 'var(--mtl-green)';
                sel.style.background = 'var(--mtl-green-light)';
            } else {
                sel.style.borderColor = 'var(--mtl-red)';
                sel.style.background = 'var(--mtl-red-light)';
            }
        });
        const pct = Math.round((correct / game.sentences.length) * 100);
        const fb = document.getElementById('feedback');
        fb.textContent = pct >= 75 ? `✅ ${correct}/${game.sentences.length} correct!` : `📚 ${correct}/${game.sentences.length} correct.`;
        fb.className = 'mtl-feedback show ' + (pct >= 75 ? 'correct' : 'wrong');
        this.gameState.stars = correct;
        this.starsEarned = correct;
        document.getElementById('checkBtn').style.display = 'none';
        this.showNextBtn(pct >= 75);

        // Grammar help diversion
        if (pct < 75 && this.studentId) {
            if (!this.gameState.grammarFails) this.gameState.grammarFails = 0;
            this.gameState.grammarFails++;
            if (this.gameState.grammarFails >= 2) {
                fb.innerHTML += `<br><br><a href="mtl-grammar.html?level=${Math.ceil(this.currentLevel/2)}&return=mtl-english.html" class="mtl-help-link" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#f5eef8;border:1px solid #8e44ad;border-radius:8px;color:#8e44ad;text-decoration:none;font-weight:600;">📝 Improve Grammar Skills →</a>`;
            }
        }
    },

    attachWordSearch(game) {
        const cells = document.querySelectorAll('.mtl-wordsearch-cell');
        const checkWordBtn = document.getElementById('checkWord');
        const checkAllBtn = document.getElementById('checkAllBtn');
        const feedback = document.getElementById('feedback');
        const wordSpans = document.querySelectorAll('.mtl-wordsearch-word');
        const size = game.size || game.grid.length;
        let selectedCells = [];
        const foundWords = new Set();

        function markWordFound(word, positions) {
            foundWords.add(word.toUpperCase());
            positions.forEach(([r, c]) => {
                const cell = document.querySelector(`.mtl-wordsearch-cell[data-r="${r}"][data-c="${c}"]`);
                if (cell) cell.classList.add('found');
            });
            wordSpans.forEach(ws => {
                if (ws.dataset.word.toUpperCase() === word.toUpperCase()) ws.classList.add('found');
            });
        }

        function clearSelection() {
            selectedCells.forEach(cell => cell.classList.remove('selected'));
            selectedCells = [];
            checkWordBtn.style.display = 'none';
        }

        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                if (cell.classList.contains('found')) return;
                if (cell.classList.contains('selected')) {
                    cell.classList.remove('selected');
                    selectedCells = selectedCells.filter(c => c !== cell);
                } else {
                    cell.classList.add('selected');
                    selectedCells.push(cell);
                }
                checkWordBtn.style.display = selectedCells.length > 0 ? '' : 'none';
            });
        });

        checkWordBtn.addEventListener('click', () => {
            if (selectedCells.length === 0) return;
            const word = selectedCells.map(c => c.textContent).join('');
            const wordUpper = word.toUpperCase();

            let matched = null;
            for (const w of game.words) {
                const wUpper = w.toUpperCase();
                if (!foundWords.has(wUpper) && (wordUpper === wUpper || wordUpper === wUpper.split('').reverse().join(''))) {
                    matched = w;
                    break;
                }
            }

            if (matched) {
                const positions = selectedCells.map(c => [parseInt(c.dataset.r), parseInt(c.dataset.c)]);
                const sameRow = positions.every(([r]) => r === positions[0][0]);
                const sameCol = positions.every(([,c]) => c === positions[0][1]);

                let isContiguous = false;
                if (sameRow) {
                    const cols = positions.map(([,c]) => c).sort((a,b) => a-b);
                    isContiguous = cols.every((c,i) => i===0 || c === cols[i-1]+1);
                } else if (sameCol) {
                    const rows = positions.map(([r]) => r).sort((a,b) => a-b);
                    isContiguous = rows.every((r,i) => i===0 || r === rows[i-1]+1);
                } else {
                    const rows = positions.map(([r]) => r).sort((a,b) => a-b);
                    const cols = positions.map(([,c]) => c);
                    isContiguous = rows.every((r,i) => i===0 || r === rows[i-1]+1) &&
                        cols.every((c,i) => i===0 || Math.abs(c - cols[i-1]) === 1);
                }

                if (isContiguous && selectedCells.length === matched.length) {
                    markWordFound(matched, positions);
                    feedback.textContent = '✅ Found "' + matched + '"!';
                    feedback.className = 'mtl-feedback show correct';
                    clearSelection();

                    if (foundWords.size === game.words.length) {
                        feedback.textContent = '🎉 All words found!';
                        this.gameState.stars = game.words.length;
                        this.starsEarned = game.words.length;
                        checkAllBtn.style.display = 'none';
                        this.showNextBtn(true);
                    }
                } else {
                    feedback.textContent = '❌ Letters must be in a straight line and form the complete word.';
                    feedback.className = 'mtl-feedback show wrong';
                    clearSelection();
                }
            } else {
                feedback.textContent = '❌ Selected letters don\'t match any word. Try again!';
                feedback.className = 'mtl-feedback show wrong';
                clearSelection();
            }
        });

        checkAllBtn.addEventListener('click', () => {
            if (foundWords.size === game.words.length) {
                feedback.textContent = '🎉 All words found!';
                feedback.className = 'mtl-feedback show correct';
                this.gameState.stars = game.words.length;
                this.starsEarned = game.words.length;
                this.showNextBtn(true);
            } else {
                feedback.textContent = 'You\'ve found ' + foundWords.size + ' of ' + game.words.length + ' words. Keep searching!';
                feedback.className = 'mtl-feedback show wrong';
            }
        });
    },

    attachMatching(game) {
        // Matches handled via vocabulary-style matching
        let selectedLeft = null;
        document.getElementById('matchGrid').addEventListener('click', e => {
            const item = e.target.closest('.mtl-match-item');
            if (!item || item.classList.contains('matched')) return;
            if (item.classList.contains('match-left')) {
                document.querySelectorAll('.match-left').forEach(el => el.classList.remove('selected-match'));
                item.classList.add('selected-match');
                selectedLeft = item.dataset.id;
            } else if (item.classList.contains('match-right') && selectedLeft) {
                const rightId = item.dataset.id;
                const pair = game.pairs.find(p => p[0] === selectedLeft);
                if (pair && pair[1] === rightId) {
                    document.querySelector(`.match-left[data-id="${selectedLeft}"]`).classList.add('matched');
                    item.classList.add('matched');
                    selectedLeft = null;
                    document.querySelectorAll('.match-left').forEach(el => el.classList.remove('selected-match'));
                    const totalMatched = document.querySelectorAll('.match-left.matched').length;
                    if (totalMatched === game.pairs.length) {
                        this.gameState.stars = game.pairs.length;
                        this.starsEarned = game.pairs.length;
                        document.getElementById('feedback').textContent = '✅ All matched! Great job!';
                        document.getElementById('feedback').className = 'mtl-feedback show correct';
                        this.showNextBtn(true);
                    }
                } else {
                    document.querySelectorAll('.match-left').forEach(el => el.classList.remove('selected-match'));
                    selectedLeft = null;
                }
            }
        });
    },

    attachFillBlank(game) {
        document.getElementById('checkBtn').addEventListener('click', () => this.checkFillBlank(game));
    },

    checkFillBlank(game) {
        if (this.gameState.submitted) return;
        this.gameState.submitted = true;
        let correct = 0;
        game.blanks.forEach((b, i) => {
            const sel = document.getElementById('fibSel' + i);
            sel.disabled = true;
            if (parseInt(sel.value) === b.ans) {
                correct++;
                sel.style.borderColor = 'var(--mtl-green)';
                sel.style.background = 'var(--mtl-green-light)';
            } else {
                sel.style.borderColor = 'var(--mtl-red)';
                sel.style.background = 'var(--mtl-red-light)';
            }
        });
        const pct = Math.round((correct / game.blanks.length) * 100);
        const fb = document.getElementById('feedback');
        fb.textContent = pct >= 75 ? `✅ ${correct}/${game.blanks.length} correct!` : `📚 ${correct}/${game.blanks.length} correct.`;
        fb.className = 'mtl-feedback show ' + (pct >= 75 ? 'correct' : 'wrong');
        this.gameState.stars = correct;
        this.starsEarned = correct;
        document.getElementById('checkBtn').style.display = 'none';
        this.showNextBtn(pct >= 75);
    },

    attachOrdering(game) {
        const placedWords = [];
        const wordsContainer = document.getElementById('orderWords');
        const sentenceDiv = document.getElementById('orderSentence');
        const reset = document.getElementById('orderReset');

        wordsContainer.addEventListener('click', e => {
            const wordEl = e.target.closest('.mtl-ordering-word');
            if (!wordEl || wordEl.classList.contains('placed')) return;
            wordEl.classList.add('placed');
            placedWords.push(wordEl.dataset.word);
            const span = document.createElement('span');
            span.className = 'mtl-ordering-word placed';
            span.textContent = wordEl.dataset.word;
            span.style.cursor = 'pointer';
            span.addEventListener('click', () => {
                span.remove();
                const idx = placedWords.indexOf(span.textContent);
                if (idx > -1) placedWords.splice(idx, 1);
                wordEl.classList.remove('placed');
            });
            sentenceDiv.appendChild(span);
        });

        reset.addEventListener('click', () => {
            placedWords.length = 0;
            sentenceDiv.innerHTML = '';
            document.querySelectorAll('.mtl-ordering-word.placed').forEach(el => el.classList.remove('placed'));
        });

        document.getElementById('checkBtn').addEventListener('click', () => {
            if (this.gameState.submitted) return;
            this.gameState.submitted = true;
            const userSentence = placedWords.join(' ');
            const target = game.sentence;
            const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            const isCorrect = clean(userSentence) === clean(target);
            document.getElementById('feedback').textContent = isCorrect ? '✅ Perfect sentence!' : `❌ Try again. The sentence is: "${target}"`;
            document.getElementById('feedback').className = 'mtl-feedback show ' + (isCorrect ? 'correct' : 'wrong');
            this.gameState.stars = isCorrect ? 1 : 0;
            this.starsEarned = isCorrect ? 1 : 0;
            document.getElementById('checkBtn').style.display = 'none';
            this.showNextBtn(isCorrect);
        });
    },

    // ─── Stars & Feedback ──────────────────────────────────
    updateStar(index, earned) {
        const stars = document.querySelectorAll('#starsBar .star');
        if (stars[index]) {
            if (earned) stars[index].classList.add('earned');
        }
    },

    showNextBtn(success) {
        const area = document.getElementById('mtlGameArea');
        const container = area.querySelector('.mtl-game-container');

        // Remove any existing buttons first
        const old = container.querySelector('.mtl-action-btns');
        if (old) old.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'mtl-action-btns';

        const mainBtn = document.createElement('button');
        mainBtn.className = success ? 'mtl-next-btn' : 'mtl-check-btn';
        mainBtn.textContent = success ? 'Complete Game →' : 'Try Again';
        mainBtn.id = 'nextOrRetry';
        mainBtn.addEventListener('click', () => {
            if (success) this.finishGame();
            else this.retryGame();
        });
        wrapper.appendChild(mainBtn);

        // Add "Next Game" button if successful and there is a next game
        if (success && this.currentLevel && this.currentGameIndex != null) {
            const level = MTL_CONTENT.levels[this.currentLevel - 1];
            const nextIdx = this.currentGameIndex + 1;
            if (level && nextIdx < level.games.length) {
                const nextBtn = document.createElement('button');
                nextBtn.className = 'mtl-next-game-btn';
                nextBtn.textContent = 'Next Game →';
                nextBtn.addEventListener('click', async () => {
                    await this.finishGame();
                    this.startGame(nextIdx);
                });
                wrapper.appendChild(nextBtn);
            }
        }

        container.appendChild(wrapper);
    },

    async finishGame() {
        const levelId = this.currentLevel;
        const gameIdx = this.currentGameIndex;
        const key = 'level_' + levelId;
        if (!this.progress[key]) this.progress[key] = { games: {} };
        if (!this.progress[key].games) this.progress[key].games = {};

        const trophy = this.starsEarned > 0;
        this.progress[key].games[gameIdx] = {
            completed: true,
            stars: this.starsEarned || 1,
            trophy: trophy
        };

        // Save to server if logged in
        if (this.studentId) {
            try {
                await API.saveProgress(this.studentId, levelId, gameIdx, true, this.starsEarned || 1, trophy);
            } catch (e) {
                console.warn('Save progress failed:', e.message);
            }
        }

        // Show trophy popup
        this.showTrophyPopup(trophy);

        // Check if all 20 games completed
        const allCompleted = Object.keys(this.progress[key].games).filter(k => {
            const g = this.progress[key].games[k];
            return g && g.completed;
        }).length >= 20;

        if (allCompleted) {
            this.progress[key].completed = true;
            setTimeout(() => this.showLevelTrophy(), 1500);
        }
    },

    retryGame() {
        this.gameState = { answers: {}, stars: 0, submitted: false, stage: 0 };
        this.starsEarned = 0;
        const lvl = MTL_CONTENT.levels[this.currentLevel - 1];
        this.renderGame(lvl.games[this.currentGameIndex]);
        window.scrollTo(0, 0);
    },

    showTrophyPopup(trophy) {
        if (!trophy) return;
        // Simple trophy popup via existing toast or dedicated popup
        const popup = document.createElement('div');
        popup.className = 'mtl-trophy-popup show';
        popup.innerHTML = `
            <span class="trophy-icon">⭐</span>
            <div class="trophy-text">Star Earned!</div>
            <div class="trophy-sub">Great job! Keep going!</div>
            <button class="trophy-close">Continue</button>
        `;
        const overlay = document.createElement('div');
        overlay.className = 'mtl-overlay show';
        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        const close = () => {
            popup.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => { popup.remove(); overlay.remove(); }, 300);
        };
        popup.querySelector('.trophy-close').addEventListener('click', close);
        overlay.addEventListener('click', close);

        setTimeout(() => {
            if (document.body.contains(popup)) close();
        }, 3000);
    },

    showLevelTrophy() {
        const popup = document.createElement('div');
        popup.className = 'mtl-trophy-popup show';
        popup.innerHTML = `
            <span class="trophy-icon">🏆</span>
            <div class="trophy-text">Level Complete!</div>
            <div class="trophy-sub">Congratulations! You've earned the Level Trophy! The next level is now unlocked.</div>
            <button class="trophy-close">Continue</button>
            <button class="trophy-close" style="background:#d4a843;margin-left:8px;" onclick="MTL.printCertificate(${this.currentLevel})">🖨️ Certificate</button>
        `;
        const overlay = document.createElement('div');
        overlay.className = 'mtl-overlay show';
        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        const close = () => {
            popup.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => { popup.remove(); overlay.remove(); this.backToLevel(); }, 300);
        };
        popup.querySelector('.trophy-close').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }
};

// ─── PHONICS MAPPING ────────────────────────────────────────
// Maps spelling words to phonics curriculum (level, lesson)
function mapWordToPhonics(word) {
    const w = word.toLowerCase();
    const map = {
        // Short vowels → Level 1
        'cat':[1,1],'hat':[1,1],'bat':[1,1],'map':[1,1],'cap':[1,1],'sad':[1,1],'bag':[1,1],'jam':[1,1],'fan':[1,1],'rat':[1,1],'dad':[1,1],'mat':[1,1],'pan':[1,1],'tag':[1,1],'van':[1,1],
        'bed':[1,2],'red':[1,2],'pen':[1,2],'leg':[1,2],'net':[1,2],'pet':[1,2],'wet':[1,2],'ten':[1,2],'bell':[1,2],'desk':[1,2],'hen':[1,2],'jet':[1,2],'men':[1,2],'step':[1,2],'vest':[1,2],
        'fish':[1,3],'pig':[1,3],'sit':[1,3],'big':[1,3],'lip':[1,3],'win':[1,3],'mix':[1,3],'pin':[1,3],'dig':[1,3],'hill':[1,3],'kid':[1,3],'rip':[1,3],'six':[1,3],'tip':[1,3],'zip':[1,3],
        'dog':[1,4],'hot':[1,4],'box':[1,4],'top':[1,4],'mop':[1,4],'pot':[1,4],'fox':[1,4],'log':[1,4],'dot':[1,4],'rock':[1,4],'cot':[1,4],'hop':[1,4],'jog':[1,4],'pop':[1,4],'rod':[1,4],
        'sun':[1,5],'cup':[1,5],'bus':[1,5],'run':[1,5],'mud':[1,5],'bug':[1,5],'nut':[1,5],'hug':[1,5],'cut':[1,5],'drum':[1,5],'fun':[1,5],'gum':[1,5],'jug':[1,5],'pup':[1,5],'tub':[1,5],
        // Blends → Level 2
        'blue':[2,1],'clock':[2,1],'flag':[2,1],'glass':[2,1],'plane':[2,1],'sleep':[2,1],'black':[2,1],'club':[2,1],'flat':[2,1],'glad':[2,1],'play':[2,1],'slip':[2,1],
        'brown':[2,2],'crab':[2,2],'drum':[2,2],'frog':[2,2],'green':[2,2],'tree':[2,2],'bring':[2,2],'crop':[2,2],'drop':[2,2],'free':[2,2],'grab':[2,2],'trip':[2,2],'brush':[2,2],'cross':[2,2],'train':[2,2],
        'school':[2,3],'skip':[2,3],'small':[2,3],'snow':[2,3],'spot':[2,3],'star':[2,3],'swim':[2,3],'scale':[2,3],'skin':[2,3],'smile':[2,3],'snap':[2,3],'spin':[2,3],'step':[2,3],
        'spring':[2,4],'street':[2,4],'splash':[2,4],'screen':[2,4],'spray':[2,4],'strong':[2,4],'split':[2,4],
        // Digraphs → Level 3
        'ship':[3,1],'fish':[3,1],'wish':[3,1],'shop':[3,1],'shell':[3,1],'brush':[3,1],'crash':[3,1],'shake':[3,1],'sheep':[3,1],'dish':[3,1],'shape':[3,1],'fresh':[3,1],'shine':[3,1],
        'chip':[3,2],'chin':[3,2],'chat':[3,2],'chop':[3,2],'chick':[3,2],'lunch':[3,2],'bench':[3,2],'much':[3,2],'cheese':[3,2],'chair':[3,2],'chase':[3,2],'check':[3,2],'chimp':[3,2],'march':[3,2],'punch':[3,2],
        'thin':[3,3],'think':[3,3],'bath':[3,3],'path':[3,3],'teeth':[3,3],'this':[3,3],'that':[3,3],'them':[3,3],'then':[3,3],'with':[3,3],'thank':[3,3],'thick':[3,3],'cloth':[3,3],
        'what':[3,4],'when':[3,4],'whale':[3,4],'white':[3,4],'wheel':[3,4],'phone':[3,4],'photo':[3,4],'graph':[3,4],'phrase':[3,4],'dolphin':[3,4],
        // Silent E → Level 4
        'cake':[4,1],'make':[4,1],'name':[4,1],'gate':[4,1],'game':[4,1],'plane':[4,1],'snake':[4,1],'brave':[4,1],'shake':[4,1],'plate':[4,1],'grade':[4,1],'shape':[4,1],'whale':[4,1],'blame':[4,1],'frame':[4,1],
        'bike':[4,2],'time':[4,2],'like':[4,2],'five':[4,2],'ride':[4,2],'slide':[4,2],'smile':[4,2],'white':[4,2],'drive':[4,2],'prize':[4,2],'shine':[4,2],'spike':[4,2],'twice':[4,2],'while':[4,2],'write':[4,2],
        'hope':[4,3],'rope':[4,3],'note':[4,3],'home':[4,3],'stone':[4,3],'cute':[4,3],'flute':[4,3],'mule':[4,3],'tube':[4,3],'bone':[4,3],'globe':[4,3],'smoke':[4,3],'cube':[4,3],'rule':[4,3],'tune':[4,3],
        // Vowel Teams → Level 5
        'rain':[5,1],'train':[5,1],'paint':[5,1],'wait':[5,1],'snail':[5,1],'day':[5,1],'play':[5,1],'say':[5,1],'stay':[5,1],'gray':[5,1],'brain':[5,1],'chain':[5,1],'clay':[5,1],'pray':[5,1],'spray':[5,1],
        'tree':[5,2],'bee':[5,2],'green':[5,2],'sleep':[5,2],'sheep':[5,2],'read':[5,2],'beach':[5,2],'dream':[5,2],'tea':[5,2],'clean':[5,2],'sweet':[5,2],'speak':[5,2],'stream':[5,2],'please':[5,2],'freeze':[5,2],
        'boat':[5,3],'coat':[5,3],'road':[5,3],'toast':[5,3],'soap':[5,3],'snow':[5,3],'grow':[5,3],'show':[5,3],'bowl':[5,3],'float':[5,3],'groan':[5,3],'crow':[5,3],'throw':[5,3],'coach':[5,3],'blow':[5,3],
        'night':[5,4],'light':[5,4],'right':[5,4],'high':[5,4],'bright':[5,4],'flight':[5,4],'sight':[5,4],'tight':[5,4],'might':[5,4],'fight':[5,4],
        // R-controlled → Level 6
        'car':[6,1],'star':[6,1],'park':[6,1],'farm':[6,1],'dark':[6,1],'hard':[6,1],'smart':[6,1],'sharp':[6,1],'shark':[6,1],'garden':[6,1],
        'her':[6,2],'girl':[6,2],'bird':[6,2],'turn':[6,2],'hurt':[6,2],'nurse':[6,2],'first':[6,2],'fern':[6,2],'purse':[6,2],'curl':[6,2],'dirt':[6,2],'burn':[6,2],'verb':[6,2],'church':[6,2],'surf':[6,2],
        'fork':[6,3],'corn':[6,3],'horse':[6,3],'storm':[6,3],'north':[6,3],'more':[6,3],'store':[6,3],'shore':[6,3],'score':[6,3],'before':[6,3],
        // Diphthongs → Level 7
        'coin':[7,1],'boil':[7,1],'join':[7,1],'point':[7,1],'voice':[7,1],'boy':[7,1],'toy':[7,1],'joy':[7,1],'enjoy':[7,1],'oil':[7,1],
        'cloud':[7,2],'house':[7,2],'mouse':[7,2],'round':[7,2],'shout':[7,2],'cow':[7,2],'down':[7,2],'brown':[7,2],'flower':[7,2],'town':[7,2],
        'sauce':[7,3],'pause':[7,3],'cause':[7,3],'launch':[7,3],'saw':[7,3],'draw':[7,3],'claw':[7,3],'crawl':[7,3],'straw':[7,3],
        // Common patterns → Level 8
        'night':[8,2],'light':[8,2],'right':[8,2],'bright':[8,2],'flight':[8,2],'sight':[8,2],'tight':[8,2],'might':[8,2],'fight':[8,2],'delight':[8,2],
        'station':[8,1],'nation':[8,1],'action':[8,1],'question':[8,1],'vision':[8,1],'television':[8,1],
        // Prefixes/Suffixes → Level 9
        'unhappy':[9,1],'rewrite':[9,1],'preview':[9,1],'disagree':[9,1],'unfair':[9,1],'return':[9,1],'preschool':[9,1],'dislike':[9,1],'unlock':[9,1],'replay':[9,1],
        'helpful':[9,2],'fearless':[9,2],'kindness':[9,2],'quickly':[9,2],'thankful':[9,2],'endless':[9,2],'darkness':[9,2],'slowly':[9,2],
        // Tricky → Level 10
        'there':[10,1],'their':[10,1],'beautiful':[10,3],'because':[10,3],'favourite':[10,3],'different':[10,3],'believe':[10,3],'receive':[10,3],'friend':[10,3],'enough':[10,3],'though':[10,3],'through':[10,3],
        'necessary':[10,3],'separate':[10,3],'definitely':[10,3],'accidentally':[10,3],'library':[10,3],'environment':[10,3],'government':[10,3],'Wednesday':[10,3],'restaurant':[10,3],'calendar':[10,3],
        'knife':[10,2],'knee':[10,2],'write':[10,2],'wrong':[10,2],'lamb':[10,2],'comb':[10,2],'sign':[10,2],'gnat':[10,2],'hour':[10,2],'honest':[10,2],
        // Fallback for common MTL words
        'apple':[1,1],'milk':[1,3],'bread':[4,2],'egg':[1,2],'pencil':[1,2],'teacher':[5,2],'library':[10,3],'homework':[4,3],
        'tree':[2,2],'flower':[7,2],'river':[4,2],'mountain':[7,2],'sunny':[1,5],'cloudy':[7,2],'stormy':[6,3],'rainbow':[5,1],
        'planet':[4,1],'energy':[1,2],'oxygen':[3,4],'temperature':[9,1],'continent':[9,1],'island':[5,2],'desert':[6,2],'volcano':[4,3],
        'necessary':[10,3],'separate':[10,3],'definitely':[10,3],'calendar':[10,3],'accidentally':[10,3],'library':[10,3],
        'environment':[10,3],'government':[10,3],'February':[10,3],'Wednesday':[10,3],'restaurant':[10,3],
        'immediately':[10,3],'independent':[10,3],'knowledge':[10,2],'rhythm':[10,3],'embarrass':[10,3],'accommodate':[10,3],
        'conscious':[10,3],'controversy':[10,3],'exaggerate':[10,3],'pronunciation':[8,1],'questionnaire':[10,3],'recommend':[10,3],
        'bureaucracy':[10,3],'phenomenon':[10,3],'sophisticated':[10,3],'conscientious':[10,3],'idiosyncrasy':[10,3],'mischievous':[10,3],
        'challenge':[8,1],'important':[9,1],'continue':[9,1],'favorite':[4,3],'special':[10,3],'wonder':[6,2],
        'anachronistic':[10,3],'idiosyncratic':[10,3],'paradigmatic':[10,3],'quintessential':[10,3],'surreptitious':[10,3],'ubiquitous':[10,3],
        'ameliorate':[10,3],'concomitant':[10,3],'ephemeral':[10,3],'magnanimous':[10,3],'perspicacious':[10,3],'recalcitrant':[10,3],
        'antediluvian':[10,3],'circumlocution':[10,3],'incontrovertible':[10,3],'sesquipedalian':[10,3],'verisimilitude':[10,3],'zeugma':[10,3]
    };
    return map[w] || null;
}

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => MTL.init());
