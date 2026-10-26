// Bounded Web Audio synthesizer; public playSound/toggleSound names preserved.
        let soundEnabled = true;
        let audioCtx = null, arenaMasterGain=null;
        const arenaAudioVoices=new Set(),arenaAudioLast=new Map();
        const ARENA_AUDIO_TYPES=new Set(['hit','crit','charge','laser','thunder','powerup','victory','doublejump','transition']);
        function refreshArenaAudioVolume(){if(arenaMasterGain)arenaMasterGain.gain.setValueAtTime(soundEnabled?arenaRuntime.masterVolume/100:0,audioCtx.currentTime);}


        function initAudio() {
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {audioCtx = new AudioContextClass();arenaMasterGain=audioCtx.createGain();arenaMasterGain.connect(audioCtx.destination);refreshArenaAudioVolume();}
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                Promise.resolve(audioCtx.resume()).catch(()=>{});
            }
        }

        function playSound(type) {
            if (!soundEnabled||!ARENA_AUDIO_TYPES.has(type)||arenaRuntime.masterVolume===0) return;
            try {
                initAudio();
                if (!audioCtx) return;
                const now = audioCtx.currentTime;
                if(now-(arenaAudioLast.get(type)??-Infinity)<.03)return;
                if(arenaAudioVoices.size>=16){if(type!=='victory'&&type!=='transition')return;const oldest=[...arenaAudioVoices].find(v=>v.type!=='victory');if(!oldest)return;oldest.osc.stop();oldest.cleanup();}
                arenaAudioLast.set(type,now);
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(arenaMasterGain);
                const voice={osc,type,cleanup(){osc.disconnect();gain.disconnect();arenaAudioVoices.delete(voice);}};
                arenaAudioVoices.add(voice);osc.onended=()=>voice.cleanup();

                if (type === 'hit') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(145, now);
                    osc.frequency.exponentialRampToValueAtTime(45, now + 0.11);
                    gain.gain.setValueAtTime(0.11, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.11);
                    osc.start(now);
                    osc.stop(now + 0.11);
                } else if (type === 'crit') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(290, now);
                    osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);
                    gain.gain.setValueAtTime(0.16, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
                    osc.start(now);
                    osc.stop(now + 0.18);
                } else if (type === 'charge') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.exponentialRampToValueAtTime(620, now + 0.45);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
                    osc.start(now);
                    osc.stop(now + 0.45);
                } else if (type === 'laser') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(520, now);
                    osc.frequency.exponentialRampToValueAtTime(120, now + 0.55);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.55);
                    osc.start(now);
                    osc.stop(now + 0.55);
                } else if (type === 'thunder') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(640, now);
                    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                } else if (type === 'powerup') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(310, now);
                    osc.frequency.exponentialRampToValueAtTime(740, now + 0.25);
                    gain.gain.setValueAtTime(0.14, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                    osc.start(now);
                    osc.stop(now + 0.25);
                } else if (type === 'victory') {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.setValueAtTime(554.37, now + 0.14);
                    osc.frequency.setValueAtTime(659.25, now + 0.28);
                    osc.frequency.setValueAtTime(880, now + 0.42);
                    gain.gain.setValueAtTime(0.22, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.85);
                    osc.start(now);
                    osc.stop(now + 0.85);
                } else if (type === 'doublejump') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(280, now);
                    osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
                    gain.gain.setValueAtTime(0.13, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.16);
                    osc.start(now);
                    osc.stop(now + 0.16);
                } else if (type === 'transition') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(190, now);
                    osc.frequency.setValueAtTime(380, now + 0.12);
                    osc.frequency.setValueAtTime(570, now + 0.26);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.linearRampToValueAtTime(0.01, now + 0.55);
                    osc.start(now);
                    osc.stop(now + 0.55);
                }
            } catch (e) {
                // Ignore audio context restrictions before user interaction
            }
        }

        function toggleSound() {
            soundEnabled = !soundEnabled;
            refreshArenaAudioVolume();
            const icon = document.getElementById('audioIcon');
            const label = document.getElementById('audioStatusLabel');
            if (icon) {
                icon.className = soundEnabled ? 'fa-solid fa-volume-high text-cyan-400' : 'fa-solid fa-volume-xmark text-slate-500';
            }
            if (label) {
                label.textContent = arenaText(soundEnabled ? 'soundOn' : 'soundOff');
            }
            const quickBtn = document.getElementById('btnQuickSound');
            const quickIcon = document.getElementById('quickSoundIcon');
            if (quickBtn) quickBtn.className = soundEnabled
                ? 'px-2 py-1.5 rounded-lg bg-slate-800 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold'
                : 'px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-500 text-[10px] font-bold';
            if (quickIcon) quickIcon.textContent = soundEnabled ? '🔊' : '🔇';
            refreshArenaOperatorToolbar();
        }

