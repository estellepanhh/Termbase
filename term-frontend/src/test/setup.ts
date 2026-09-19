import '@testing-library/jest-dom/vitest'

// Ant Design probes pseudo-element styles for its Drawer scrollbar. JSDOM does
// not implement that overload, so tests use the element style instead.
const getComputedStyleWithoutPseudoElements = window.getComputedStyle.bind(window)

window.getComputedStyle = ((element: Element, pseudoElement?: string | null) => {
  if (pseudoElement) {
    return getComputedStyleWithoutPseudoElements(element)
  }

  return getComputedStyleWithoutPseudoElements(element, pseudoElement)
}) as typeof window.getComputedStyle
