import { Deck } from '../core/Deck.js';
import { Player } from '../core/UserManager.js';

/**
 * Game logic for Tute (Spain).
 * Standard 2-player mode.
 */
export class TuteGame {
  constructor(playerNames) {
    this.deck = new Deck(false); // 40 cards
    this.players = playerNames.map((name, i) => new Player(i, name));
    this.players.forEach(p => p.capturedCards = []); // Ensure capturedCards is initialized
    
    this.trumpCard = null;
    this.trumpSuit = null;
    this.turn = 0; // 0 or 1
    this.leadSuit = null;
    this.currentTrick = []; // [{playerIdx, card}]
    this.lastTrickWinner = 0;
    this.isLastTrick = false;
    this.gamePhase = 'dealing'; // 'playing', 'finished'
    
    // Ranks power in Tute: As, 3, Rey, Caballo, Sota, 7, 6, 5, 4, 2
    this.rankPower = { 1: 10, 3: 9, 12: 8, 11: 7, 10: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
  }

  start() {
    this.resetRound();
  }

  resetRound() {
    this.deck.reset(false);
    this.players.forEach(p => {
        p.hand = [];
        p.capturedCards = [];
        p.pointsInRound = 0;
    });
    
    // Deal 8 cards to each player (standard for 2 players with drawing)
    // Or deal all cards? In 2-player Tute Khabanero/Arrastrado:
    // Usually 8 cards each, then draw from deck.
    this.players[0].hand = this.deck.drawMultiple(8);
    this.players[1].hand = this.deck.drawMultiple(8);
    
    this.trumpCard = this.deck.draw();
    this.trumpSuit = this.trumpCard.suit;
    
    // Put trump card back at the bottom of the deck (simplified)
    this.deck.cards.unshift(this.trumpCard);
    
    this.turn = 0;
    this.currentTrick = [];
    this.gamePhase = 'playing';
  }

  getGameState(playerIdx) {
    return {
        hand: this.players[playerIdx].hand,
        trumpSuit: this.trumpSuit,
        trumpCard: this.trumpCard,
        deckRemaining: this.deck.remaining,
        currentTrick: this.currentTrick,
        turn: this.turn,
        playerScores: this.players.map(p => p.pointsInRound),
        phase: this.gamePhase
    };
  }

  /**
   * Play a card from hand
   */
  playCard(playerIdx, card) {
    if (this.turn !== playerIdx) return { success: false, message: 'No es tu turno' };
    
    const player = this.players[playerIdx];
    const cardIdx = player.hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (cardIdx === -1) return { success: false, message: 'Carta no encontrada' };

    // Standard rules for 2 players (while deck has cards): You can play anything.
    // When deck is empty (Arrastrado): You MUST follow suit, win if possible, etc.
    if (this.deck.remaining === 0) {
        const canFollow = player.hand.some(c => c.suit === this.leadSuit);
        if (this.leadSuit && canFollow && card.suit !== this.leadSuit) {
            return { success: false, message: 'Debes seguir el palo inicial' };
        }
        // ... more complex arrastrado rules would go here
    }

    const playedCard = player.hand.splice(cardIdx, 1)[0];
    this.currentTrick.push({ playerIdx, card: playedCard });

    if (this.currentTrick.length === 1) {
        this.leadSuit = playedCard.suit;
        this.turn = 1 - this.turn;
    } else {
        this._resolveTrick();
    }

    return { success: true };
  }

  _resolveTrick() {
    const card1 = this.currentTrick[0].card;
    const card2 = this.currentTrick[1].card;
    const player1 = this.currentTrick[0].playerIdx;
    const player2 = this.currentTrick[1].playerIdx;

    let winner;
    
    // Resolve winner
    if (card1.suit === card2.suit) {
        winner = this.rankPower[card1.rank] > this.rankPower[card2.rank] ? player1 : player2;
    } else if (card2.suit === this.trumpSuit) {
        winner = player2;
    } else if (card1.suit === this.trumpSuit) {
        winner = player1;
    } else {
        winner = player1; // Lead suit wins
    }

    // Assign cards to winner
    this.players[winner].capturedCards.push(card1, card2);
    this.lastTrickWinner = winner;
    this.turn = winner;
    this.leadSuit = null;

    // Drawing phase
    if (this.deck.remaining > 0) {
        // Winner draws first
        this.players[winner].hand.push(this.deck.draw());
        this.players[1 - winner].hand.push(this.deck.draw());
    }

    this.currentTrick = [];

    // Check if game ended
    if (this.players[0].hand.length === 0 && this.players[1].hand.length === 0) {
        // Last trick bonus (Las diez de últimas)
        this.players[winner].pointsInRound += 10;
        this.gamePhase = 'finished';
    }
  }

  calculateScores() {
    return this.players.map(p => {
        let score = p.pointsInRound; // Includes bonuses
        p.capturedCards.forEach(c => {
            score += this.getCardValue(c);
        });
        
        return {
            id: p.id,
            name: p.name,
            points: score,
            details: { captured: p.capturedCards.length }
        };
    });
  }

  getCardValue(card) {
    const values = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
    return values[card.rank] || 0;
  }
}
