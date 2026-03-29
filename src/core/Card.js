/**
 * Represents the four suits in a Spanish deck.
 */
export const SUITS = {
  OROS: 'oros',
  COPAS: 'copas',
  ESPADAS: 'espadas',
  BASTOS: 'bastos'
};

/**
 * Represents a single Spanish card.
 */
export class Card {
  /**
   * @param {number} rank - Rank from 1 to 12.
   * @param {string} suit - Suit from SUITS.
   */
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  get name() {
    const rankNames = {
      1: 'As',
      10: 'Sota',
      11: 'Caballo',
      12: 'Rey'
    };
    const nameStr = rankNames[this.rank] || this.rank.toString();
    return `${nameStr} de ${this.suit.charAt(0).toUpperCase() + this.suit.slice(1)}`;
  }

  get value() {
    // Normal value (can be overridden by specific games)
    return this.rank;
  }

  toString() {
    return this.name;
  }
}
