import { Card, SUITS } from './Card.js';

/**
 * Manages a standard Spanish deck of cards (40 or 48).
 */
export class Deck {
  /**
   * @param {boolean} include89 - Whether to include 8 and 9 (standard 40 or 48 deck).
   */
  constructor(include89 = false) {
    this.cards = [];
    this._initialize(include89);
    this.shuffle();
  }

  _initialize(include89) {
    this.cards = [];
    const suitsValue = Object.values(SUITS);
    for (const suit of suitsValue) {
      for (let rank = 1; rank <= 12; rank++) {
        if (!include89 && (rank === 8 || rank === 9)) continue;
        this.cards.push(new Card(rank, suit));
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    if (this.cards.length === 0) throw new Error('No more cards in the deck.');
    return this.cards.pop();
  }

  drawMultiple(count) {
    const hand = [];
    for (let i = 0; i < count; i++) {
        hand.push(this.draw());
    }
    return hand;
  }

  get remaining() {
    return this.cards.length;
  }

  reset(include89 = false) {
    this._initialize(include89);
    this.shuffle();
  }
}
