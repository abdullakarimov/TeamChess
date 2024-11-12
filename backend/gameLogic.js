let gameState = {
    players: [],
    moves: [],
    proposedMoves: {}  // Track proposals and counts
};

function handleMove(ws, data) {
    if (data.type === 'joinGame') {
        gameState.players.push({ id: data.playerId, ws });
        ws.send(JSON.stringify({ type: 'joined', message: `Welcome, ${data.playerId}!` }));
    } else if (data.type === 'proposeMove') {
        // Track the move proposal count
        const moveKey = `${data.move.fromX},${data.move.fromY},${data.move.toX},${data.move.toY}`;
        if (!gameState.proposedMoves[moveKey]) {
            gameState.proposedMoves[moveKey] = { count: 0, move: data.move };
        }
        gameState.proposedMoves[moveKey].count += 1;

        // Broadcast updated proposal data with count
        broadcastToAll({ type: 'proposedMove', move: data.move, count: gameState.proposedMoves[moveKey].count });
    } else if (data.type === 'finalizeMove') {
        // Clear proposed moves and finalize the move
        gameState.proposedMoves = {};
        broadcastToAll({ type: 'updateBoard', move: data.move });
    }
}

function broadcastToAll(message) {
    gameState.players.forEach(player => {
        player.ws.send(JSON.stringify(message));
    });
}

module.exports = { handleMove };
