// Study-only intervention. It never runs in the shipped page or bridge.
// Restore the previous Arena profile and Warrior targeting on the same corrected engine.
import assert from 'node:assert/strict';
export function applyBalanceControl(html){
    const previous={kame:{damage:38,windup:34,targets:3},ninja:{damage:60,windup:20,targets:1},titan:{damage:38,windup:34,targets:3},trueno:{damage:32,windup:34,targets:3},esmeralda:{damage:60,windup:20,targets:1}};
    const start=html.indexOf('            iso: Object.freeze({',html.indexOf('const ARENA_CLASS_BALANCE'));
    const end=html.indexOf('\n            })',start);
    assert.ok(start>=0&&end>start,'Native Arena profile not found');
    const profile='            iso: Object.freeze({\n'+Object.entries(previous).map(([key,r])=>`                ${key}: Object.freeze({damage:${r.damage},windup:${r.windup},targets:${r.targets}})`).join(',\n');
    html=html.slice(0,start)+profile+html.slice(end);
    const target=/if \(preferSameClass\) return arenaRuntime\.warriorTargeting==='always'\?preferred:[\s\S]*?\?preferred:closest;/;
    assert.match(html,target,'Native Warrior local policy not found');
    return html.replace(target,'if (preferSameClass) return preferred;').replace("'class-priority-local'","'class-priority-shinobi-local-control'");
}
