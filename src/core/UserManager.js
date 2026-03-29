/**
 * Manages user data and scoring persistence.
 */
export class UserManager {
  constructor() {
    this.users = JSON.parse(localStorage.getItem('juegos_cartas_users')) || [];
  }

  addUser(username) {
    if (this.users.some(u => u.name.toLowerCase() === username.toLowerCase())) {
        throw new Error('El usuario ya existe.');
    }
    const newUser = {
        id: Date.now(),
        name: username,
        stats: {
            chinchon: 0,
            escoba: 0,
            mus: 0,
            tute: 0
        }
    };
    this.users.push(newUser);
    this.save();
    return newUser;
  }

  updateScore(id, game, points) {
    const user = this.users.find(u => u.id === id);
    if (!user) return;
    user.stats[game] += points;
    this.save();
  }

  getUser(id) {
    return this.users.find(u => u.id === id);
  }

  save() {
    localStorage.setItem('juegos_cartas_users', JSON.stringify(this.users));
  }
}

/**
 * Basic Player representation in a game.
 */
export class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.capturedCards = []; 
        this.pointsInRound = 0;
        this.totalPoints = 0;
    }

    resetForNewRound() {
        this.hand = [];
        this.capturedCards = [];
        this.pointsInRound = 0;
    }

    addCard(card) {
        this.hand.push(card);
    }
}
