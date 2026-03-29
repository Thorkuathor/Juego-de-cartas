import { UserManager } from './core/UserManager.js';
import { Deck } from './core/Deck.js';
import { Board } from './core/Board.js';
import { EscobaGame } from './games/EscobaGame.js';
import { ChinchonGame } from './games/ChinchonGame.js';
import { MusGame } from './games/MusGame.js';
import { TuteGame } from './games/TuteGame.js';
import { AIEngine } from './core/AIEngine.js';
import { MultiplayerManager } from './multiplayer/MultiplayerManager.js';

const userManager = new UserManager();
const board = new Board('game-canvas');
let activeUser = null;
let activeGame = null;
let mp = null; // multiplayer manager instance

// UI Elements
const usernameInput = document.getElementById('username-input');
const addUserBtn = document.getElementById('add-user-btn');
const overlay = document.getElementById('game-overlay');
const gameTitle = document.getElementById('game-title');
const gameInfo = document.getElementById('game-info');

// Handle User Addition
addUserBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) return alert('Introduce un nombre');
    try {
        activeUser = userManager.addUser(name);
        alert(`¡Bienvenido, ${activeUser.name}!`);
        usernameInput.value = '';
        renderStats();
    } catch (e) {
        alert(e.message);
    }
};

function renderStats() {
    if (!activeUser) return;
    document.getElementById('chinchon-status').innerText = activeUser.stats.chinchon;
    document.getElementById('escoba-status').innerText = activeUser.stats.escoba;
    document.getElementById('mus-status').innerText = activeUser.stats.mus;
    document.getElementById('tute-status').innerText = activeUser.stats.tute;
    renderLeaderboard();
}

function renderLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard-list');
    if (!leaderboardEl) return;
    
    // Sort by total score
    const sorted = [...userManager.users].sort((a,b) => {
        const sumA = Object.values(a.stats).reduce((acc, s) => acc + s, 0);
        const sumB = Object.values(b.stats).reduce((acc, s) => acc + s, 0);
        return sumB - sumA;
    }).slice(0, 5);

    leaderboardEl.innerHTML = sorted.map((u, i) => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <span>${i+1}. ${u.name}</span>
            <span style="color: var(--primary);">${Object.values(u.stats).reduce((acc, s) => acc + s, 0)} pts</span>
        </div>
    `).join('') || '<p style="color: var(--text-dim); text-align: center;">No hay usuarios todavía.</p>';
}

// Map of Game Logic
const games = {
    chinchon: { name: 'Chinchón', rules: 'Forma escaleras de 7 cartas para ganar.' },
    escoba: { name: 'Escoba', rules: 'Suma 15 con tus cartas y las de la mesa.' },
    mus: { name: 'Mus', rules: 'Pares, Juego, Grande, Chica.' },
    tute: { name: 'Tute', rules: 'Llevate las cartas del mismo palo.' }
};

window.startGame = (id) => {
    if (!activeUser) return alert('Registra un usuario primero para guardar tu progreso.');
    
    overlay.style.display = 'flex';
    gameTitle.innerText = games[id].name;
    
    // Show mode selection: vs IA or Multiplayer
    showModeSelection(id);
};

function showModeSelection(gameId) {
    const supportsMultiplayer = ['escoba', 'chinchon'].includes(gameId);
    
    gameInfo.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: var(--primary); font-size: 1.5rem; margin-bottom: 2rem;">¿Cómo quieres jugar?</h3>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem; align-items: center;">
                <button class="primary-btn" id="mode-ai-btn" style="padding: 1.5rem 3rem; font-size: 1.2rem; width: 320px; display:flex; align-items:center; justify-content:center; gap:0.8rem;">
                    🤖 <span>Contra la IA</span>
                </button>
                
                ${supportsMultiplayer ? `
                <div style="display: flex; align-items: center; gap: 1rem; color: rgba(255,255,255,0.3); width: 280px;">
                    <div style="flex:1; height:1px; background:rgba(255,255,255,0.15);"></div>
                    <span style="font-size:0.8rem;">o</span>
                    <div style="flex:1; height:1px; background:rgba(255,255,255,0.15);"></div>
                </div>
                
                <button class="primary-btn" id="mode-mp-create-btn" style="padding: 1.5rem 3rem; font-size: 1.2rem; width: 320px; background: linear-gradient(135deg, #1a6b3c, #2d9f5f); display:flex; align-items:center; justify-content:center; gap:0.8rem;">
                    🌐 <span>Crear Sala (Multijugador)</span>
                </button>
                
                <button class="primary-btn" id="mode-mp-join-btn" style="padding: 1.5rem 3rem; font-size: 1.2rem; width: 320px; background: transparent; border: 2px solid #2d9f5f; color: #4dff88; display:flex; align-items:center; justify-content:center; gap:0.8rem;">
                    🔗 <span>Unirse a Sala</span>
                </button>
                
                <p style="font-size: 0.75rem; opacity: 0.4; margin-top: 0.5rem;">Ambos jugadores deben estar en la misma red WiFi o tener acceso a internet</p>
                ` : `<p style="font-size: 0.85rem; opacity: 0.5; margin-top: 1rem;">🔒 Multijugador disponible en Escoba y Chinchón</p>`}
            </div>
        </div>
    `;

    // VS AI button
    document.getElementById('mode-ai-btn').onclick = () => {
        if (gameId === 'escoba') startEscoba();
        else if (gameId === 'chinchon') startChinchon();
        else if (gameId === 'mus') startMus();
        else if (gameId === 'tute') startTute();
    };

    if (supportsMultiplayer) {
        document.getElementById('mode-mp-create-btn').onclick = () => showCreateLobby(gameId);
        document.getElementById('mode-mp-join-btn').onclick = () => showJoinLobby(gameId);
    }
}

// ==================== MULTIPLAYER LOBBY ====================

function showCreateLobby(gameId) {
    gameInfo.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div id="lobby-status" style="margin-bottom: 2rem;">
                <div class="spinner" style="display:inline-block; width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius:50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top:1rem; color: var(--primary);">Creando sala...</p>
            </div>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    mp = new MultiplayerManager();
    
    mp.createRoom(activeUser.name).then(roomCode => {
        gameInfo.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3 style="color: #4dff88; font-size: 1.3rem; margin-bottom: 1rem;">✅ Sala Creada</h3>
                
                <div style="background: rgba(0,0,0,0.4); padding: 2rem; border-radius: 20px; border: 2px solid #4dff88; margin-bottom: 2rem;">
                    <p style="font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.5rem;">CÓDIGO DE SALA</p>
                    <div id="room-code-display" style="font-size: 3rem; font-weight: 900; letter-spacing: 10px; color: #4dff88; cursor:pointer; user-select:all;" title="Clic para copiar">${roomCode}</div>
                    <p style="font-size: 0.75rem; opacity: 0.4; margin-top: 0.5rem;">Comparte este código con el otro jugador</p>
                </div>
                
                <div id="lobby-waiting" style="display:flex; align-items:center; justify-content:center; gap:0.8rem;">
                    <div class="spinner" style="display:inline-block; width:20px; height:20px; border:2px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius:50%; animation: spin 1s linear infinite;"></div>
                    <span style="opacity:0.7;">Esperando al otro jugador...</span>
                </div>
                <div id="lobby-connected" style="display:none;"></div>
                
                <button class="primary-btn" style="margin-top: 2rem; background:transparent; border:1px solid #ff4d4d; color:#ff4d4d;" onclick="cancelMultiplayer()">Cancelar</button>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        // Copy to clipboard on click
        document.getElementById('room-code-display').onclick = () => {
            navigator.clipboard.writeText(roomCode).then(() => {
                document.getElementById('room-code-display').style.color = '#fff';
                setTimeout(() => document.getElementById('room-code-display').style.color = '#4dff88', 500);
            });
        };

        // When guest connects
        mp.onConnected = (remoteName) => {
            document.getElementById('lobby-waiting').style.display = 'none';
            const connDiv = document.getElementById('lobby-connected');
            connDiv.style.display = 'block';
            connDiv.innerHTML = `
                <div style="background: rgba(77,255,136,0.1); padding: 1rem; border-radius: 12px; border: 1px solid rgba(77,255,136,0.3); margin-bottom: 1rem;">
                    <p style="color: #4dff88; font-size: 1.1rem;">🎮 <strong>${remoteName}</strong> se ha unido!</p>
                </div>
                <button class="primary-btn" id="start-mp-game-btn" style="padding: 1.2rem 3rem; font-size: 1.2rem; background: linear-gradient(135deg, #1a6b3c, #2d9f5f);">🚀 COMENZAR PARTIDA</button>
            `;
            document.getElementById('start-mp-game-btn').onclick = () => {
                startMultiplayerGame(gameId);
            };
        };

        mp.onDisconnected = () => {
            alert('El otro jugador se ha desconectado.');
            cancelMultiplayer();
        };
    }).catch(err => {
        gameInfo.innerHTML = `<p style="color:#ff4d4d; text-align:center;">Error al crear la sala: ${err.message}</p>`;
    });
}

