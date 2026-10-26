// Operator session controls. Existing storage keys and the OBS calibration stay intact.
const ARENA_RUNTIME_COPY=Object.freeze({
 es:['Sesión y rendimiento','Especiales','Mismas reglas para todos','Participación libre del público','Durante la pausa','Guardar acciones recientes','Mostrar sin ejecutar','Calidad de partículas','Alta','Equilibrada','Rendimiento','Límite de dibujo','Prioridad de Guerrero','Rival cercano · preferencia hasta 25 %','Siempre otros Guerreros','Volumen','Reglas comunes: mínimo 25 de energía y 8 s de espera. El especial usa hasta 45 de energía.','La cola conserva 8 s, hasta 64 personas; ejecuta 4 acciones por segundo al reanudar.','La calidad cambia solo el dibujo. La simulación sigue a 60 pasos/s y ambas capturas conservan Full HD.','Guardar configuración','Cargar configuración','Restablecer sesión','Exportar diagnóstico','Configuración cargada','Archivo de configuración no válido','No incluye perfiles ni la partida en curso. Conserva la calibración OBS.'],
 en:['Session and performance','Specials','Same rules for everyone','Free audience participation','While paused','Queue recent actions','Show without applying','Particle quality','High','Balanced','Performance','Drawing limit','Warrior priority','Nearby rival · preference up to 25%','Always other Warriors','Volume','Shared rules: minimum 25 energy and 8 s cooldown. Specials use up to 45 energy.','The queue keeps 8 s, up to 64 people; drains 4 actions/s after resume.','Quality affects drawing only. Simulation stays at 60 steps/s; both captures retain Full HD.','Save configuration','Load configuration','Reset session','Export diagnostics','Configuration loaded','Invalid configuration file','Excludes profiles and the current match. Preserves OBS calibration.'],
 fr:['Session et performances','Pouvoirs','Mêmes règles pour tous','Participation libre du public','Pendant la pause','Garder les actions récentes','Afficher sans appliquer','Qualité des particules','Haute','Équilibrée','Performance','Limite de dessin','Priorité du Guerrier','Proche · préférence jusqu’à 25 %','Toujours les Guerriers','Volume','Règles communes : 25 énergie minimum, recharge 8 s. Le pouvoir utilise jusqu’à 45 énergie.','File : 8 s, 64 personnes maximum ; 4 actions/s après reprise.','La qualité ne change que le dessin. Simulation à 60 pas/s ; captures Full HD.','Enregistrer la configuration','Charger la configuration','Réinitialiser la session','Exporter le diagnostic','Configuration chargée','Fichier de configuration invalide','Sans profils ni partie en cours. Conserve le calibrage OBS.'],
 de:['Sitzung und Leistung','Spezialangriffe','Gleiche Regeln für alle','Freie Zuschaueraktionen','Während der Pause','Neue Aktionen vormerken','Nur anzeigen','Partikelqualität','Hoch','Ausgewogen','Leistung','Zeichenlimit','Kriegerpriorität','Naher Gegner · bis 25 % weiter','Immer andere Krieger','Lautstärke','Gemeinsame Regeln: mindestens 25 Energie, 8 s Abklingzeit. Bis zu 45 Energie pro Spezialangriff.','Warteschlange: 8 s, höchstens 64 Personen; danach 4 Aktionen/s.','Qualität betrifft nur die Grafik. Simulation mit 60 Schritten/s; beide Bilder bleiben Full HD.','Konfiguration speichern','Konfiguration laden','Sitzung zurücksetzen','Diagnose exportieren','Konfiguration geladen','Ungültige Konfigurationsdatei','Ohne Profile und laufendes Spiel. OBS-Kalibrierung bleibt erhalten.'],
 zh:['会话与性能','技能规则','所有人相同规则','观众自由参与','暂停期间','暂存最近操作','仅显示不执行','粒子画质','高','均衡','性能','绘制帧率上限','战士目标偏好','近处敌人 · 同类可远25%','始终优先战士','音量','共同规则：至少25能量，冷却8秒。每次最多使用45能量。','队列保留8秒，最多64人；恢复后每秒执行4次操作。','画质仅影响绘制。模拟保持每秒60步，两个画面均为全高清。','保存配置','加载配置','重置会话','导出诊断','配置已加载','配置文件无效','不包含玩家档案或当前比赛，保留OBS校准。'],
 ja:['セッションとパフォーマンス','必殺技','全員同じルール','視聴者の自由参加','一時停止中','最近の操作を待機','表示のみ','パーティクル品質','高','バランス','軽量','描画上限','戦士の優先順位','近い相手 · 同種は25%遠くまで','常に他の戦士','音量','共通ルール：最低25エネルギー、クールダウン8秒。最大45消費。','待機列は8秒、最大64人。再開後は毎秒4操作。','品質は描画のみ。シミュレーションは毎秒60ステップ、両画面はフルHD。','設定を保存','設定を読み込む','セッションをリセット','診断を出力','設定を読み込みました','無効な設定ファイル','プロフィールと試合は含みません。OBS調整を保持。'],
 pt:['Sessão e desempenho','Especiais','Mesmas regras para todos','Participação livre do público','Durante a pausa','Guardar ações recentes','Mostrar sem executar','Qualidade das partículas','Alta','Equilibrada','Desempenho','Limite de desenho','Prioridade do Guerreiro','Rival próximo · preferência até 25%','Sempre outros Guerreiros','Volume','Regras comuns: mínimo de 25 energia e recarga de 8 s. O especial usa até 45 energia.','Fila: 8 s, até 64 pessoas; 4 ações/s após retomar.','A qualidade só muda o desenho. Simulação a 60 passos/s; ambas as capturas em Full HD.','Salvar configuração','Carregar configuração','Redefinir sessão','Exportar diagnóstico','Configuração carregada','Arquivo de configuração inválido','Sem perfis nem partida atual. Preserva a calibração OBS.'],
 it:['Sessione e prestazioni','Speciali','Stesse regole per tutti','Partecipazione libera del pubblico','Durante la pausa','Conserva azioni recenti','Mostra senza eseguire','Qualità particelle','Alta','Bilanciata','Prestazioni','Limite di disegno','Priorità del Guerriero','Rivale vicino · preferenza fino al 25%','Sempre altri Guerrieri','Volume','Regole comuni: minimo 25 energia, attesa 8 s. Lo speciale usa fino a 45 energia.','Coda: 8 s, massimo 64 persone; 4 azioni/s alla ripresa.','La qualità cambia solo il disegno. Simulazione a 60 passi/s; entrambe le catture Full HD.','Salva configurazione','Carica configurazione','Reimposta sessione','Esporta diagnosi','Configurazione caricata','File di configurazione non valido','Esclude profili e partita attuale. Mantiene la calibrazione OBS.']
});
function installArenaRuntimeSettings(){
    const card=document.createElement('div');card.id='arenaRuntimeCard';card.dataset.noTranslate='';card.className='bg-slate-900/75 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3';
    const select=(key,label,values)=>`<label class="flex flex-col gap-1 text-xs"><span data-runtime-copy="${label}"></span><select id="arenaRuntime_${key}" data-runtime-option="${key}">${values.map(([value,index])=>`<option value="${value}"${typeof index==='number'?` data-runtime-copy="${index}"`:''}>${typeof index==='string'?index:''}</option>`).join('')}</select></label>`;
    card.innerHTML='<h3 class="font-bold text-xs" data-runtime-copy="0"></h3>'
      +select('specialPolicy',1,[['fair',2],['audience',3]])+select('pausePolicy',4,[['queue',5],['show',6]])
      +'<p id="arenaSpecialPolicyHelp" class="text-[10px] text-slate-400" data-runtime-copy="16"></p><p class="text-[10px] text-slate-400" data-runtime-copy="17"></p>'
      +select('quality',7,[['high',8],['balanced',9],['performance',10]])+select('renderFps',11,[['30','30 FPS'],['60','60 FPS']])
      +'<p class="text-[10px] text-slate-400" data-runtime-copy="18"></p>'+select('warriorTargeting',12,[['local',13],['always',14]])
      +'<label class="flex flex-col gap-1 text-xs"><span><span data-runtime-copy="15"></span>: <output id="arenaRuntimeVolumeValue"></output></span><input id="arenaRuntime_masterVolume" data-runtime-option="masterVolume" type="range" min="0" max="100" step="5"></label>'
      +'<div class="flex flex-wrap gap-2"><button type="button" id="arenaSaveConfiguration" data-runtime-copy="19"></button><button type="button" id="arenaLoadConfiguration" data-runtime-copy="20"></button><button type="button" id="arenaResetRuntime" data-runtime-copy="21"></button><button type="button" id="arenaExportDiagnostics" data-runtime-copy="22"></button></div><input type="file" id="arenaConfigurationFile" accept=".json,application/json" hidden><p class="text-[10px] text-slate-400" data-runtime-copy="25"></p><output id="arenaConfigurationStatus" role="status" class="text-xs"></output>';
    for(const select of card.querySelectorAll('select')){select.className='min-w-0 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200';select.style.colorScheme='dark';}
    for(const button of card.querySelectorAll('button'))button.className='rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs text-slate-200';
    card.querySelector('input[type=range]').className='w-full accent-cyan-400';
    document.getElementById('settingsGeneralPanel').appendChild(card);
    for(const control of card.querySelectorAll('[data-runtime-option]'))control.addEventListener(control.type==='range'?'input':'change',()=>setArenaRuntimeOption(control.dataset.runtimeOption,control.value));
    card.querySelector('#arenaSaveConfiguration').onclick=()=>downloadArenaJSON(exportArenaConfiguration(),'arena-live-configuracion');
    const file=card.querySelector('#arenaConfigurationFile');card.querySelector('#arenaLoadConfiguration').onclick=()=>file.click();
    file.onchange=async()=>{let accepted=false;try{if(file.files[0]?.size<=262144)accepted=importArenaConfiguration(JSON.parse(await file.files[0].text()));}catch(_){}document.getElementById('arenaConfigurationStatus').textContent=(ARENA_RUNTIME_COPY[currentLanguage]||ARENA_RUNTIME_COPY.es)[accepted?23:24];file.value='';};
    card.querySelector('#arenaResetRuntime').onclick=()=>{for(const [key,value]of Object.entries(ARENA_RUNTIME_DEFAULTS))setArenaRuntimeOption(key,value);};
    card.querySelector('#arenaExportDiagnostics').onclick=()=>downloadArenaJSON(getArenaDiagnostics(),'arena-live-diagnostico');
    refreshArenaRuntimeControls();
}
function refreshArenaRuntimeControls(){
    const words=ARENA_RUNTIME_COPY[currentLanguage]||ARENA_RUNTIME_COPY.es;
    for(const node of document.querySelectorAll('[data-runtime-copy]'))writeArenaHudText(node,words[Number(node.dataset.runtimeCopy)]);
    const help={specialPolicy:arenaRuntime.specialPolicy==='fair'?words[16]:(ARENA_PARTICIPATION_HELP[currentLanguage]||ARENA_PARTICIPATION_HELP.es),pausePolicy:words[17],quality:words[18],renderFps:words[18],warriorTargeting:arenaWarriorPolicyText(),masterVolume:words[15]+' · 0–100 %'};
    for(const node of document.querySelectorAll('[data-runtime-option]')){node.value=String(arenaRuntime[node.dataset.runtimeOption]);node.title=help[node.dataset.runtimeOption];}
    writeArenaHudText(document.getElementById('arenaSpecialPolicyHelp'),help.specialPolicy);
    writeArenaHudText(document.getElementById('arenaRuntimeVolumeValue'),arenaRuntime.masterVolume+' %');
    document.documentElement.style.setProperty('--arena-hud-opacity',String(arenaRuntime.hudOpacity/100));
    const opacity=document.getElementById('hudOpacityRange');if(opacity)opacity.value=String(arenaRuntime.hudOpacity);
    writeArenaHudText(document.getElementById('hudOpacityValue'),arenaRuntime.hudOpacity+' %');
    refreshArenaAudioVolume();
}
function getArenaDiagnostics(){return {version:window.ArenaLive.version,...arenaDiagnostics.snapshot(),timing:'CPU: simulation and canvas command submission; not GPU execution time',gpu:'Managed by browser; hardware acceleration cannot be verified from Canvas 2D',captures:[[canvas16.width,canvas16.height],[canvas9.width,canvas9.height]],quality:arenaRuntime.quality,renderFps:arenaRuntime.renderFps,activeFighters:fighters.filter(f=>!f.eliminated).length,droppedTimeMs:arenaDroppedTimeMs,memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null};}
function downloadArenaJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportArenaConfiguration(){
    saveArenaWorkspace();return JSON.parse(JSON.stringify({format:'arena-live-configuration',schema:1,version:window.ArenaLive.version,rules:arenaCombatRules,runtime:arenaRuntime,camera:{shake:arenaScreenShake},obs:arenaObsCalibration,language:currentLanguage,display:{focus:monitorFocus},round:{mode:rejoinRuleMode,lives:MAX_OPPORTUNITIES,duration:matchDurationSeconds,pace:gamePace,countdowns:countdownsEnabled},layouts:arenaWorkspace.layouts}));
}
function importArenaConfiguration(value){
    const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(!object(value)||value.format!=='arena-live-configuration'||value.schema!==1||!object(value.rules)||!object(value.runtime))return false;
    for(const key of ['camera','obs','display','round','layouts'])if(value[key]!==undefined&&!object(value[key]))return false;
    const rules=normalizeArenaCombatRules(value.rules),runtime=ArenaCore.normalizeRuntime(value.runtime);
    const layouts=Object.fromEntries(['preparation','stream'].map(mode=>[mode,readArenaWorkspace(mode,value.layouts?.[mode]||arenaWorkspace.layouts[mode])]));
    for(const [key,v]of Object.entries(rules))setArenaCombatRule(key,v);
    for(const [key,v]of Object.entries(runtime))setArenaRuntimeOption(key,v);
    if(value.camera)setArenaScreenShake(value.camera.shake);
    if(value.obs)for(const key of ['offset','footer'])if(Object.hasOwn(value.obs,key))setArenaObsCalibration(key,value.obs[key]);
    if(value.language&&Object.hasOwn(LANGUAGE_LABELS,value.language))setLanguage(value.language);
    const round=value.round||{};
    if(['free','3_lives','timed'].includes(round.mode))setRejoinRuleMode(round.mode);
    if(Number.isFinite(round.lives)){if(rejoinRuleMode==='3_lives')setPlayerLives(round.lives);else MAX_OPPORTUNITIES=Math.max(1,Math.min(9,Math.round(round.lives)));}
    if(Number.isFinite(round.duration)){if(rejoinRuleMode==='timed')setMatchDuration(round.duration);else matchDurationSeconds=Math.max(30,Math.min(300,Math.round(round.duration)));}
    if([.75,1,1.25].includes(round.pace))setGamePace(round.pace);
    if(typeof round.countdowns==='boolean')setCountdownsEnabled(round.countdowns);
    for(const mode of ['preparation','stream']){arenaWorkspace.layouts[mode]=layouts[mode];try{localStorage.setItem(ARENA_WORKSPACE_KEYS[mode],JSON.stringify(layouts[mode]));}catch(_){}}
    applyArenaWorkspaceLayout();
    if(['16:9','9:16','dual'].includes(value.display?.focus))setMonitorFocus(value.display.focus);
    refreshArenaRuntimeControls();return true;
}
const ARENA_WARRIOR_POLICY_COPY=Object.freeze({
 es:['Guerreros: responden al rival cercano; prefieren otro Guerrero hasta un 25 % más lejos.','Guerreros: siempre priorizan otros Guerreros.'],
 en:['Warriors face the nearby rival; prefer another Warrior up to 25% farther away.','Warriors always prioritize other Warriors.'],
 fr:['Les Guerriers affrontent le rival proche ; préfèrent un Guerrier jusqu’à 25 % plus loin.','Les Guerriers privilégient toujours les Guerriers.'],
 de:['Krieger kämpfen gegen nahe Gegner; bevorzugen Krieger bis zu 25 % weiter entfernt.','Krieger bevorzugen immer andere Krieger.'],
 zh:['战士应对近处对手，优先选择距离不超过最近对手125%的其他战士。','战士始终优先攻击战士。'],
 ja:['戦士は近い相手に対処し、25%遠くまでなら戦士を優先。','戦士は常に他の戦士を優先。'],
 pt:['Guerreiros enfrentam o rival próximo; preferem outro Guerreiro até 25% mais longe.','Guerreiros sempre priorizam outros Guerreiros.'],
 it:['I Guerrieri affrontano il vicino; preferiscono un Guerriero fino al 25% più lontano.','I Guerrieri preferiscono sempre altri Guerrieri.']
});
function arenaWarriorPolicyText(){return(ARENA_WARRIOR_POLICY_COPY[currentLanguage]||ARENA_WARRIOR_POLICY_COPY.es)[arenaRuntime.warriorTargeting==='always'?1:0];}
const ARENA_EVIDENCE_COPY=Object.freeze({
 es:['Resultados medidos','Muestra','Duelo','Inicio','Victorias','IC 95 %','IA sin apoyos ni reingresos; rondas completas con cambios de modo. Arena usa cinco rotaciones por semilla. Los intervalos reflejan incertidumbre; no garantizan igualdad.','partidas','Ver metodología y datos','Cambiar reglas, prioridad o participación puede cambiar estos resultados.'],
 en:['Measured results','Sample','Duel','Starting players','Wins','95% CI','AI without boosts or re-entry; full matches with mode transitions. Arena groups use five rotations per seed. Intervals show uncertainty, not guaranteed equality.','matches','Method and data','Changing rules, targeting or participation can change these results.'],
 fr:['Résultats mesurés','Échantillon','Duel','Joueurs au départ','Victoires','IC 95 %','IA sans aide ni retour ; parties complètes avec transitions. Cinq rotations par graine en arène. Intervalles d’incertitude, sans garantie d’égalité.','parties','Méthode et données','Changer les règles ou la participation peut modifier ces résultats.'],
 de:['Gemessene Ergebnisse','Stichprobe','Duell','Spieler am Start','Siege','95%-KI','KI ohne Hilfen oder Wiedereinstieg; ganze Spiele mit Moduswechsel. Fünf Rotationen je Seed in Arenen. Intervalle zeigen Unsicherheit, keine garantierte Gleichheit.','Spiele','Methode und Daten','Andere Regeln, Ziele oder Zuschaueraktionen können Ergebnisse ändern.'],
 zh:['实测结果','样本','决斗','起始人数','胜率','95%区间','AI无支援和重新入场，完整比赛包含模式切换。竞技场每个种子有五次轮换。区间表示不确定性，不保证胜率相等。','场比赛','方法与数据','更改规则、目标偏好或观众参与会改变结果。'],
 ja:['実測結果','サンプル','決闘','開始人数','勝率','95%区間','支援と再参加なしのAI。モード移行を含む全試合。アリーナはシードごとに5配置。区間は不確実性を表し、同率を保証しません。','試合','方法とデータ','ルール・優先順位・視聴者参加で結果は変わります。'],
 pt:['Resultados medidos','Amostra','Duelo','Jogadores iniciais','Vitórias','IC 95%','IA sem apoios ou reentrada; partidas completas com transições. Cinco rotações por semente nas arenas. Intervalos indicam incerteza, sem garantir igualdade.','partidas','Método e dados','Mudar regras, prioridades ou participação pode alterar os resultados.'],
 it:['Risultati misurati','Campione','Duello','Giocatori iniziali','Vittorie','IC 95%','IA senza aiuti né rientri; partite complete con cambi di modalità. Cinque rotazioni per seme nelle arene. Intervalli di incertezza, senza garanzia di parità.','partite','Metodo e dati','Regole, priorità o partecipazione diverse possono cambiare i risultati.']
});
function refreshArenaBalanceEvidence(){
 const host=document.getElementById('arenaBalanceEvidence');if(!host)return;const w=ARENA_EVIDENCE_COPY[currentLanguage]||ARENA_EVIDENCE_COPY.es;
 const restoreFocus=host.contains(document.activeElement);
 const key=host.querySelector('select')?.value||'125',group=ARENA_BALANCE_EVIDENCE.groups[key];
 host.innerHTML=`<h4 class="font-bold text-xs">${w[0]}</h4><label class="flex flex-col gap-1 text-xs">${w[1]}<select id="arenaBalanceEvidenceScenario" class="min-w-0 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-slate-200" style="color-scheme:dark">${['duel','5','10','25','125'].map(k=>`<option value="${k}"${k===key?' selected':''}>${k==='duel'?w[2]:w[3]+': '+k}</option>`).join('')}</select></label><p class="arena-balance-hint">${group.matches} ${w[7]} · ≤ ${ARENA_BALANCE_EVIDENCE.sample.maxSeconds} s</p><table><thead><tr><th>${arenaBalanceText('class')}</th><th>${w[4]}</th><th>${w[5]}</th></tr></thead><tbody>${group.classes.map(row=>`<tr><th scope="row">${escapeHTML(localizedClassName(row.classKey))}</th><td>${row.winPct} % <small>(n=${row.matches})</small></td><td>${row.ci95.low}–${row.ci95.high} %</td></tr>`).join('')}</tbody></table><p class="arena-balance-hint">${w[6]}</p><p class="arena-balance-hint">${w[9]}</p><a class="text-xs text-cyan-300" href="https://github.com/PoldKent/arena-live/blob/main/docs/RELEASE-0.15-CORRECCIONES.md" target="_blank" rel="noopener">${w[8]}</a>`;
 host.querySelector('select').onchange=refreshArenaBalanceEvidence;if(restoreFocus)host.querySelector('select').focus({preventScroll:true});
}

const ARENA_PARTICIPATION_HELP=Object.freeze({
 es:'Participación libre: chat, Prota y pruebas pueden lanzar sin energía ni espera. Con cero energía, el poder usa el 25 %. La IA conserva sus límites.',
 en:'Free participation: chat, Prota and tests can cast without energy or cooldown. Zero energy uses 25% power. AI keeps its limits.',
 fr:'Participation libre : chat, Prota et tests sans énergie ni recharge. À zéro énergie, puissance 25 %. IA toujours limitée.',
 de:'Freie Teilnahme: Chat, Prota und Tests ohne Energie oder Abklingzeit. Bei null Energie 25 % Kraft. KI behält Grenzen.',
 zh:'自由参与：聊天、主角和测试无需能量或冷却。零能量时威力为25%。AI仍有原限制。',
 ja:'自由参加：チャット・Prota・テストはエネルギーと待機不要。ゼロでは威力25%。AIは制限を維持。',
 pt:'Participação livre: chat, Prota e testes sem energia ou recarga. Com zero energia, poder de 25%. IA mantém os limites.',
 it:'Partecipazione libera: chat, Prota e test senza energia o attesa. A zero energia, potenza 25%. IA mantiene i limiti.'
});
