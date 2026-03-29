/**
 * MultiplayerManager - WebRTC P2P multiplayer via PeerJS.
 * 
 * Host creates a room → gets a 6-char code.
 * Guest joins with that code → direct P2P connection.
 * Host runs the authoritative game logic; guest sends actions & receives state.
 */
export class MultiplayerManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.roomCode = '';
        this.playerName = '';
        this.remoteName = '';
        this.onConnected = null;      // callback(remoteName)
        this.onDisconnected = null;   // callback()
        this.onGameAction = null;     // callback(action) - received from remote
        this.onGameState = null;      // callback(state) - received from remote
        this.onError = null;          // callback(errorMsg)
        this.connected = false;
    }

    /**
     * Generate a short room code.
     */
    _generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous: 0/O, 1/I/L
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    /**
     * Create a room (host).
     * @param {string} playerName
     * @returns {Promise<string>} roomCode
     */
    createRoom(playerName) {
        this.playerName = playerName;
        this.isHost = true;
        this.roomCode = this._generateCode();

        return new Promise((resolve, reject) => {
            // PeerJS ID = room code (prefixed to avoid collisions)
            const peerId = 'jcp-' + this.roomCode;
            
            this.peer = new Peer(peerId, {
                debug: 0
            });

            this.peer.on('open', (id) => {
                console.log('[MP] Host room created:', this.roomCode);
                resolve(this.roomCode);
            });

            this.peer.on('connection', (conn) => {
                this.connection = conn;
                this._setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('[MP] Peer error:', err);
                if (err.type === 'unavailable-id') {
                    // Room code collision, try again
                    this.roomCode = this._generateCode();
                    this.peer.destroy();
                    this.createRoom(playerName).then(resolve).catch(reject);
                } else {
                    if (this.onError) this.onError('Error de conexión: ' + err.message);
                    reject(err);
                }
            });
        });
    }

    /**
     * Join an existing room (guest).
     * @param {string} playerName
     * @param {string} roomCode
     * @returns {Promise<void>}
     */
    joinRoom(playerName, roomCode) {
        this.playerName = playerName;
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase();

        return new Promise((resolve, reject) => {
            this.peer = new Peer(undefined, {
                debug: 0
            });

            this.peer.on('open', () => {
                const conn = this.peer.connect('jcp-' + this.roomCode, {
                    metadata: { name: this.playerName }
                });
                this.connection = conn;
                this._setupConnection(conn);
                
                // Timeout if connection doesn't open
                const timeout = setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('No se pudo conectar. Verifica el código de sala.'));
                        this.disconnect();
                    }
                }, 10000);

                conn.on('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            this.peer.on('error', (err) => {
                console.error('[MP] Join error:', err);
                if (this.onError) this.onError('No se encontró la sala: ' + roomCode);
                reject(err);
            });
        });
    }

    /**
     * Setup data connection event handlers.
     */
    _setupConnection(conn) {
        conn.on('open', () => {
            this.connected = true;
            
            // Exchange names
            conn.send({
                type: 'handshake',
                name: this.playerName
            });
            
            console.log('[MP] Connection established');
        });

        conn.on('data', (data) => {
            if (!data || !data.type) return;

            switch (data.type) {
                case 'handshake':
                    this.remoteName = data.name;
                    console.log('[MP] Remote player:', this.remoteName);
                    if (this.onConnected) this.onConnected(this.remoteName);
                    break;

                case 'game-action':
                    // Guest sends actions to host
                    if (this.onGameAction) this.onGameAction(data.action);
                    break;

                case 'game-state':
                    // Host sends state to guest
                    if (this.onGameState) this.onGameState(data.state);
                    break;

                case 'chat':
                    if (this.onChat) this.onChat(data.message, data.sender);
                    break;

                case 'game-start':
                    if (this.onGameStart) this.onGameStart(data.gameId, data.config);
                    break;

                case 'alert':
                    if (this.onAlert) this.onAlert(data.message);
                    break;
            }
        });

        conn.on('close', () => {
            this.connected = false;
            console.log('[MP] Connection closed');
            if (this.onDisconnected) this.onDisconnected();
        });

        conn.on('error', (err) => {
            console.error('[MP] Connection error:', err);
            if (this.onError) this.onError('Se perdió la conexión con el otro jugador.');
        });
    }

    /**
     * Send a game action (guest → host).
     */
    sendAction(action) {
        if (!this.connection || !this.connected) return;
        this.connection.send({ type: 'game-action', action });
    }

    /**
     * Send game state (host → guest).
     */
    sendState(state) {
        if (!this.connection || !this.connected) return;
        this.connection.send({ type: 'game-state', state });
    }

    /**
     * Send alert message to remote.
     */
    sendAlert(message) {
        if (!this.connection || !this.connected) return;
        this.connection.send({ type: 'alert', message });
    }

    /**
     * Signal game start to the guest.
     */
    sendGameStart(gameId, config) {
        if (!this.connection || !this.connected) return;
        this.connection.send({ type: 'game-start', gameId, config });
    }

    /**
     * Clean up.
     */
    disconnect() {
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connected = false;
        this.isHost = false;
        this.roomCode = '';
        this.remoteName = '';
    }
}