function showJoinLobby(gameId) {
    gameInfo.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: var(--primary); font-size: 1.3rem; margin-bottom: 2rem;">Unirse a una Sala</h3>
            
            <div style="margin-bottom: 2rem;">
                <input type="text" id="join-code-input" placeholder="CÓDIGO" maxlength="6" 
                    style="text-align:center; font-size: 2rem; letter-spacing: 8px; font-weight: 900; width: 240px; padding: 1rem; background: rgba(0,0,0,0.4); border: 2px solid var(--glass-border); border-radius: 12px; color: #fff; text-transform: uppercase;">
            </div>
            
            <div id="join-status"></div>
            
            <button class="primary-btn" id="join-btn" style="padding: 1.2rem 3rem; font-size: 1.1rem; background: linear-gradient(135deg, #1a6b3c, #2d9f5f);">CONECTAR</button>
            <br>
            <button class="primary-btn" style="margin-top: 1rem; background:transparent; border:1px solid #ff4d4d; color:#ff4d4d;" onclick="cancelMultiplayer()">Cancelar</button>
        </div>
    `;

    document.getElementById('join-btn').onclick = () => {
        const code = document.getElementById('join-code-input').value.trim().toUpperCase();
        if (code.length !== 6) return alert('El código debe tener 6 caracteres.');

        const statusDiv = document.getElementById('join-status');
        statusDiv.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; gap:0.8rem; margin-bottom:1rem;">
                <div class="spinner" style="display:inline-block; width:20px; height:20px; border:2px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius:50%; animation: spin 1s linear infinite;"></div>
                <span style="opacity:0.7;">Conectando...</span>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        mp = new MultiplayerManager();

        mp.onConnected = (remoteName) => {
            statusDiv.innerHTML = `<p style="color:#4dff88; margin-bottom:1rem;">✅ Conectado con <strong>${remoteName}</strong>. Esperando inicio...</p>`;
        };

        mp.onGameStart = (startGameId, config) => {
            startMultiplayerGameAsGuest(startGameId, config);
        };

        mp.onDisconnected = () => {
            alert('Se perdió la conexión con el host.');
            cancelMultiplayer();
        };

        mp.joinRoom(activeUser.name, code).catch(err => {
            statusDiv.innerHTML = `<p style="color:#ff4d4d;">❌ ${err.message}</p>`;
        });
    };
}

window.cancelMultiplayer = () => {
    if (mp) {
        mp.disconnect();
        mp = null;
    }
    closeGame();
};

// ==================== MULTIPLAYER GAME LOGIC ====================

function startMultiplayerGame(gameId) {
    if (gameId === 'escoba') {
        startMultiplayerEscoba();
    } else if (gameId === 'chinchon') {
        startMultiplayerChinchon();
    }
}

// ---------- ESCOBA MULTIJUGADOR (HOST) ----------

function startMultiplayerEscoba() {
    activeGame = new EscobaGame([activeUser.name, mp.remoteName]);
    activeGame.start();

    mp.sendGameStart('escoba', { players: [activeUser.name, mp.remoteName] });
    
    mp.onGameAction = (action) => {
        // Guest played a move
        if (action.type === 'play-turn') {
            const guestPlayer = activeGame.players[1];
            const handCard = guestPlayer.hand.find(c => c.rank === action.handCard.rank && c.suit === action.handCard.suit);
            const tableCards = action.tableCards.map(tc => activeGame.tableCards.find(c => c.rank === tc.rank && c.suit === tc.suit));

            if (action.tableCards.length === 0) {
                // Discard to table
                activeGame.tableCards.push(handCard);
                guestPlayer.hand = guestPlayer.hand.filter(c => c !== handCard);
            } else {
                activeGame.playTurn(guestPlayer, handCard, tableCards);
            }

            // Check redeal and game-over after guest plays
            activeGame.checkRedeal();

            // Send updated state to guest
            sendEscobaStateToGuest();
            renderMultiplayerEscobaBoard();
        }
    };

    renderMultiplayerEscobaBoard();
    sendEscobaStateToGuest();
}

function sendEscobaStateToGuest() {
    if (!mp || !mp.connected) return;
    const isGameOver = activeGame.players.every(p => p.hand.length === 0) && activeGame.deck.remaining === 0;
    
    mp.sendState({
        game: 'escoba',
        tableCards: activeGame.tableCards.map(c => ({ rank: c.rank, suit: c.suit, name: c.name })),
        guestHand: activeGame.players[1].hand.map(c => ({ rank: c.rank, suit: c.suit, name: c.name })),
        hostPoints: activeGame.getGameState(0).points,
        hostCaptured: activeGame.getGameState(0).capturedCount,
        guestPoints: activeGame.getGameState(1).points,
        guestCaptured: activeGame.getGameState(1).capturedCount,
        deckRemaining: activeGame.deck.remaining,
        hostTotalPoints: activeGame.players[0].totalPoints,
        guestTotalPoints: activeGame.players[1].totalPoints,
        isGameOver
    });
}

function renderMultiplayerEscobaBoard() {
    const redealt = activeGame.checkRedeal();
    const isGameOver = activeGame.players.every(p => p.hand.length === 0) && activeGame.deck.remaining === 0;
    
    if (isGameOver) {
        showMultiplayerEscobaResults();
        return;
    }

    const state = activeGame.getGameState(0);
    const guestState = activeGame.getGameState(1);

    gameInfo.innerHTML = `
        <div id="escoba-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <span style="color:#4dff88; font-size:0.8rem; border:1px solid #4dff88; padding:0.2rem 0.6rem; border-radius:20px; margin-right:0.5rem;">🌐 ONLINE</span>
                <a href="https://www.nhfournier.es/como-jugar/escoba/" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; border: 1px solid var(--primary); padding: 0.2rem 0.8rem; border-radius: 20px; transition: all 0.3s; display: inline-block;">📖 Cómo jugar</a>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tú (${activeUser.name})</div>
                   <div style="color: var(--primary); font-weight: 900; font-size: 1.2rem;">${state.points} <span style="font-size: 0.7rem; color: #fff;">(${state.capturedCount} cartas)</span></div>
                </div>
                <div style="text-align: center;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Mazo</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1rem;">${state.deckRemaining}</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">${mp.remoteName}</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1.2rem;">${guestState.points} <span style="font-size: 0.7rem; opacity: 0.5;">(${guestState.capturedCount} cartas)</span></div>
                </div>
            </div>
            <div class="area" style="min-height: 200px; display: flex; flex-direction: column; justify-content: center;">
                <div class="area-label" style="text-align: center;">Mesa</div>
                <div id="table-area"></div>
            </div>
            <div style="text-align: center; margin: 2rem 0;">
                <button class="primary-btn" id="make-move-btn" style="padding: 1rem 3rem; font-size: 1.1rem; border: 2px solid rgba(255,255,255,0.1);">REALIZAR JUGADA</button>
            </div>
            <div class="area">
                <div class="area-label" style="text-align: center;">Tu Mano</div>
                <div id="hand-area"></div>
            </div>
        </div>
    `;

    const tableArea = document.getElementById('table-area');
    const handArea = document.getElementById('hand-area');
    const moveBtn = document.getElementById('make-move-btn');

    activeGame.tableCards.forEach(card => {
        tableArea.appendChild(board.renderCard(card));
    });

    activeGame.players[0].hand.forEach(card => {
        handArea.appendChild(board.renderCard(card));
    });

    moveBtn.onclick = () => {
        const selected = board.getSelectedCards();
        const handSelection = selected.filter(s => s.el.parentElement.id === 'hand-area');
        const tableSelection = selected.filter(s => s.el.parentElement.id === 'table-area');

        if (handSelection.length !== 1) return alert('Selecciona exactamente una carta de tu mano.');

        const handCard = activeGame.players[0].hand.find(c => c.rank === handSelection[0].rank && c.suit === handSelection[0].suit);
        const tableCardsToCapture = tableSelection.map(s => activeGame.tableCards.find(c => c.rank === s.rank && c.suit === s.suit));

        if (tableSelection.length === 0) {
            activeGame.tableCards.push(handCard);
            activeGame.players[0].hand = activeGame.players[0].hand.filter(c => c !== handCard);
            activeGame.checkRedeal();
            sendEscobaStateToGuest();
            renderMultiplayerEscobaBoard();
            return;
        }

        const result = activeGame.playTurn(activeGame.players[0], handCard, tableCardsToCapture);
        if (result.success) {
            activeGame.checkRedeal();
            sendEscobaStateToGuest();
            renderMultiplayerEscobaBoard();
        } else {
            alert(result.message);
            selected.forEach(s => s.el.classList.remove('selected'));
        }
    };
}

function showMultiplayerEscobaResults() {
    const results = activeGame.calculateScores();
    results.forEach((r, i) => { activeGame.players[i].totalPoints += r.points; });

    const p0Total = activeGame.players[0].totalPoints;
    const p1Total = activeGame.players[1].totalPoints;
    const gameOver = p0Total >= 50 || p1Total >= 50;

    sendEscobaStateToGuest(); // sync final state

    gameInfo.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 3rem; border-radius: 30px; border: 2px solid ${gameOver ? '#4dff88' : 'var(--primary)'}; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
            <h2 style="color: ${gameOver ? '#4dff88' : 'var(--primary)'}; font-size: 2.5rem; margin-bottom: 2rem; font-weight: 900;">${gameOver ? '🏆 PARTIDA TERMINADA' : 'RONDA FINALIZADA'}</h2>
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem;">
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); width: 180px;">
                    <div style="font-size: 0.8rem; color: var(--primary);">${results[0].name}</div>
                    <div style="font-size: 3rem; font-weight: 900;">+${results[0].points}</div>
                    <div style="font-weight: bold;">Total: ${p0Total}/50</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); width: 180px;">
                    <div style="font-size: 0.8rem; opacity: 0.7;">${results[1].name}</div>
                    <div style="font-size: 3rem; font-weight: 900;">+${results[1].points}</div>
                    <div style="font-weight: bold;">Total: ${p1Total}/50</div>
                </div>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                ${gameOver
                    ? `<button class="primary-btn" onclick="exitMultiplayerGame()">VOLVER AL MENÚ</button>`
                    : `<button class="primary-btn" onclick="nextMpEscobaRound()">SIGUIENTE RONDA</button>
                       <button class="primary-btn" style="background:transparent; border:1px solid #ff4d4d; color:#ff4d4d;" onclick="exitMultiplayerGame()">SALIR</button>`
                }
            </div>
        </div>
    `;
}

