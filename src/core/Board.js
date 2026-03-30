import { Card } from './Card.js';
import { SUIT_SVGS, FIGURE_SVGS } from './SuitAssets.js';
import { AIEngine } from './AIEngine.js';

/**
 * Handles visual representation of cards and the board.
 */
export class Board {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  clear() {
    this.container.innerHTML = '';
  }

  /**
   * Render a card element.
   * @param {Card} card 
   * @param {boolean} faceUp 
   */
  renderCard(card, faceUp = true) {
    const cardEl = document.createElement('div');
    cardEl.className = `card-entity ${faceUp ? 'face-up' : 'face-down'} suit-${card.suit}`;
    cardEl.dataset.rank = card.rank;
    cardEl.dataset.suit = card.suit;

    if (faceUp) {
      cardEl.innerHTML = `
        <div class="card-inner" style="background-image: url('assets/cards/${card.suit}_${card.rank}.jpg'); background-size: cover;">
        </div>
      `;
    } else {
        cardEl.innerHTML = `<div class="card-back"></div>`;
    }

    cardEl.onclick = () => this.toggleSelection(cardEl);
    this._setupDragAndDrop(cardEl, card);

    return cardEl;
  }

  _getSuitColor(suit) {
      const colors = { oros: '#f1c40f', copas: '#e74c3c', espadas: '#95a5a6', bastos: '#8e44ad' };
      return colors[suit] || '#333';
  }

  _getCharacterTitle(rank) {
      const titles = { 10: 'Sota', 11: 'Caballo', 12: 'Rey' };
      return titles[rank] || '';
  }

  _setupDragAndDrop(cardEl, card) {
    cardEl.draggable = true;
    cardEl.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            rank: card.rank,
            suit: card.suit,
            source: cardEl.parentElement.id
        }));
        cardEl.classList.add('dragging');
    };
    cardEl.ondragend = () => cardEl.classList.remove('dragging');
  }

  setupDropZone(element, onDropCallback) {
      element.ondragover = (e) => e.preventDefault();
      element.ondrop = (e) => {
          e.preventDefault();
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          onDropCallback(data, element);
      };
  }

  toggleSelection(cardEl) {
      cardEl.classList.toggle('selected');
  }

  getSelectedCards() {
      return Array.from(this.container.querySelectorAll('.card-entity.selected')).map(el => ({
          rank: parseInt(el.dataset.rank),
          suit: el.dataset.suit,
          el: el
      }));
  }

  _getRankLabel(rank) {
    const labels = { 1: 'As', 10: 'S', 11: 'C', 12: 'R' };
    return labels[rank] || rank;
  }

  _getSuitSymbol(suit) {
      // For now using emojis, but I'll use CSS based icons later
      const symbols = { oros: '🟡', copas: '🍷', espadas: '⚔️', bastos: '🪵' };
      return symbols[suit];
  }

  /**
   * Animates a card from source to target.
   */
  animateDeal(cardEl, targetElement) {
    targetElement.appendChild(cardEl);
    cardEl.style.animation = 'dealCard 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
  }
}
