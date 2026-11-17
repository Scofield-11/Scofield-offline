// Hanzi Writer 3.5.0's typed rendererOverride extension point. Keep its SVG
// renderer and animation algorithm; supply only a DOM target without quiz input
// listeners (the default target attaches non-removable document listeners).
const svgElement = (tag) => document.createElementNS('http://www.w3.org/2000/svg', tag);
function animationTarget(svg, defs) {
  return {
    node: svg, svg, defs,
    addPointerStartListener() {}, addPointerMoveListener() {}, addPointerEndListener() {},
    getBoundingClientRect: () => svg.getBoundingClientRect(),
    updateDimensions(width, height) {
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    },
    createSubRenderTarget() {
      const group = svgElement('g');
      svg.appendChild(group);
      return animationTarget(group, defs);
    },
  };
}
export function createAnimationTarget(element, width, height) {
  const svg = svgElement('svg');
  const defs = svgElement('defs');
  svg.appendChild(defs);
  element.appendChild(svg);
  const target = animationTarget(svg, defs);
  target.updateDimensions(width, height);
  return target;
}
