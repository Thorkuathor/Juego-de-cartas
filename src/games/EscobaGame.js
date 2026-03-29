import { Deck } from '../core/Deck.js';
import { Player } from '../core/UserManager.js';

/**
 * Game logic for Escoba (Broom).
 * Players aim to sum 15 with their hand and table cards.
 */
export class EscobaGame {
  constructor(playerNames) {
    this.deck = new Deck(false); // 40-card deck
    this.players = playerNames.map((name, i) => new Player(i, name));
    this.tableCards = [];
    this.turn = 0;
  }

  /**
   * Translates Spanish deck ranks to Escoba values.
   * Ranks 10 (Sota), 11 (Caballo), 12 (Rey) -> 8, 9, 10
   */
  _getCardValue(card) {
    if (!card) return 0;
    if (card.rank >= 10) return card.rank - 2;
    return card.rank;
  }

  start() {
    this.deck.reset(false);
    this.tableCards = this.deck.drawMultiple(4);
    this._dealToPlayers();
  }

  _dealToPlayers() {
    if (this.deck.remaining >= this.players.length * 3) {
      this.players.forEach(player => {
        player.hand = this.deck.drawMultiple(3);
      });
      return true;
    }
    return false;
  }

  resetRound() {
      this.deck.reset(false);
      this.tableCards = this.deck.drawMultiple(4);
      this.players.forEach(p => p.resetForNewRound());
      this.turn = 0;
  }

  checkRedeal() {
      const allHandsEmpty = this.players.every(p => p.hand.length === 0);
      if (allHandsEmpty && this.deck.remaining > 0) {
          return this._dealToPlayers();
      }
      return false;
  }

  /**
   * Main move in Escoba.
   * @param {Player} player 
   * @param {Card} handCard 
   * @param {Card[]} tableCardsToCapture 
   */
  playTurn(player, handCard, tableCardsToCapture) {
    const handValue = this._getCardValue(handCard);
    const tableSum = tableCardsToCapture.reduce((acc, c) => acc + this._getCardValue(c), 0);
    const sum = handValue + tableSum;

    if (tableCardsToCapture.length > 0 && sum === 15) {
      // Successful Capture
      player.capturedCards.push(handCard, ...tableCardsToCapture);
      this.tableCards = this.tableCards.filter(c => !tableCardsToCapture.includes(c));
      player.hand = player.hand.filter(c => c !== handCard);
      
      const broom = this.tableCards.length === 0;
      if (broom) player.pointsInRound += 1;
      
      return { 
          success: true, 
          capture: true, 
          message: broom ? '¡ESCOBA!' : 'Captura realizada.', 
          broom 
      };
    } else {
      // Play to table (Discard)
      this.tableCards.push(handCard);
      player.hand = player.hand.filter(c => c !== handCard);
      return { 
          success: true, 
          capture: false, 
          message: tableCardsToCapture.length > 0 ? 
            'La suma no es 15. La carta queda en la mesa.' : 
            'Carta jugada a la mesa.' 
      };
    }
  }

  calculateScores() {
    return this.players.map(p => {
        const oros = p.capturedCards.filter(c => c.suit === 'oros');
        const sietes = p.capturedCards.filter(c => c.rank === 7);
        const has7Oros = sietes.some(c => c.suit === 'oros');
        
        let score = p.pointsInRound; // Points from Escobas
        if (p.capturedCards.length > 20) score += 1;
        if (oros.length > 5) score += 1;
        if (sietes.length > 2) score += 1;
        if (has7Oros) score += 1;
        
        return {
            id: p.id,
            name: p.name,
            points: score,
            details: {
                cards: p.capturedCards.length,
                oros: oros.length,
                sietes: sietes.length,
                has7Oros
            }
        };
    });
  }

  getGameState(playerIndex) {
      const p = this.players[playerIndex];
      return {
          points: p.pointsInRound,
          capturedCount: p.capturedCards.length,
          orosCount: p.capturedCards.filter(c => c.suit === 'oros').length,
          deckRemaining: this.deck.remaining
      };
  }
}
