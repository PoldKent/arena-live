// Test-only counterfactuals. The runner serves this HTML from memory; the
// published index.html and saved player settings are never modified.
import assert from 'node:assert/strict';

const classes = ['kame', 'ninja', 'titan', 'trueno', 'esmeralda'];
const fields = new Set(['damage', 'targets', 'cooldown', 'windup', 'aiRange', 'hitRange']);
export function balanceVariant(productionHtml, variant, tuning = {}) {
  assert.ok(['published', 'nearest', 'titan-nearest'].includes(variant), 'Unknown balance variant');
  for (const [mode, rules] of Object.entries(tuning)) {
    assert.ok(['1v1', 'smash', 'iso'].includes(mode), 'Unknown tuning mode');
    for (const [key, values] of Object.entries(rules)) {
      assert.ok(classes.includes(key), 'Unknown tuning class');
      for (const [field, value] of Object.entries(values)) {
        assert.ok(fields.has(field) && Number.isFinite(value) && value > 0, 'Invalid tuning value');
        if (['targets', 'cooldown', 'windup'].includes(field)) assert.ok(Number.isInteger(value));
      }
    }
  }
  let html = productionHtml;
  const patch = (before, after) => {
    const next = html.replace(before, after);
    assert.notEqual(next, html, `Experimental patch must match this engine: ${String(before).slice(0, 90)}`);
    html = next;
  };
  if (variant !== 'published') patch("if (attacker.archetypeKey === 'titan') {", 'if (false) {');
  if (variant === 'nearest') {
    patch(/const CLASS_RIVALRIES = Object\.freeze\(\{[\s\S]*?\}\);/,
      'const CLASS_RIVALRIES = Object.freeze({kame:null,ninja:null,titan:null,trueno:null,esmeralda:null});');
    patch("distA * (a.archetypeKey === 'ninja' ? 0.65 : 1)", 'distA');
    patch("distB * (b.archetypeKey === 'ninja' ? 0.65 : 1)", 'distB');
  }
  if (!Object.keys(tuning).length) return html;
  patch('function tryAutonomousFighterSpecial(fighter, target) {', `
        const EXPERIMENTAL_BALANCE = ${JSON.stringify(tuning)};
        function experimentalRule(fighter, name, fallback) {
            return EXPERIMENTAL_BALANCE[activeMode]?.[fighter.archetypeKey]?.[name] ?? fallback;
        }
        function experimentalTargets(candidates, fighter) {
            const cap = experimentalRule(fighter, 'targets', Infinity);
            if (!Number.isFinite(cap)) return candidates;
            return candidates.sort((a,b) => Math.hypot(a.x-fighter.x,a.y-fighter.y)-Math.hypot(b.x-fighter.x,b.y-fighter.y)).slice(0,cap);
        }
        function tryAutonomousFighterSpecial(fighter, target) {`);
  patch('const range = AI_SPECIAL_RULES.maxRangeByClass[fighter.archetypeKey] || 140;',
    "const range = experimentalRule(fighter, 'aiRange', AI_SPECIAL_RULES.maxRangeByClass[fighter.archetypeKey] || 140);");
  patch('fighter.aiSpecialCooldown = AI_SPECIAL_RULES.cooldownFrames;',
    "fighter.aiSpecialCooldown = experimentalRule(fighter, 'cooldown', AI_SPECIAL_RULES.cooldownFrames);");
  patch('Math.max(fighter.aiSpecialCooldown, 480)', "Math.max(fighter.aiSpecialCooldown, experimentalRule(fighter, 'cooldown', 480))");
  patch('timer: 34, // visible and interruptible charge', "timer: experimentalRule(fighter, 'windup', 34), // experimental charge");
  patch('maxTimer: 34,', "maxTimer: experimentalRule(fighter, 'windup', 34),");
  for (const [key, amount, knockback] of [['kame',38,10.5], ['ninja',34,11.5], ['titan',46,14], ['trueno',32,8.5], ['esmeralda',38,14.5]]) {
    patch(`applyDamage(target, ${amount}, fighter, true, ${knockback}, 'special')`,
      `applyDamage(target, experimentalRule(fighter, 'damage', ${amount}), fighter, true, ${knockback}, 'special')`);
  }
  patch('Math.hypot(other.x - fighter.x, other.y - fighter.y) < 170',
    "Math.hypot(other.x - fighter.x, other.y - fighter.y) < experimentalRule(fighter, 'hitRange', 170)");
  patch('nearbyTargets.slice(0, 3).forEach(target => {', "nearbyTargets.slice(0, experimentalRule(fighter, 'targets', 3)).forEach(target => {");
  // Preserve uncapped ordering unless that mode/class explicitly has a cap.
  const kameStart = html.indexOf("if (cmd === '!kame' || cmd === '!kamehameha') {");
  const kameEnd = html.indexOf("} else if (cmd === '!rasen'", kameStart);
  assert.ok(kameStart > 0 && kameEnd > kameStart);
  const kame = html.slice(kameStart, kameEnd);
  const cappedKame = kame.replace('fighters.forEach(target => {', `experimentalTargets(fighters.filter(target => canFighterAttack(fighter, target)
                    && (dir === 1 ? target.x > fighter.x - 10 : target.x < fighter.x + 10)
                    && Math.abs(target.y - fighter.y) < 75), fighter).forEach(target => {`);
  assert.notEqual(cappedKame, kame); html = html.slice(0,kameStart)+cappedKame+html.slice(kameEnd);
  const titanStart = html.indexOf("} else if (cmd === '!coloso' || cmd === '!golpecolosal') {");
  const titanEnd = html.indexOf('function applyDamage(', titanStart);
  assert.ok(titanStart > 0 && titanEnd > titanStart);
  const titan = html.slice(titanStart, titanEnd);
  const cappedTitan = titan.replace('fighters.forEach(target => {', `experimentalTargets(fighters.filter(target => canFighterAttack(fighter, target)
                    && Math.hypot(target.x-fighter.x,target.y-fighter.y) <= 135), fighter).forEach(target => {`);
  assert.notEqual(cappedTitan, titan); html = html.slice(0,titanStart)+cappedTitan+html.slice(titanEnd);
  return html;
}
