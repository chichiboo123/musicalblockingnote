export interface RecommendedPath {
  id: string;
  name: string;
  svg: string;
}

export const recommendedPaths: RecommendedPath[] = [
  {
    id: "linear",
    name: "Linear",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="50" x2="90" y2="50" stroke="#333" stroke-width="2" marker-end="url(#arrow)"/><defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs></svg>`,
  },
  {
    id: "circular",
    name: "Circular",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" stroke="#333" stroke-width="2" fill="none" stroke-dasharray="5,3"/></svg>`,
  },
  {
    id: "diagonal",
    name: "Diagonal",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="90" x2="90" y2="10" stroke="#333" stroke-width="2" marker-end="url(#arr2)"/><defs><marker id="arr2" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs></svg>`,
  },
  {
    id: "triangle",
    name: "Triangle",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 10,90 90,90" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "wave",
    name: "Wave",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 50 Q30 20 50 50 Q70 80 90 50" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "s-curve",
    name: "S-Curve",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 80 Q20 20 50 50 Q80 80 80 20" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "figure-8",
    name: "Figure-8",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 50 C20 20 20 80 50 50 C80 20 80 80 50 50" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "l-shape",
    name: "L-Shape",
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polyline points="20,20 20,80 80,80" stroke="#333" stroke-width="2" fill="none" marker-end="url(#arr3)"/><defs><marker id="arr3" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs></svg>`,
  },
];
