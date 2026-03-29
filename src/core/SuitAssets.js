/**
 * High-quality SVG assets for Spanish Card Suits.
 * Designed to look like traditional Fournier/Spanish style.
 */
export const SUIT_SVGS = {
  oros: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#f1c40f" stroke="#b8860b" stroke-width="2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#b8860b" stroke-width="1" />
      <path d="M40 40 Q50 35 60 40 M45 60 Q50 70 55 60" stroke="#b8860b" fill="none" />
      <circle cx="43" cy="45" r="2" fill="#b8860b" />
      <circle cx="57" cy="45" r="2" fill="#b8860b" />
    </svg>
  `,
  copas: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 20 H75 V45 Q75 65 50 65 Q25 65 25 45 Z" fill="#e74c3c" stroke="#2c3e50" stroke-width="1.5" />
      <rect x="46" y="65" width="8" height="20" fill="#c0392b" />
      <ellipse cx="50" cy="85" rx="20" ry="5" fill="#e74c3c" stroke="#2c3e50" />
      <path d="M30 25 H70" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
    </svg>
  `,
  espadas: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5 L62 35 V75 H38 V35 L50 5" fill="#ecf0f1" stroke="#2c3e50" stroke-width="1.5" />
      <path d="M30 75 H70 L70 82 H30 Z" fill="#2980b9" />
      <rect x="45" y="82" width="10" height="15" fill="#34495e" />
    </svg>
  `,
  bastos: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M40 90 Q30 50 45 10 Q55 10 65 50 Q75 90 40 90" fill="#27ae60" stroke="#1b5e20" stroke-width="1.5" />
      <path d="M48 20 L55 25 M42 40 L50 45 M48 60 L55 65" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5" />
      <ellipse cx="50" cy="90" rx="15" ry="5" fill="#c0392b" />
    </svg>
  `
};

/**
 * Simplified SVG figures for Sota, Caballo, Rey.
 */
export const FIGURE_SVGS = {
    10: (suitColor) => `
        <svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="30" r="15" fill="#f3e5ab" stroke="#4a3410" />
            <path d="M30 45 H70 L75 120 H25 Z" fill="${suitColor}" stroke="#4a3410" />
            <rect x="40" y="120" width="8" height="20" fill="#4a3410" />
            <rect x="52" y="120" width="8" height="20" fill="#4a3410" />
        </svg>
    `,
    11: (suitColor) => `
        <svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 100 Q10 70 30 60 Q50 50 70 80 Q80 110 60 130 H20 Z" fill="#795548" />
            <circle cx="65" cy="50" r="12" fill="#f3e5ab" stroke="#4a3410" />
            <path d="M55 62 H75 L80 100 H50 Z" fill="${suitColor}" />
        </svg>
    `,
    12: (suitColor) => `
        <svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 50 H80 L90 140 H10 Z" fill="${suitColor}" stroke="#4a3410" />
            <circle cx="50" cy="35" r="18" fill="#f3e5ab" stroke="#4a3410" />
            <path d="M35 20 L40 10 L50 20 L60 10 L65 20" stroke="#d4af37" stroke-width="4" fill="none" />
        </svg>
    `
};
