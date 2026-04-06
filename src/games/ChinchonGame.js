import { Deck } from '../core/Deck.js';
import { Player } from '../core/UserManager.js';

/**
 * Game logic for Chinchón.
 * Aim to combine cards and avoid unmatched points.
 */
export class ChinchonGame {
  constructor(playerNames) {
    this.deck = new Deck(false);
    this.players = playerNames.map((name, i) => new Player(i, name));
    this.discards = [];
    this.turn = 0; // 0 for player 1, 1 for player 2
    this.hasDrawnThisTurn = false;
  }

  start() {
    this.resetRound();
  }

  resetRound() {
    this.deck.reset(false);
    this.players.forEach(p => {
        p.hand = [];
        p.pointsInRound = 0; // we can use this if needed, or totalPoints
    });
    this.discards = [];
    this.turn = 0;
    this.hasDrawnThisTurn = false;
    this._deal();
  }

  _deal() {
    this.players.forEach(p => {
        p.hand = this.deck.drawMultiple(7);
    });
    this.discards.push(this.deck.draw());
  }

  drawFromDeck(player) {
    if (this.hasDrawnThisTurn) return { success: false, message: 'Ya has robado.' };
    if (this.deck.remaining === 0) {
        // reshuffle discards into deck except top card
        const topDiscard = this.discards.pop();
        this.deck.cards = [...this.discards].reverse();
        this.discards = [topDiscard];
    }
    const card = this.deck.draw();
    player.hand.push(card);
    this.hasDrawnThisTurn = true;
    return { success: true, card };
  }

  drawFromDiscard(player) {
    if (this.hasDrawnThisTurn) return { success: false, message: 'Ya has robado.' };
    if (this.discards.length === 0) return { success: false, message: 'No hay cartas en el descarte.' };
    const card = this.discards.pop();
    player.hand.push(card);
    this.hasDrawnThisTurn = true;
    return { success: true, card };
  }

  discardCard(player, cardToDiscard) {
      if (!this.hasDrawnThisTurn) return { success: false, message: 'Debes robar una carta primero.' };
      
      const idx = player.hand.findIndex(c => c.rank === cardToDiscard.rank && c.suit === cardToDiscard.suit);
      if (idx !== -1) {
          const [card] = player.hand.splice(idx, 1);
          this.discards.push(card);
          this.hasDrawnThisTurn = false;
          this.turn = (this.turn + 1) % this.players.length;
          return { success: true };
      }
      return { success: false, message: 'Carta no encontrada en la mano.' };
  }

  /**
   * Check if cards form a valid set (triplet/quartet of same rank).
   * @param {Card[]} cards 
   */
  isValidSet(cards) {
    if (cards.length < 3) return false;
    const rank = cards[0].rank;
    return cards.every(c => c.rank === rank);
  }

  /**
   * Check if cards form a valid stair (same suit, sequential ranks).
   * @param {Card[]} cards 
   */
  isValidStair(cards) {
    if (cards.length < 3) return false;
    const suit = cards[0].suit;
    if (!cards.every(c => c.suit === suit)) return false;
    
    // Sort ranks (adjusting for Spanish deck if needed, but 1-7, 10-12 usually)
    const sortedRanks = cards.map(c => c.rank).sort((a,b) => a - b);
    for (let i = 0; i < sortedRanks.length - 1; i++) {
        // simplistic check, ideally we handle missing 8,9: 7 -> 10 jump
        let diff = sortedRanks[i+1] - sortedRanks[i];
        if (sortedRanks[i] === 7 && sortedRanks[i+1] === 10) diff = 1; // fake sequence
        if (diff !== 1) return false;
    }
    return true;
  }

  /**
   * Get basic unmatched point sum
   */
  calculatePoints(player, validGroups = []) {
    const groupedCards = [].concat(...validGroups);
    const unmatchedCards = player.hand.filter(c => !groupedCards.includes(c));
    return unmatchedCards.reduce((sum, c) => sum + (c.rank >= 10 ? 10 : c.rank), 0);
  }

  /**
   * Close the round (Cerrar).
   * Must have less than 5 points remaining.
   */
  canClose(player, validGroups = []) {
      // In a real sophisticated game, we would auto-detect best groups.
      // Here we will do a simplified check for demo purposes.
      // E.g., if hand points are < 5 assuming best grouping
      // For now we will allow closing if raw score is small, or by doing a naive check
      
      const testPoints = this.calculatePoints(player, validGroups);
      if (testPoints < 5) return true;
      
      // Let's at least allow closing if they have a real good hand or <= 5 points
      // We will blindly allow it if length is 7 and points are small.
      return this._autoCalculateBestPoints(player.hand) < 5;
  }

  calculateScores() {
      return this.players.map(p => {
          let pts = this._autoCalculateBestPoints(p.hand);
          if (pts === 0) pts = -10;
          p.pointsInRound = pts;
          return {
              id: p.id,
              name: p.name,
              points: pts,
              details: {
                  cards: p.hand.length
              }
          };
      });
  }

  // Recursive auto-calculator for points to find valid combinations
  _autoCalculateBestPoints(hand) {
      const calcRaw = (cards) => cards.reduce((sum, c) => sum + (c.rank >= 10 ? 10 : c.rank), 0);
      let minPoints = calcRaw(hand);

      const search = (handRemaining) => {
          if (handRemaining.length < 3) {
              const pts = calcRaw(handRemaining);
              if (pts < minPoints) minPoints = pts;
              return;
          }
          
          let foundGroup = false;
          const powerset = this._getCombinations(handRemaining, 3);
          
          for (const combo of powerset) {
              if (this.isValidSet(combo) || this.isValidStair(combo)) {
                  foundGroup = true;
                  const newRemaining = handRemaining.filter(c => !combo.includes(c));
                  search(newRemaining);
              }
          }

          if (!foundGroup) {
              const pts = calcRaw(handRemaining);
              if (pts < minPoints) minPoints = pts;
          }
      };

      search([...hand]); // create copy
      return minPoints;
  }

  // Helper to generate combinations
  _getCombinations(array, minSize) {
      const result = [];
      const combine = (start, combo) => {
          if (combo.length >= minSize) {
              result.push([...combo]);
          }
          for (let i = start; i < array.length; i++) {
              combo.push(array[i]);
              combine(i + 1, combo);
              combo.pop();
          }
      };
      combine(0, []);
      return result;
  }

  getGameState(playerIndex) {
      const p = this.players[playerIndex];
      return {
          handSize: p.hand.length,
          deckRemaining: this.deck.remaining,
          discardTop: this.discards.length > 0 ? this.discards[this.discards.length - 1] : null,
          isMyTurn: this.turn === playerIndex,
          hasDrawnThisTurn: this.hasDrawnThisTurn
      };
  }
}
