import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=name=>{
 const match=html.match(new RegExp(`        function ${name}\\([\\s\\S]*?\\n        }\\n`));
 assert.ok(match,name);return match[0];
};
const constant=name=>{
 const match=html.match(new RegExp(`        const ${name} = Object\\.freeze\\([\\s\\S]*?\\n        \\}\\);`));
 assert.ok(match,name);return match[0];
};
function display(){
 const saved=new Map(),inputs={showCombatNumbersToggle:{checked:false},showPowerTextToggle:{checked:false}};
 const e=vm.createContext({floatingTexts:[],showCombatNumbers:false,showPowerText:false,
  MAX_FLOATING_TEXTS:120,ARENA_COMBAT_DISPLAY_KEY:'test-display',currentLanguage:'es',localizeText:s=>s,
  document:{getElementById:id=>inputs[id]},localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)??null}});
 vm.runInContext(['spawnFloatingText','setCombatDisplayOption','loadCombatDisplayOptions'].map(source).join('\n'),e);
 return {e,saved,inputs};
}
test('Unicode damage and every special can reveal text, then return to icons without deleting their animations',()=>{
 const {e,inputs}=display();
 for(const text of ['−12','💥 −38','☄️ Kame','🌀 Rasen','💥 Coloso','⚡ Trueno','🌿 Enredadera'])e.spawnFloatingText(100,200,text);
 assert.equal(e.floatingTexts.length,7);assert.equal(e.floatingTexts[0].kind,'number');
 assert.equal(e.floatingTexts[2].text,'☄️');assert.equal(e.floatingTexts[3].text,'🌀');assert.equal(e.floatingTexts[6].text,'🌿');
 assert.ok(e.floatingTexts.every(ft=>!/[\p{L}\p{N}]/u.test(ft.text)));
 e.setCombatDisplayOption('numbers',true);e.setCombatDisplayOption('powerText',true);
 assert.equal(e.floatingTexts[0].text,'−12');
 for(const name of ['Kame','Rasen','Coloso','Trueno','Enredadera'])assert.ok(e.floatingTexts.some(ft=>ft.text.includes(name)));
 assert.equal(inputs.showCombatNumbersToggle.checked,true);assert.equal(inputs.showPowerTextToggle.checked,true);
 e.setCombatDisplayOption('numbers',false);e.setCombatDisplayOption('powerText',false);
 assert.equal(e.floatingTexts.length,7);assert.ok(e.floatingTexts.every(ft=>!/[\p{L}\p{N}]/u.test(ft.text)));
 e.setCombatDisplayOption('powerText',true);assert.ok(e.floatingTexts.at(-1).text.includes('Enredadera'));
});
test('explicit power kind supports translated labels and display preferences persist with safe defaults',()=>{
 const {e,saved}=display();e.setCombatDisplayOption('powerText',true);
 e.spawnFloatingText(1,1,'🌿 藤蔓','#00ff00',18,'power');assert.equal(e.floatingTexts[0].kind,'power');assert.ok(e.floatingTexts[0].text.includes('藤蔓'));
 e.showPowerText=false;e.loadCombatDisplayOptions();assert.equal(e.showPowerText,true);
 saved.set('test-display','{"numbers":"true","powerText":1}');e.loadCombatDisplayOptions();assert.equal(e.showPowerText,false);assert.equal(e.showCombatNumbers,false);
 saved.set('test-display','{bad');e.loadCombatDisplayOptions();assert.equal(e.showCombatNumbers,false);
 const before=e.floatingTexts.length;for(let i=0;i<500;i++)e.spawnFloatingText(1,1,'−12');assert.equal(e.floatingTexts.length,120);assert.ok(before<120);
});
function balance(){
 const keys=['kame','ninja','titan','trueno','esmeralda'];
 const commands=['!kame','!rasen','!coloso','!trueno','!enred'];
 const e=vm.createContext({CLASS_KEY_ORDER:keys,CLASS_COMMANDS:Object.fromEntries(keys.map((k,i)=>[k,{powers:[commands[i]]}])),
  ARENA_BASE_MELEE_DAMAGE:12,activeMode:'iso',arenaCombatRules:{damage:1,classRule:'any',powerMode:'full'}});
 vm.runInContext([constant('ARENA_CLASS_BALANCE'),constant('ARENA_CLASS_RIVALRIES'),source('getArenaClassDamageMultiplier'),source('arenaClassPowersAllowed'),source('getArenaBalanceSnapshot')].join('\n'),e);return e;
}
test('all 15 class/mode inspection rows read the native engine profile and the shared base damage',()=>{
 const e=balance(),expected={'1v1':[43,38,38,37,37],smash:[44,50,38,28,44],iso:[38,60,38,32,60]};
 for(const mode of Object.keys(expected)){
  const snapshot=e.getArenaBalanceSnapshot(mode);
  assert.equal(snapshot.mode,mode);assert.deepEqual(Array.from(snapshot.rows,r=>r.base),[12,12,12,12,12]);
  assert.deepEqual(Array.from(snapshot.rows,r=>r.special),expected[mode]);
  assert.equal(Object.isFrozen(snapshot),true);assert.equal(Object.isFrozen(snapshot.rows),true);assert.equal(Object.isFrozen(snapshot.rows[0]),true);
 }
});
test('round inspection applies damage, disabled powers and allowed classes without changing the underlying rules',()=>{
 const e=balance();e.arenaCombatRules.damage=1.25;
 let data=e.getArenaBalanceSnapshot('1v1','round');assert.equal(data.rows[0].base,15);assert.equal(data.rows[0].special,54);
 e.arenaCombatRules.powerMode='noSpecials';data=e.getArenaBalanceSnapshot('iso','round');assert.ok(data.rows.every(row=>row.special===0&&row.base===15));
 e.arenaCombatRules.classRule='kame';data=e.getArenaBalanceSnapshot('iso','round');assert.equal(data.rows[0].base,15);assert.ok(data.rows.slice(1).every(row=>row.base===0&&!row.allowed));
 const before=JSON.stringify(e.arenaCombatRules);data=e.getArenaBalanceSnapshot('iso','nominal');assert.equal(data.rows[1].special,60);assert.equal(JSON.stringify(e.arenaCombatRules),before);
});
test('the inspector includes each counter and prey while neutral inspection preserves the native profile',()=>{
 const e=balance();
 let data=e.getArenaBalanceSnapshot('iso','nominal','titan');
 assert.equal(data.targetClass,'titan');assert.equal(data.rows[0].base,13);assert.equal(data.rows[0].special,42);assert.equal(data.rows[0].matchupMultiplier,1.1);
 assert.equal(data.rows[3].base,11);assert.equal(data.rows[3].special,29);assert.equal(data.rows[3].matchupMultiplier,.9);
 assert.equal(data.rows[2].special,38);assert.equal(data.rows[2].matchupMultiplier,1);
 e.arenaCombatRules.damage=1.25;data=e.getArenaBalanceSnapshot('smash','round','titan');assert.equal(data.rows[0].special,61);
 data=e.getArenaBalanceSnapshot('iso','nominal','neutral');assert.equal(data.targetClass,null);assert.equal(data.rows[1].special,60);
});
test('Settings has one footer version and no header version; the balance vocabulary covers all eight locales',()=>{
 assert.doesNotMatch(html,/id="arenaSettingsVersion"/);assert.match(html,/id="arenaVersionInfo" data-no-translate[^>]*>Arena Live v0\.13/);
 assert.doesNotMatch(html,/id="arenaObsCalibrationTitle"[^>]*>[^<]*v0\./);
 const e=vm.createContext({});vm.runInContext(constant('ARENA_BALANCE_COPY')+'\nglobalThis.copy=ARENA_BALANCE_COPY;',e);
 assert.equal(Object.keys(e.copy).length,8);for(const words of Object.values(e.copy)){assert.equal(words.length,29);assert.ok(words.every(w=>typeof w==='string'&&w.length>0));}
});