window.nextMpEscobaRound = () => {
    activeGame.resetRound();
    sendEscobaStateToGuest();
    renderMultiplayerEscobaBoard();
};

// ---------- CHINCHON MULTIJUGADOR (HOST) ----------

function startMultiplayerChinchon() {
    activeGame = new ChinchonGame([activeUser.name, mp.remoteName]);
    activeGame.start();

    mp.sendGameStart('chinchon', { players: [activeUser.name, mp.remoteName] });
    
    mp.onGameAction = (action) => {
        const guestPlayer = activeGame.players[1];
        if (action.type === 'draw-deck') {
            activeGame.drawFromDeck(guestPlayer);
            sendChinchonStateToGuest();
            renderChinchonBoard();
        } else if (action.type === 'draw-discard') {
            activeGame.drawFromDiscard(guestPlayer);
            sendChinchonStateToGuest();
            renderChinchonBoard();
        } else if (action.type === 'discard') {
            activeGame.discardCard(guestPlayer, action.card);
            sendChinchonStateToGuest();
            renderChinchonBoard();
        } else if (action.type === 'close-round') {
            if (activeGame.canClose(guestPlayer)) {
                mp.sendAlert('¡El rival ha cerrado la ronda!');
                showChinchonResults();
            }
        }
    };

    renderChinchonBoard();
    sendChinchonStateToGuest();
}

function sendChinchonStateToGuest() {
    if (!mp || !mp.connected) return;
    const state = activeGame.getGameState(1);
    mp.sendState({
        game: 'chinchon',
        guestHand: activeGame.players[1].hand.map(c => ({ rank: c.rank, suit: c.suit, name: c.name })),
        discardTop: state.discardTop ? { rank: state.discardTop.rank, suit: state.discardTop.suit, name: state.discardTop.name } : null,
        deckRemaining: state.deckRemaining,
        isGuestTurn: state.isMyTurn,
        hasDrawnThisTurn: state.hasDrawnThisTurn,
        hostTotalPoints: activeGame.players[0].totalPoints || 0,
        guestTotalPoints: activeGame.players[1].totalPoints || 0,
        hostHandSize: activeGame.players[0].hand.length
    });
}

// ---------- GUEST-SIDE RENDERING ----------

function startMultiplayerGameAsGuest(gameId, config) {
    if (gameId === 'escoba') {
        startGuestEscoba(config);
    } else if (gameId === 'chinchon') {
        startGuestChinchon(config);
    }
}

function startGuestEscoba(config) {
    overlay.style.display = 'flex';
    gameTitle.innerText = 'Escoba — Multijugador';

    mp.onGameState = (state) => {
        if (state.game !== 'escoba') return;
        renderGuestEscobaBoard(state);
    };

    mp.onAlert = (msg) => alert(msg);
}

