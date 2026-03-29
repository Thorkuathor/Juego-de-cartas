import { Deck } from '../core/Deck.js';
import { Player } from '../core/UserManager.js';

/**
 * Game logic for Mus.
 * Grande (highest), Chica (lowest), Pares (pairs), Juego/Punto (sum 31+).
 */
export class MusGame {
  constructor(playerNames) {
    this.deck = new Deck(false);
    this.players = playerNames.map((name, i) => new Player(i, name));
    this._deal();
  }

  start() {
      this.resetRound();
  }

  resetRound() {
      this.deck.reset(false);
      this.players.forEach(p => { 
          p.hand = []; 
          p.pointsInRound = 0; 
      });
      this._deal();
  }

  _deal() {
    this.players.forEach(p => {
        p.hand = this.deck.drawMultiple(4);
    });
  }

  calculateScores() {
      return this.players.map((p, idx) => {
          // Fake calculation for quick UX demonstration
          let pts = Math.floor(Math.random() * 10) + 1; 
          p.pointsInRound = pts;
          return {
              id: p.id,
              name: p.name,
              points: pts,
              details: {}
          };
      });
  }

  /**
   * Determine score for Grande (High cards).
   * Note: In Mus, 3=Kings (12) and 2=Aces (1). 
   * @param {Player} p 
   */
  getGrandeScore(p) {
    const ranks = p.hand.map(c => (c.rank === 3 ? 12 : (c.rank === 2 ? 1 : c.rank)));
    return ranks.sort((a, b) => b - a);
  }

  /**
   * Determine score for Chica (Low cards).
   */
  getChicaScore(p) {
    const ranks = p.hand.map(c => (c.rank === 3 ? 12 : (c.rank === 2 ? 1 : c.rank)));
    return ranks.sort((a, b) => a - b);
  }

  /**
   * Check for Pares.
   * 0: None, 1: Parejas, 2: Medias (3 of a kind), 3: Duples (2 pairs or 4 of a kind).
   */
  getParesType(p) {
    const counts = {};
    p.hand.forEach(c => {
        const rank = (c.rank === 3 ? 12 : (c.rank === 2 ? 1 : c.rank));
        counts[rank] = (counts[rank] || 0) + 1;
    });

    const values = Object.values(counts);
    if (values.includes(4)) return 3; // Duples
    if (values.filter(v => v === 2).length === 2) return 3; // Duples
    if (values.includes(3)) return 2; // Medias
    if (values.includes(2)) return 1; // Parejas
    return 0; // None
  }

  /**
   * Calculate point sum for "Juego" (sum of ranks).
   * 12/11/10/3/1 = 10 pts, others = face value.
   */
  getJuegoSum(p) {
    return p.hand.reduce((sum, c) => {
        if ([12, 11, 10, 3].includes(c.rank)) return sum + 10;
        if (c.rank === 2 || c.rank === 1) return sum + 1;
        return sum + c.rank;
    }, 0);
  }

  hasJuego(p) {
    return this.getJuegoSum(p) >= 31;
  }
}
