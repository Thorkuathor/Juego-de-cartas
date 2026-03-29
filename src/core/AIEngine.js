/**
 * Decision-making engine for the card games AI.
 */
export class AIEngine {
  /**
   * Logic for Escoba: Finds the best combination that sums 15.
   * Priority: 7 of Oros > Most Cards > Any capture.
   */
    static getEscobaMove(hand, table) {
      const combinations = [];
      const getVal = (c) => (c.rank >= 10 ? c.rank - 2 : c.rank);
      
      for (const handCard of hand) {
          const handValue = getVal(handCard);
          const target = 15 - handValue;
          
          const subcombinations = this._getPowerSet(table).filter(subset => 
              subset.reduce((acc, c) => acc + getVal(c), 0) === target
          );
        
        for (const subset of subcombinations) {
            combinations.push({ handCard, tableSubset: subset });
        }
    }

    if (combinations.length === 0) return { handCard: hand[0], tableSubset: [] }; // Drop any card
    
    // Pick the best combination (7 of Oros preference)
    return combinations.sort((a,b) => {
        const aHas7OfOros = [a.handCard, ...a.tableSubset].some(c => c.rank === 7 && c.suit === 'oros');
        const bHas7OfOros = [b.handCard, ...b.tableSubset].some(c => c.rank === 7 && c.suit === 'oros');
        if (aHas7OfOros && !bHas7OfOros) return -1;
        if (bHas7OfOros && !aHas7OfOros) return 1;
        return b.tableSubset.length - a.tableSubset.length; // More cards first
    })[0];
  }

  /**
   * Logic for Chinchón: Decide draw and discard.
   */
  static getChinchonMove(hand, discardTop, game) {
      // Is discard card useful for our current sets?
      const handWithDiscard = [...hand, discardTop];
      const isUseful = game.isValidSet(handWithDiscard.slice(0, 3)) || game.isValidStair(handWithDiscard.slice(0, 3));
      
      const move = { drawFromDeck: !isUseful };
      
      // Determine discard: highest rank that is NOT part of a group
      // This is a greedy simplification
      const sortedByRank = [...hand].sort((a,b) => b.rank - a.rank);
      move.discard = sortedByRank[0];
      
      return move;
  }

  /**
   * Logic for Tute: Play a card in a trick.
   */
  static getTuteMove(hand, leadCard, trump, game) {
      // Must follow suit if possible
      const followSuit = hand.filter(c => c.suit === (leadCard ? leadCard.suit : 'none'));
      
      if (followSuit.length > 0) {
          // Play highest to try to win
          return followSuit.sort((a, b) => game.getCardValue(b) - game.getCardValue(a))[0];
      }
      
      // If can't follow suit, play trump
      const trumps = hand.filter(c => c.suit === trump);
      if (trumps.length > 0) {
          return trumps.sort((a, b) => game.getCardValue(a) - game.getCardValue(b))[0]; // Smallest trump
      }

      // Else play lowest random card
      return hand.sort((a, b) => game.getCardValue(a) - game.getCardValue(b))[0];
  }

  /**
   * Basic PowerSet implementation for finding subsets (Escoba).
   */
  static _getPowerSet(array) {
    return array.reduce(
        (subsets, value) => subsets.concat(subsets.map(set => [value, ...set])),
        [[]]
    );
  }

  /**
   * Logic for Mus: Decide to bet or not.
   */
  static getMusBet(hand, phase, game) {
    if (phase === 'grande') return (hand.filter(c => c.rank >= 10).length >= 2);
    if (phase === 'chica') return (hand.filter(c => c.rank <= 2).length >= 2);
    if (phase === 'pares') return game.getParesType({ hand }) > 0;
    if (phase === 'juego') return game.hasJuego({ hand });
    return false;
  }
}