function renderGuestEscobaBoard(state) {
    if (state.isGameOver && state.guestHand.length === 0) {
        // Show waiting message - host will share results 
    }

    gameInfo.innerHTML = `
        <div id="escoba-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <span style="color:#4dff88; font-size:0.8rem; border:1px solid #4dff88; padding:0.2rem 0.6rem; border-radius:20px;">🌐 ONLINE</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tú (${activeUser.name})</div>
                   <div style="color: var(--primary); font-weight: 900; font-size: 1.2rem;">${state.guestPoints} <span style="font-size: 0.7rem; color: #fff;">(${state.guestCaptured} cartas)</span></div>
                </div>
                <div style="text-align: center;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Mazo</div>
                   <div style="color: #fff; font-weight: 700;">${state.deckRemaining}</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">${mp.remoteName}</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1.2rem;">${state.hostPoints} <span style="font-size: 0.7rem; opacity: 0.5;">(${state.hostCaptured} cartas)</span></div>
                </div>
            </div>
            <div class="area" style="min-height: 200px; display: flex; flex-direction: column; justify-content: center;">
                <div class="area-label" style="text-align: center;">Mesa</div>
                <div id="table-area"></div>
            </div>
            <div style="text-align: center; margin: 2rem 0;">
                <button class="primary-btn" id="make-move-btn" style="padding: 1rem 3rem; font-size: 1.1rem;">REALIZAR JUGADA</button>
            </div>
            <div class="area">
                <div class="area-label" style="text-align: center;">Tu Mano</div>
                <div id="hand-area"></div>
            </div>
        </div>
    `;

    const tableArea = document.getElementById('table-area');
    const handArea = document.getElementById('hand-area');
    const moveBtn = document.getElementById('make-move-btn');

    state.tableCards.forEach(card => {
        tableArea.appendChild(board.renderCard(card));
    });
    state.guestHand.forEach(card => {
        handArea.appendChild(board.renderCard(card));
    });

    moveBtn.onclick = () => {
        const selected = board.getSelectedCards();
        const handSelection = selected.filter(s => s.el.parentElement.id === 'hand-area');
        const tableSelection = selected.filter(s => s.el.parentElement.id === 'table-area');

        if (handSelection.length !== 1) return alert('Selecciona exactamente una carta de tu mano.');

        mp.sendAction({
            type: 'play-turn',
            handCard: { rank: handSelection[0].rank, suit: handSelection[0].suit },
            tableCards: tableSelection.map(s => ({ rank: s.rank, suit: s.suit }))
        });
    };
}

function startGuestChinchon(config) {
    overlay.style.display = 'flex';
    gameTitle.innerText = 'Chinchón — Multijugador';

    mp.onGameState = (state) => {
        if (state.game !== 'chinchon') return;
        renderGuestChinchonBoard(state);
    };

    mp.onAlert = (msg) => alert(msg);
}

function renderGuestChinchonBoard(state) {
    gameInfo.innerHTML = `
        <div id="chinchon-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <span style="color:#4dff88; font-size:0.8rem; border:1px solid #4dff88; padding:0.2rem 0.6rem; border-radius:20px;">🌐 ONLINE</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tus Puntos (Malos)</div>
                   <div style="color: #ff4d4d; font-weight: 900; font-size: 1.2rem;">${state.guestTotalPoints}<span style="font-size:0.7rem; opacity:0.5;">/100</span></div>
                </div>
                <div style="text-align: center;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Turno</div>
                   <div style="color: var(--primary); font-weight: 700;">${state.isGuestTurn ? 'TU TURNO' : 'TURNO RIVAL'}</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">${mp.remoteName}</div>
                   <div style="color: #ff4d4d; font-weight: 700; font-size: 1.2rem;">${state.hostTotalPoints}<span style="font-size:0.7rem; opacity:0.5;">/100</span> <span style="font-size:0.7rem; opacity:0.5;">(${state.hostHandSize} cartas)</span></div>
                </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 3rem; margin-bottom: 2rem;">
                <div class="area">
                    <div class="area-label">Mazo (${state.deckRemaining})</div>
                    <div id="deck-zone" style="cursor:${state.isGuestTurn && !state.hasDrawnThisTurn ? 'pointer' : 'not-allowed'}; display:flex; align-items:center; justify-content:center; width:80px; height:120px; border:2px dashed ${state.isGuestTurn && !state.hasDrawnThisTurn ? 'var(--primary)':'#555'}; border-radius:8px;">
                        <div class="card-back" style="width:100%;height:100%;"></div>
                    </div>
                </div>
                <div class="area">
                    <div class="area-label">Descarte</div>
                    <div id="discard-zone" class="drop-zone">
                        <div id="discard-top-card"></div>
                    </div>
                </div>
            </div>
            <div class="area">
                <div class="area-label">Tu Mano</div>
                <div id="hand-area" style="display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; min-height:140px;"></div>
            </div>
        </div>
    `;

    const handArea = document.getElementById('hand-area');
    const deckZone = document.getElementById('deck-zone');
    const discardZone = document.getElementById('discard-zone');
    const discardTop = document.getElementById('discard-top-card');

    state.guestHand.forEach(card => {
        const cardEl = board.renderCard(card);
        cardEl.draggable = state.isGuestTurn && state.hasDrawnThisTurn;
        handArea.appendChild(cardEl);
    });

    if (state.discardTop) {
        discardTop.appendChild(board.renderCard(state.discardTop, true));
    }

    deckZone.onclick = () => {
        if (!state.isGuestTurn || state.hasDrawnThisTurn) return;
        mp.sendAction({ type: 'draw-deck' });
    };

    discardZone.onclick = () => {
        if (!state.isGuestTurn || state.hasDrawnThisTurn) return;
        mp.sendAction({ type: 'draw-discard' });
    };

    board.setupDropZone(discardZone, (data) => {
        if (!state.isGuestTurn || !state.hasDrawnThisTurn) return;
        mp.sendAction({ type: 'discard', card: { rank: data.rank, suit: data.suit } });
    });
}

window.exitMultiplayerGame = () => {
    if (mp) {
        mp.disconnect();
        mp = null;
    }
    closeGame();
    renderStats();
};

function startEscoba() {
    activeGame = new EscobaGame([activeUser.name, 'IA Bot']);
    activeGame.start();
    renderEscobaBoard();
}

function renderEscobaBoard() {
    const redealt = activeGame.checkRedeal();
    if (redealt) alert('¡Mano terminada! Nuevas cartas repartidas del mazo.');

    const isGameOver = activeGame.players.every(p => p.hand.length === 0) && activeGame.deck.remaining === 0;
    if (isGameOver) {
        showEscobaResults();
        return;
    }

    const state = activeGame.getGameState(0);
    const aiState = activeGame.getGameState(1);

    gameInfo.innerHTML = `
        <div id="escoba-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <a href="https://www.nhfournier.es/como-jugar/escoba/" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; border: 1px solid var(--primary); padding: 0.2rem 0.8rem; border-radius: 20px; transition: all 0.3s; display: inline-block;">📖 Cómo jugar</a>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tus Puntos</div>
                   <div style="color: var(--primary); font-weight: 900; font-size: 1.2rem;">${state.points} <span style="font-size: 0.7rem; color: #fff;">(${state.capturedCount} cartas)</span></div>
                </div>
                <div style="text-align: center;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Mazo</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1rem;">${state.deckRemaining}</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">IA (Bot)</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1.2rem;">${aiState.points} <span style="font-size: 0.7rem; opacity: 0.5;">(${aiState.capturedCount} cartas)</span></div>
                </div>
            </div>
            <div class="area" style="min-height: 200px; display: flex; flex-direction: column; justify-content: center;">
                <div class="area-label" style="text-align: center;">Mesa</div>
                <div id="table-area"></div>
            </div>
            <div style="text-align: center; margin: 2rem 0;">
                <button class="primary-btn" id="make-move-btn" style="padding: 1rem 3rem; font-size: 1.1rem; border: 2px solid rgba(255,255,255,0.1);">REALIZAR JUGADA</button>
            </div>
            <div class="area">
                <div class="area-label" style="text-align: center;">Tu Mano</div>
                <div id="hand-area"></div>
            </div>
        </div>
    `;

    const tableArea = document.getElementById('table-area');
    const handArea = document.getElementById('hand-area');
    const moveBtn = document.getElementById('make-move-btn');

    // Render Table
    activeGame.tableCards.forEach(card => {
        const cardEl = board.renderCard(card);
        tableArea.appendChild(cardEl);
    });

    // Render Player Hand
    activeGame.players[0].hand.forEach(card => {
        const cardEl = board.renderCard(card);
        handArea.appendChild(cardEl);
    });

    moveBtn.onclick = () => {
        const selected = board.getSelectedCards();
        const handSelection = selected.filter(s => s.el.parentElement.id === 'hand-area');
        const tableSelection = selected.filter(s => s.el.parentElement.id === 'table-area');

        if (handSelection.length !== 1) {
            return alert('Debes seleccionar exactamente una carta de tu mano para jugar.');
        }

        const handCard = activeGame.players[0].hand.find(c => c.rank === handSelection[0].rank && c.suit === handSelection[0].suit);
        const tableCardsToCapture = tableSelection.map(s => activeGame.tableCards.find(c => c.rank === s.rank && c.suit === s.suit));

        if (tableSelection.length === 0) {
            // Player wants to discard the card to the table
            activeGame.tableCards.push(handCard);
            activeGame.players[0].hand = activeGame.players[0].hand.filter(c => c !== handCard);
            alert(`Has puesto el ${handSelection[0].rank} de ${handSelection[0].suit} en la mesa.`);
            setTimeout(() => performAITurnEscoba(), 1000);
            renderEscobaBoard();
            return;
        }

        const result = activeGame.playTurn(activeGame.players[0], handCard, tableCardsToCapture);
        
        if (result.success) {
            // Success capture or discard is always successful in logic
            renderEscobaBoard();
            if (result.capture) {
                // Short notice for capture
                console.log(result.message);
            }
            performAITurnEscoba();
        } else {
            alert(result.message + ' Si quieres descartar esta carta, selecciónala sola.');
            selected.forEach(s => s.el.classList.remove('selected'));
        }
    };
}

