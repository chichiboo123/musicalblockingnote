export interface RecommendedPath {
  id: string;
  name: string;
  svg: string;
}

export const recommendedPaths: RecommendedPath[] = [
  {
    id: "linear",
    name: "직선",
    svg: `<svg viewBox="8 41 84 18" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="50" x2="90" y2="50" stroke="#333" stroke-width="2" marker-end="url(#arrow)"/><defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs></svg>`,
  },
  {
    id: "circular",
    name: "원형",
    svg: `<svg viewBox="12 12 76 76" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" stroke="#333" stroke-width="2" fill="none" stroke-dasharray="5,3"/></svg>`,
  },
  {
    id: "diagonal",
    name: "대각선",
    svg: `<svg viewBox="7 7 87 87" xmlns="http://www.w3.org/2000/svg"><line x1="10" y1="90" x2="90" y2="10" stroke="#333" stroke-width="2" marker-end="url(#arr2)"/><defs><marker id="arr2" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs></svg>`,
  },
  {
    id: "triangle",
    name: "삼각형",
    svg: `<svg viewBox="6 5.5 88 88" xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 10,90 90,90" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "wave",
    name: "물결",
    svg: `<svg viewBox="7 32 86 36" xmlns="http://www.w3.org/2000/svg"><path d="M10 50 Q30 20 50 50 Q70 80 90 50" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "s-curve",
    name: "S자 곡선",
    svg: `<svg viewBox="17 18 66 64" xmlns="http://www.w3.org/2000/svg"><path d="M20 80 Q20 20 50 50 Q80 80 80 20" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "figure-8",
    name: "8자형",
    svg: `<svg viewBox="24 38 52 24" xmlns="http://www.w3.org/2000/svg"><path d="M50 50 C20 20 20 80 50 50 C80 20 80 80 50 50" stroke="#333" stroke-width="2" fill="none"/></svg>`,
  },
  {
    id: "l-shape",
    name: "ㄴ자형",
    svg: `<svg viewBox="17 18 65 71" xmlns="http://www.w3.org/2000/svg"><polyline points="20,20 20,80 80,80" stroke="#333" stroke-width="2" fill="none" marker-end="url(#arr3)"/><defs><marker id="arr3" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs></svg>`,
  },
];
