// Compare Tailwind's required CSS against the shipped stylesheet.
// Having obsolete selectors is harmless; missing selectors or changed
// declarations are not. No browser or runtime CSS compiler is involved.
export function missingCssRules(postcss, published, required) {
  function index(source) {
    const keys = new Set();
    const root = postcss.parse(source);
    const ancestry = node => {
      const parents = [];
      for (let current = node.parent; current && current.type !== 'root'; current = current.parent) {
        if (current.type === 'atrule') parents.unshift([current.name, current.params]);
      }
      return parents;
    };
    root.walkRules(rule => {
      const signature = JSON.stringify([
        ancestry(rule),
        rule.nodes.map(node => node.type === 'decl'
          ? [node.type, node.prop, node.value, node.important]
          : [node.type, node.toString()])
      ]);
      for (const selector of rule.selectors) keys.add(JSON.stringify([signature, selector.trim()]));
    });
    // Preserve standalone at-rules with declarations, e.g. @font-face.
    root.walkAtRules(rule => {
      if (!rule.nodes?.length || !rule.nodes.every(node => node.type === 'decl')) return;
      const signature = JSON.stringify([
        ancestry(rule), rule.name, rule.params,
        rule.nodes.map(node => [node.prop, node.value, node.important])
      ]);
      keys.add(JSON.stringify(['atrule', signature]));
    });
    return keys;
  }
  const available = index(published);
  return [...index(required)].filter(key => !available.has(key));
}
