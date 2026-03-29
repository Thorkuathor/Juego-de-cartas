import { Deck } from '../core/Deck.js';
import { Player } from '../core/UserManager.js';

/**
 * Game logic for Tute (Spain).
 * Aim to capture cards and "cante" (forty/twenty).
 */
export class TuteGame {
  constructor(playerNames, trumpSuit = 'oros') {
    this.deck = new Deck(false);
    this.players = playerNames.map((name, i) => new Player(i, name));
    this.trump = trumpSuit;
    this._deal();
  }

  start() {
    this.resetRound();
  }

  resetRound() {
    this.deck.reset(false);
    this.players.forEach(p => { p.hand = []; p.pointsInRound = 0; });
    const suits = ['oros', 'copas', 'espadas', 'bastos'];
    this.trump = suits[Math.floor(Math.random() * suits.length)];
    this._deal();
  }

  _deal() {
    this.players.forEach(p => {
        p.hand = this.deck.drawMultiple(10);
    });
  }

  getGameState(idx) {
      return {
          trump: this.trump,
          deckRemaining: this.deck.remaining
      };
  }

  calculateScores() {
      // Stub calculateScores simulation from hand value + random points
      return this.players.map((p, idx) => {
          let pts = p.hand.reduce((acc, c) => acc + this.getCardValue(c), 0);
          if (idx === 1) pts = Math.floor(Math.random() * 50) + 20; // Bot random score
          p.pointsInRound = pts;
          return {
              id: p.id,
              name: p.name,
              points: pts,
              details: { cards: p.hand.length }
          };
      });
  }

  /**
   * Determine the value of a card in Tute.
   * As=11, 3=10, Rey=4, Caballo=3, Sota=2, others=0.
   */
  getCardValue(card) {
    const values = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
    return values[card.rank] || 0;
  }

  /**
   * Compare two cards to see which wins the trick (baza).
   */
  compareCards(card1, card2, leadSuit) {
    if (card1.suit === this.trump && card2.suit !== this.trump) return card1;
    if (card2.suit === this.trump && card1.suit !== this.trump) return card2;
    
    // Same suit or neither is trump
    if (card1.suit === card2.suit) {
        // Higher value rank wins (A, 3, R, C, S, 7, 6, 5, 4, 2)
        const rankPower = { 1: 10, 3: 9, 12: 8, 11: 7, 10: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
        return rankPower[card1.rank] > rankPower[card2.rank] ? card1 : card2;
    }
    
    // Different suits, no trumps: first card wins by default (manda el palo)
    return card1;
  }

  /**
   * Check for "Cantes".
   * Forty (Rey/Caballo of trump), Twenty (Rey/Caballo of other).
   */
  checkCante(player, suit) {
    const hasRey = player.hand.some(c => c.rank === 12 && c.suit === suit);
    const hasCaballo = player.hand.some(c => c.rank === 11 && c.suit === suit);
    
    if (hasRey && hasCaballo) {
        return suit === this.trump ? 40 : 20;
    }
    return 0;
  }
}