function showEscobaResults() {
    const results = activeGame.calculateScores();
    // Update total points for current session
    results.forEach((r, i) => {
        activeGame.players[i].totalPoints += r.points;
    });

    // Check if anyone reached 50 points (they WIN)
    const p0Total = activeGame.players[0].totalPoints;
    const p1Total = activeGame.players[1].totalPoints;
    const gameOver = p0Total >= 50 || p1Total >= 50;
    let gameOverMsg = '';
    if (gameOver) {
        if (p0Total >= 50 && p1Total >= 50) {
            gameOverMsg = p0Total >= p1Total
                ? `¡Has llegado a ${p0Total} puntos! ¡VICTORIA! 🏆`
                : `¡${activeGame.players[1].name} ha llegado a ${p1Total} puntos y gana!`;
        } else if (p0Total >= 50) {
            gameOverMsg = `¡Has llegado a ${p0Total} puntos! ¡VICTORIA! 🏆 ${activeGame.players[1].name} se quedó en ${p1Total}.`;
        } else {
            gameOverMsg = `¡${activeGame.players[1].name} ha llegado a ${p1Total} puntos y gana la partida! Tú te has quedado en ${p0Total}.`;
        }
    }

    gameInfo.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 3rem; border-radius: 30px; border: 2px solid ${gameOver ? '#4dff88' : 'var(--primary)'}; box-shadow: 0 20px 50px rgba(0,0,0,0.5); backdrop-filter: blur(10px);">
            <h2 style="color: ${gameOver ? '#4dff88' : 'var(--primary)'}; font-size: 3rem; margin-bottom: 2rem; font-weight: 900; letter-spacing: 2px;">${gameOver ? '🏆 PARTIDA TERMINADA' : 'RONDA FINALIZADA'}</h2>
            ${gameOver ? `<p style="font-size: 1.3rem; margin-bottom: 2rem; color: #fff;">${gameOverMsg}</p>` : ''}
            
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 3rem;">
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid ${p0Total >= 50 ? '#4dff88' : 'rgba(255,255,255,0.1)'}; width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">${results[0].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0;">+${results[0].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Ronda</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: ${p0Total >= 50 ? '#4dff88' : '#fff'};">Total: ${p0Total}/50</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid ${p1Total >= 50 ? '#4dff88' : 'rgba(255,255,255,0.1)'}; width: 200px;">
                    <div style="font-size: 0.8rem; opacity: 0.7; text-transform: uppercase;">${results[1].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0;">+${results[1].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Ronda</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: ${p1Total >= 50 ? '#4dff88' : '#fff'};">Total: ${p1Total}/50</div>
                </div>
            </div>

            <div style="display: flex; gap: 1.5rem; justify-content: center;">
                ${gameOver 
                    ? `<button class="primary-btn" onclick="exitEscobaGame()" style="padding: 1.2rem 2.5rem; font-size: 1.1rem;">VOLVER AL MENÚ</button>
                       <button class="primary-btn" style="border: 1px solid var(--primary); padding: 1.2rem 2.5rem; font-size: 1.1rem;" onclick="restartEscoba()">REVANCHA</button>`
                    : `<button class="primary-btn" onclick="nextEscobaRound()" style="padding: 1.2rem 2.5rem; font-size: 1.1rem;">SIGUIENTE RONDA</button>
                       <button class="primary-btn" style="background: transparent; border: 1px solid #ff4d4d; color: #ff4d4d; padding: 1.2rem 2.5rem; font-size: 1.1rem;" onclick="exitEscobaGame()">CERRAR Y GUARDAR</button>`
                }
            </div>
        </div>
    `;
}

window.nextEscobaRound = () => {
    activeGame.resetRound();
    renderEscobaBoard();
};

window.exitEscobaGame = () => {
    // Persistent final score management
    if (activeUser && activeGame) {
        const playerFinalScore = activeGame.players[0].totalPoints;
        userManager.updateScore(activeUser.id, 'escoba', playerFinalScore);
        alert(`¡Partida guardada! Has acumulado ${playerFinalScore} puntos de prestigio.`);
    }
    closeGame();
    renderStats();
};

window.restartEscoba = () => {
    startEscoba();
};

function performAITurnEscoba() {
    setTimeout(() => {
        if (!activeGame) return;
        const aiPlayer = activeGame.players[1];
        if (!aiPlayer.hand.length) return;
        
        const move = AIEngine.getEscobaMove(aiPlayer.hand, activeGame.tableCards);
        const result = activeGame.playTurn(aiPlayer, move.handCard, move.tableSubset);
        
        alert(`La IA ha jugado el ${move.handCard.name}. ${result.message}`);
        renderEscobaBoard();
    }, 1200);
}

function startChinchon() {
    activeGame = new ChinchonGame([activeUser.name, 'IA Bot']);
    activeGame.start();
    renderChinchonBoard();
}

function renderChinchonBoard() {
    const state = activeGame.getGameState(0);
    const aiState = activeGame.getGameState(1);

    gameInfo.innerHTML = `
        <div id="chinchon-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <a href="https://www.nhfournier.es/como-jugar/chinchon/" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; border: 1px solid var(--primary); padding: 0.2rem 0.8rem; border-radius: 20px; transition: all 0.3s; display: inline-block;">📖 Cómo jugar</a>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tus Puntos (Malos)</div>
                   <div style="color: #ff4d4d; font-weight: 900; font-size: 1.2rem;">${activeGame.players[0].totalPoints || 0}<span style="font-size:0.7rem; opacity:0.5;">/100</span></div>
                </div>
                <div style="text-align: center;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Turno Actual</div>
                   <div style="color: var(--primary); font-weight: 700; font-size: 1rem;">${state.isMyTurn ? 'TU TURNO' : 'TURNO IA'}</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">IA (Bot)</div>
                   <div style="color: #ff4d4d; font-weight: 700; font-size: 1.2rem;">${activeGame.players[1].totalPoints || 0}<span style="font-size:0.7rem; opacity:0.5;">/100</span> <span style="font-size: 0.7rem; opacity: 0.5;">(${aiState.handSize} cartas)</span></div>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 3rem; margin-bottom: 2rem;">
                <div class="area">
                    <div class="area-label">Mazo (${state.deckRemaining})</div>
                    <div id="deck-zone" style="cursor: ${state.isMyTurn && !state.hasDrawnThisTurn ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center; width: 80px; height: 120px; border: 2px dashed ${state.isMyTurn && !state.hasDrawnThisTurn ? 'var(--primary)' : '#555'}; border-radius: 8px;">
                        ${state.deckRemaining > 0 ? '<div class="card-back" style="width:100%; height:100%;"></div>' : '<span style="color:#666">Vacío</span>'}
                    </div>
                </div>
                <div class="area">
                    <div class="area-label" id="discard-label">Descarte ${state.isMyTurn && state.hasDrawnThisTurn ? '(Arrastra carta aquí)' : ''}</div>
                    <div id="discard-zone" class="drop-zone" style="cursor: ${state.isMyTurn && !state.hasDrawnThisTurn ? 'pointer' : 'default'};">
                        <div id="discard-top-card"></div>
                    </div>
                </div>
            </div>
            <div class="area">
                <div class="area-label" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                   <span>Tu Mano <span style="font-size:0.7rem; opacity:0.5;">(arrastra para reordenar)</span></span>
                   <div style="display:flex; gap:0.5rem;">
                       <button id="sort-by-rank-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color:#fff; padding: 0.2rem 0.7rem; border-radius:20px; cursor:pointer; font-size:0.75rem; transition: all 0.2s;">🔢 Por número</button>
                       <button id="sort-by-suit-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color:#fff; padding: 0.2rem 0.7rem; border-radius:20px; cursor:pointer; font-size:0.75rem; transition: all 0.2s;">🃏 Por palo</button>
                       ${state.isMyTurn && state.hasDrawnThisTurn ? '<span style="color: var(--primary);">Arrastra al descarte para descartar</span>' : ''}
                   </div>
                </div>
                <div id="hand-area" style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; min-height: 140px; padding: 0.5rem; border: 2px dashed rgba(255,255,255,0.06); border-radius: 12px; margin-top: 0.5rem;"></div>
            </div>
            <div style="text-align: center; margin-top: 2rem;">
                <button class="primary-btn" id="close-round-btn" ${!state.isMyTurn || state.hasDrawnThisTurn ? 'disabled style="opacity:0.5"' : ''}>CERRAR RONDA (Menos o igual a 5 pts)</button>
            </div>
        </div>
    `;

    const handArea = document.getElementById('hand-area');
    const discardZone = document.getElementById('discard-zone');
    const deckZone = document.getElementById('deck-zone');
    const discardTop = document.getElementById('discard-top-card');
    const closeBtn = document.getElementById('close-round-btn');

    // --- Hand rendering with drag-to-reorder ---
    let dragSrcIndex = null;

    function renderHandCards() {
        handArea.innerHTML = '';
        activeGame.players[0].hand.forEach((card, index) => {
            const cardEl = board.renderCard(card);
            // Always draggable for reordering; also draggable to discard zone if turn allows
            cardEl.draggable = true;
            cardEl.style.cursor = 'grab';
            cardEl.dataset.handIndex = index;

            // Drag START – record where we lifted the card from
            cardEl.ondragstart = (e) => {
                dragSrcIndex = index;
                e.dataTransfer.setData('text/plain', JSON.stringify({ rank: card.rank, suit: card.suit, source: 'hand-area' }));
                setTimeout(() => cardEl.classList.add('dragging'), 0);
            };
            cardEl.ondragend = () => {
                cardEl.classList.remove('dragging');
                dragSrcIndex = null;
            };

            // Drag OVER another card in the hand → reorder preview
            cardEl.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            };

            // DROP on another card → reorder in hand array, re-render without full board rebuild
            cardEl.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation(); // don't let the discard zone catch this
                if (dragSrcIndex === null || dragSrcIndex === index) return;
                const hand = activeGame.players[0].hand;
                const moved = hand.splice(dragSrcIndex, 1)[0];
                hand.splice(index, 0, moved);
                dragSrcIndex = null;
                renderHandCards(); // only re-render the hand, keep rest of board intact
            };

            handArea.appendChild(cardEl);
        });

        // Make hand-area itself a drop target too (drop at end)
        handArea.ondragover = (e) => e.preventDefault();
        handArea.ondrop = (e) => {
            e.preventDefault();
            if (dragSrcIndex === null) return;
            const hand = activeGame.players[0].hand;
            const moved = hand.splice(dragSrcIndex, 1)[0];
            hand.push(moved);
            dragSrcIndex = null;
            renderHandCards();
        };
    }

    renderHandCards();

    // Sort buttons
    document.getElementById('sort-by-rank-btn').onclick = () => {
        activeGame.players[0].hand.sort((a, b) => a.rank - b.rank);
        renderHandCards();
    };
    document.getElementById('sort-by-suit-btn').onclick = () => {
        const suitOrder = { oros: 0, copas: 1, espadas: 2, bastos: 3 };
        activeGame.players[0].hand.sort((a, b) => {
            const sd = suitOrder[a.suit] - suitOrder[b.suit];
            return sd !== 0 ? sd : a.rank - b.rank;
        });
        renderHandCards();
    };

    // Render Discard Top
    if (state.discardTop) {
        discardTop.appendChild(board.renderCard(state.discardTop, true));
    }

    // Interaction handlers
    deckZone.onclick = () => {
        if (!state.isMyTurn) return;
        const res = activeGame.drawFromDeck(activeGame.players[0]);
        if (res.success) {
            renderChinchonBoard();
        } else {
            alert(res.message);
        }
    };

    discardZone.onclick = () => {
        if (!state.isMyTurn) return;
        if (!state.hasDrawnThisTurn) {
            const res = activeGame.drawFromDiscard(activeGame.players[0]);
            if (res.success) {
                renderChinchonBoard();
            } else {
                alert(res.message);
            }
        }
    };

    // Setup Discard Drop Zone (discard a card from hand)
    board.setupDropZone(discardZone, (data) => {
        if (!state.isMyTurn || !state.hasDrawnThisTurn) return;
        const res = activeGame.discardCard(activeGame.players[0], data);
        if (res.success) {
            renderChinchonBoard();
            performAITurnChinchon();
        } else {
            alert(res.message);
        }
    });

    closeBtn.onclick = () => {
        if (!state.isMyTurn || state.hasDrawnThisTurn) return;
        if (activeGame.canClose(activeGame.players[0], [])) {
            showChinchonResults();
        } else {
            alert('No puedes cerrar. Tienes más de 5 puntos en mano sin combinar.');
        }
    };
}

function performAITurnChinchon() {
    setTimeout(() => {
        if (!activeGame) return;
        const aiPlayer = activeGame.players[1];
        const state = activeGame.getGameState(1);
        if (!state.isMyTurn) return;

        // IA Check if can close
        if (activeGame.canClose(aiPlayer)) {
            alert('¡La IA ha cerrado la ronda!');
            showChinchonResults();
            return;
        }

        const move = AIEngine.getChinchonMove(aiPlayer.hand, state.discardTop, activeGame);
        
        if (move.drawFromDeck || !state.discardTop) {
            activeGame.drawFromDeck(aiPlayer);
        } else {
            activeGame.drawFromDiscard(aiPlayer);
        }
        
        setTimeout(() => {
            if (!activeGame) return;
            // Need recalculating discard since hand changed
            // We just pick highest rank.
            const sortedByRank = [...aiPlayer.hand].sort((a,b) => b.rank - a.rank);
            const toDiscard = move.discard || sortedByRank[0];
            
            activeGame.discardCard(aiPlayer, toDiscard);
            renderChinchonBoard();
        }, 1000);

    }, 1000);
}

function showChinchonResults() {
    const results = activeGame.calculateScores();
    // Update total points
    results.forEach((r, i) => {
        activeGame.players[i].totalPoints = (activeGame.players[i].totalPoints || 0) + r.points;
    });

    // Check if anyone reached 100 points (they LOSE)
    const p0Total = activeGame.players[0].totalPoints;
    const p1Total = activeGame.players[1].totalPoints;
    const gameOver = p0Total >= 100 || p1Total >= 100;
    let gameOverMsg = '';
    if (gameOver) {
        if (p0Total >= 100 && p1Total >= 100) {
            gameOverMsg = p0Total <= p1Total 
                ? `¡${activeGame.players[1].name} ha alcanzado 100 puntos y PIERDE! ¡Tú ganas!`
                : `¡Has alcanzado 100 puntos! ¡${activeGame.players[1].name} gana la partida!`;
        } else if (p0Total >= 100) {
            gameOverMsg = `¡Has alcanzado ${p0Total} puntos! Has PERDIDO la partida. ${activeGame.players[1].name} gana con ${p1Total} puntos.`;
        } else {
            gameOverMsg = `¡${activeGame.players[1].name} ha alcanzado ${p1Total} puntos y PIERDE! ¡Tú ganas con ${p0Total} puntos! 🏆`;
        }
    }

    gameInfo.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 3rem; border-radius: 30px; border: 2px solid ${gameOver ? '#ff4d4d' : 'var(--primary)'}; box-shadow: 0 20px 50px rgba(0,0,0,0.5); backdrop-filter: blur(10px);">
            <h2 style="color: ${gameOver ? '#ff4d4d' : 'var(--primary)'}; font-size: 3rem; margin-bottom: 2rem; font-weight: 900; letter-spacing: 2px;">${gameOver ? '🏁 PARTIDA TERMINADA' : 'RONDA FINALIZADA'}</h2>
            ${gameOver ? `<p style="font-size: 1.3rem; margin-bottom: 2rem; color: #fff;">${gameOverMsg}</p>` : ''}
            
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 3rem;">
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid ${p0Total >= 100 ? '#ff4d4d' : 'rgba(255,255,255,0.1)'}; width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">${results[0].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0; color: #ff4d4d;">+${results[0].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Malos Ronda</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: ${p0Total >= 100 ? '#ff4d4d' : '#fff'};">Total: ${p0Total}/100</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid ${p1Total >= 100 ? '#ff4d4d' : 'rgba(255,255,255,0.1)'}; width: 200px;">
                    <div style="font-size: 0.8rem; opacity: 0.7; text-transform: uppercase;">${results[1].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0; color: #ff4d4d;">+${results[1].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Malos Ronda</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: ${p1Total >= 100 ? '#ff4d4d' : '#fff'};">Total: ${p1Total}/100</div>
                </div>
            </div>

            <div style="display: flex; gap: 1.5rem; justify-content: center;">
                ${gameOver 
                    ? `<button class="primary-btn" onclick="exitChinchonGame()" style="padding: 1.2rem 2.5rem; font-size: 1.1rem;">VOLVER AL MENÚ</button>
                       <button class="primary-btn" style="border: 1px solid var(--primary); padding: 1.2rem 2.5rem; font-size: 1.1rem;" onclick="restartChinchon()">REVANCHA</button>`
                    : `<button class="primary-btn" onclick="nextChinchonRound()" style="padding: 1.2rem 2.5rem; font-size: 1.1rem;">SIGUIENTE RONDA</button>
                       <button class="primary-btn" style="background: transparent; border: 1px solid #ff4d4d; color: #ff4d4d; padding: 1.2rem 2.5rem; font-size: 1.1rem;" onclick="exitChinchonGame()">CERRAR Y GUARDAR</button>`
                }
            </div>
        </div>
    `;
}

window.nextChinchonRound = () => {
    activeGame.resetRound();
    renderChinchonBoard();
};

window.exitChinchonGame = () => {
    if (activeUser && activeGame) {
        let prestigeGained = 100 - activeGame.players[0].totalPoints;
        if (prestigeGained < 0) prestigeGained = 0;
        userManager.updateScore(activeUser.id, 'chinchon', prestigeGained);
        alert(`¡Partida guardada! Has acumulado ${prestigeGained} puntos de prestigio.`);
    }
    closeGame();
    renderStats();
};

window.restartChinchon = () => {
    startChinchon();
};

function startMus() {
    activeGame = new MusGame([activeUser.name, 'IA Bot']);
    activeGame.start();
    renderMusBoard();
}

function renderMusBoard() {
    gameInfo.innerHTML = `
        <div id="mus-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <a href="https://www.nhfournier.es/como-jugar/mus/" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; border: 1px solid var(--primary); padding: 0.2rem 0.8rem; border-radius: 20px; transition: all 0.3s; display: inline-block;">📖 Cómo jugar</a>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tus Puntos</div>
                   <div style="color: var(--primary); font-weight: 900; font-size: 1.2rem;">${activeGame.players[0].totalPoints || 0}</div>
                </div>
                <div style="text-align: center;">
                    <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Amarrecos (Piedras de la ronda)</div>
                    <div id="mus-score" style="font-size: 1.2rem; color: #fff;">0 / 40</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">IA (Bot)</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1.2rem;">${activeGame.players[1].totalPoints || 0}</div>
                </div>
            </div>
            
            <div id="betting-controls" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <button class="primary-btn" onclick="musAction('grande')">Grande (Envido)</button>
                <button class="primary-btn" onclick="musAction('chica')">Chica (Envido)</button>
                <button class="primary-btn" onclick="musAction('pares')">Pares (Envido)</button>
                <button class="primary-btn" onclick="musAction('juego')">Juego (Envido)</button>
                <button class="primary-btn" style="grid-column: span 1; background: #2a2a2a; border: 1px solid var(--primary);" onclick="toggleSignals()">💬 Hacer Seña</button>
                <button class="primary-btn" style="background: transparent; border: 1px solid var(--primary); color: var(--primary);" onclick="showMusResults()">RESOLVER RONDA</button>
            </div>

            <div id="mus-signals-menu" style="display: none; justify-content: center; gap: 1rem; margin-bottom: 2rem;">
                <div class="primary-btn" style="background: rgba(0,0,0,0.5); border: none; cursor:pointer;" onclick="sendSignal('Cejas (Grande)')"><span>🤨</span> Cejas</div>
                <div class="primary-btn" style="background: rgba(0,0,0,0.5); border: none; cursor:pointer;" onclick="sendSignal('Labio (Chica)')"><span>👄</span> Labio</div>
                <div class="primary-btn" style="background: rgba(0,0,0,0.5); border: none; cursor:pointer;" onclick="sendSignal('Mueca (Pares)')"><span>😏</span> Mueca</div>
                <div class="primary-btn" style="background: rgba(0,0,0,0.5); border: none; cursor:pointer;" onclick="sendSignal('Guiño (Juego)')"><span>😉</span> Guiño</div>
            </div>

            <div class="area">
                <div class="area-label">Tu Mano</div>
                <div id="hand-area" style="display: flex; justify-content: center; gap: 1rem;"></div>
            </div>
        </div>
    `;

    const handArea = document.getElementById('hand-area');
    activeGame.players[0].hand.forEach(card => {
        const cardEl = board.renderCard(card);
        handArea.appendChild(cardEl);
    });
}

window.musAction = (type) => {
    const messages = {
        grande: 'Has envidado a la Grande. La IA está pensando su respuesta...',
        chica: 'Has envidado a la Chica. ¡La IA se lo está pensando!',
        pares: '¿Tienes pares? Has envidado.',
        juego: 'Duelo de Juego (31+). Envido.',
        ordago: '¡ÓRDAGO POR EL JUEGO COMPLETO!'
    };
    alert(messages[type]);
    
    setTimeout(() => {
        if (!activeGame) return;
        const won = Math.random() > 0.4;
        if (won) {
            alert('¡La IA ha dicho "No Quiero"! Te llevas 1 piedra parcial.');
        } else {
            alert('¡La IA ha dicho "Quiero"! Se decidirá al resolver la ronda.');
        }
    }, 1000);
};

window.toggleSignals = () => {
    const menu = document.getElementById('mus-signals-menu');
    menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
};

window.sendSignal = (signal) => {
    alert(`Has hecho la seña: ${signal}`);
    document.getElementById('mus-signals-menu').style.display = 'none';
    
    setTimeout(() => {
        if (!activeGame) return;
        const reactions = [
            'La IA te mira fijamente... sospecha de tu seña.',
            'La IA ignora tu gesto y se concentra en sus cartas.',
            '¡Cuidado! La IA ha tomado nota de tu movimiento.'
        ];
        alert(reactions[Math.floor(Math.random() * reactions.length)]);
    }, 1500);
};

window.showMusResults = () => {
    const results = activeGame.calculateScores();
    results.forEach((r, i) => {
        activeGame.players[i].totalPoints = (activeGame.players[i].totalPoints || 0) + r.points;
    });

    gameInfo.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 3rem; border-radius: 30px; border: 2px solid var(--primary); box-shadow: 0 20px 50px rgba(0,0,0,0.5); backdrop-filter: blur(10px);">
            <h2 style="color: var(--primary); font-size: 3rem; margin-bottom: 2rem; font-weight: 900; letter-spacing: 2px;">RONDA FINALIZADA</h2>
            
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 3rem;">
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">${results[0].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0;">+${results[0].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Ronda</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold;">Juego: ${activeGame.players[0].totalPoints}</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); width: 200px;">
                    <div style="font-size: 0.8rem; opacity: 0.7; text-transform: uppercase;">${results[1].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0;">+${results[1].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Ronda</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold;">Juego: ${activeGame.players[1].totalPoints}</div>
                </div>
            </div>

            <div style="display: flex; gap: 1.5rem; justify-content: center;">
                <button class="primary-btn" onclick="nextMusRound()" style="padding: 1.2rem 2.5rem; font-size: 1.1rem;">SIGUIENTE RONDA</button>
                <button class="primary-btn" style="background: transparent; border: 1px solid #ff4d4d; color: #ff4d4d; padding: 1.2rem 2.5rem; font-size: 1.1rem;" onclick="exitMusGame()">CERRAR Y GUARDAR</button>
            </div>
        </div>
    `;
};

window.nextMusRound = () => {
    activeGame.resetRound();
    renderMusBoard();
};

window.exitMusGame = () => {
    if (activeUser && activeGame) {
        userManager.updateScore(activeUser.id, 'mus', activeGame.players[0].totalPoints);
        alert(`¡Partida guardada! Has acumulado ${activeGame.players[0].totalPoints} puntos.`);
    }
    closeGame();
    renderStats();
};

// --- TUTE ---
function startTute() {
    activeGame = new TuteGame([activeUser.name, 'IA Bot']);
    activeGame.start();
    renderTuteBoard();
}

function renderTuteBoard() {
    const state = activeGame.getGameState(0);

    gameInfo.innerHTML = `
        <div id="tute-ui">
            <div style="text-align: right; margin-bottom: 0.5rem;">
                <a href="https://www.nhfournier.es/como-jugar/tute/" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; border: 1px solid var(--primary); padding: 0.2rem 0.8rem; border-radius: 20px; transition: all 0.3s; display: inline-block;">📖 Cómo jugar</a>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2rem; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 12px; border: 1px solid var(--glass-border);">
                <div>
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Tus Puntos</div>
                   <div style="color: var(--primary); font-weight: 900; font-size: 1.2rem;">${activeGame.players[0].totalPoints || 0}</div>
                </div>
                <div style="text-align: center;">
                    <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">Triunfo</div>
                    <div style="font-size: 1.2rem; color: #fff; text-transform: uppercase;">${state.trump}</div>
                </div>
                <div style="text-align: right;">
                   <div class="area-label" style="font-size: 0.6rem; opacity: 0.6;">IA (Bot)</div>
                   <div style="color: #fff; font-weight: 700; font-size: 1.2rem;">${activeGame.players[1].totalPoints || 0}</div>
                </div>
            </div>
            
            <div class="area" style="min-height: 150px; display: flex; flex-direction: column; justify-content: center;">
                <div class="area-label" style="text-align: center;">Mesa (Baza Actual)</div>
                <div id="tute-table-area" style="display: flex; justify-content: center; gap: 1rem;"></div>
            </div>

            <div style="text-align: center; margin: 2rem 0;">
                <button class="primary-btn" onclick="showTuteResults()" style="padding: 1rem 3rem; font-size: 1.1rem;">CERRAR MANO (Evaluar Puntos)</button>
            </div>

            <div class="area">
                <div class="area-label">Tu Mano (10 Cartas)</div>
                <div id="hand-area" style="display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;"></div>
            </div>
        </div>
    `;

    const handArea = document.getElementById('hand-area');
    activeGame.players[0].hand.forEach(card => {
        const cardEl = board.renderCard(card);
        handArea.appendChild(cardEl);
    });
}

window.showTuteResults = () => {
    const results = activeGame.calculateScores();
    results.forEach((r, i) => {
        activeGame.players[i].totalPoints = (activeGame.players[i].totalPoints || 0) + r.points;
    });

    gameInfo.innerHTML = `
        <div style="text-align: center; background: rgba(0,0,0,0.6); padding: 3rem; border-radius: 30px; border: 2px solid var(--primary); box-shadow: 0 20px 50px rgba(0,0,0,0.5); backdrop-filter: blur(10px);">
            <h2 style="color: var(--primary); font-size: 3rem; margin-bottom: 2rem; font-weight: 900; letter-spacing: 2px;">RONDA FINALIZADA</h2>
            
            <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 3rem;">
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); width: 200px;">
                    <div style="font-size: 0.8rem; color: var(--primary); text-transform: uppercase;">${results[0].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0;">+${results[0].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Bazas y Cantes</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold;">Juego: ${activeGame.players[0].totalPoints}</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); width: 200px;">
                    <div style="font-size: 0.8rem; opacity: 0.7; text-transform: uppercase;">${results[1].name}</div>
                    <div style="font-size: 4rem; font-weight: 900; margin: 1rem 0;">+${results[1].points}</div>
                    <div style="font-size: 0.9rem; opacity: 0.7;">Ptos. Bazas y Cantes</div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-weight: bold;">Juego: ${activeGame.players[1].totalPoints}</div>
                </div>
            </div>

            <div style="display: flex; gap: 1.5rem; justify-content: center;">
                <button class="primary-btn" onclick="nextTuteRound()" style="padding: 1.2rem 2.5rem; font-size: 1.1rem;">SIGUIENTE MANO</button>
                <button class="primary-btn" style="background: transparent; border: 1px solid #ff4d4d; color: #ff4d4d; padding: 1.2rem 2.5rem; font-size: 1.1rem;" onclick="exitTuteGame()">CERRAR Y GUARDAR</button>
            </div>
        </div>
    `;
};

window.nextTuteRound = () => {
    activeGame.resetRound();
    renderTuteBoard();
};

window.exitTuteGame = () => {
    if (activeUser && activeGame) {
        userManager.updateScore(activeUser.id, 'tute', activeGame.players[0].totalPoints);
        alert(`¡Partida guardada! Has acumulado ${activeGame.players[0].totalPoints} puntos en el Tute.`);
    }
    closeGame();
    renderStats();
};


window.simulateVictory = (gameId) => {
    if (activeUser) {
        userManager.updateScore(activeUser.id, gameId, 10);
        renderStats();
        alert('¡Has ganado 10 puntos!');
    }
};

// Initial state check
window.onload = () => {
    if (userManager.users.length > 0) {
        activeUser = userManager.users[0]; // Auto-select first user for demo
        renderStats();
    }
};
function closeGame() { 
    document.getElementById('game-overlay').style.display = 'none'; 
    activeGame = null; 
    
    // Cleanup multiplayer connection if exists
    if (typeof mp !== 'undefined' && mp) {
        mp.disconnect();
        mp = null;
    }

    document.getElementById('game-info').innerHTML = '';
    document.getElementById('game-title').innerText = '';
}
window.closeGame = closeGame;
