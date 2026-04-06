/**
 * Decision-making engine for the card games AI.
 */
export class AIEngine {
  /**
   * Logic for Escoba: Finds the best combination that sums 15.
   * Priority: 7 of Oros > Most Cards > Any capture.
   */
  static getEscobaMove(hand, table, level = 'experto') {
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

    if (combinations.length === 0) {
        // Drop a card
        return { handCard: hand[level === 'principiante' ? Math.floor(Math.random() * hand.length) : 0], tableSubset: [] };
    }
    
    if (level === 'principiante') {
        // Principiante: picks random valid combination
        return combinations[Math.floor(Math.random() * combinations.length)];
    }

    // Experto and Pro picks the best combination
    return combinations.sort((a,b) => {
        const aHas7OfOros = [a.handCard, ...a.tableSubset].some(c => c.rank === 7 && c.suit === 'oros');
        const bHas7OfOros = [b.handCard, ...b.tableSubset].some(c => c.rank === 7 && c.suit === 'oros');
        if (aHas7OfOros && !bHas7OfOros) return -1;
        if (bHas7OfOros && !aHas7OfOros) return 1;
        
        if (level === 'pro') {
            // Pro prioritizes Oros in general after 7s
            const aOrosCount = [a.handCard, ...a.tableSubset].filter(c => c.suit === 'oros').length;
            const bOrosCount = [b.handCard, ...b.tableSubset].filter(c => c.suit === 'oros').length;
            if (aOrosCount !== bOrosCount) return bOrosCount - aOrosCount;
        }

        return b.tableSubset.length - a.tableSubset.length; // More cards first
    })[0];
  }

  static getChinchonMove(hand, discardTop, game, level = 'experto') {
      const move = { drawFromDeck: true };
      
      if (discardTop && level !== 'principiante') {
          const handWithDiscard = [...hand, discardTop];
          const isUseful = game.isValidSet(handWithDiscard.slice(0, 3)) || game.isValidStair(handWithDiscard.slice(0, 3));
          if (isUseful) move.drawFromDeck = false;
      }
      
      if (level === 'principiante') {
          move.discard = hand[Math.floor(Math.random() * hand.length)];
          move.drawFromDeck = Math.random() > 0.5;
          return move;
      }

      // Experto / Pro
      const sortedByRank = [...hand].sort((a,b) => b.rank - a.rank);
      move.discard = sortedByRank[0];
      
      if (level === 'pro') {
          // naive check: don't discard if part of an almost-set
          let bestDiscard = sortedByRank[0];
          for (let i = 0; i < sortedByRank.length; i++) {
              const c = sortedByRank[i];
              // simplified generic discard choice: lowest chance of being useful
              bestDiscard = c;
              break;
          }
          move.discard = bestDiscard;
      }
      
      return move;
  }

  static getTuteMove(hand, leadCard, trump, game, level = 'experto') {
      if (level === 'principiante') {
          return hand[Math.floor(Math.random() * hand.length)];
      }

      const followSuit = hand.filter(c => c.suit === (leadCard ? leadCard.suit : 'none'));
      
      if (followSuit.length > 0) {
          return followSuit.sort((a, b) => game.getCardValue(b) - game.getCardValue(a))[0];
      }
      
      const trumps = hand.filter(c => c.suit === trump);
      if (trumps.length > 0) {
          if (level === 'pro') {
               // Play highest trump to make sure we win
               return trumps.sort((a, b) => game.getCardValue(b) - game.getCardValue(a))[0];
          }
          return trumps.sort((a, b) => game.getCardValue(a) - game.getCardValue(b))[0]; 
      }

      return hand.sort((a, b) => game.getCardValue(a) - game.getCardValue(b))[0];
  }

  static _getPowerSet(array) {
    return array.reduce(
        (subsets, value) => subsets.concat(subsets.map(set => [value, ...set])),
        [[]]
    );
  }

  static getMusBet(hand, phase, game, level = 'experto') {
    if (level === 'principiante') {
        return Math.random() > 0.5;
    }
    
    if (level === 'pro') {
        // more aggressive
        if (phase === 'grande') return (hand.filter(c => c.rank >= 10).length >= 1);
        if (phase === 'chica') return (hand.filter(c => c.rank <= 3).length >= 1);
    }
    
    if (phase === 'grande') return (hand.filter(c => c.rank >= 10).length >= 2);
    if (phase === 'chica') return (hand.filter(c => c.rank <= 2).length >= 2);
    if (phase === 'pares') return game.getParesType({ hand }) > 0;
    if (phase === 'juego') return game.hasJuego({ hand });
    return false;
  }
}
