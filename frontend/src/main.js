const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 800,
    scene: {
        preload: preload,
        create: create
    }
};

const game = new Phaser.Game(config);
const socket = new WebSocket('ws://localhost:3001');

function preload() {
    // Load images for each piece
    this.load.image('white_pawn', 'assets/white_pawn.svg');
    this.load.image('white_rook', 'assets/white_rook.svg');
    this.load.image('white_knight', 'assets/white_knight.svg');
    this.load.image('white_bishop', 'assets/white_bishop.svg');
    this.load.image('white_queen', 'assets/white_queen.svg');
    this.load.image('white_king', 'assets/white_king.svg');

    this.load.image('black_pawn', 'assets/black_pawn.svg');
    this.load.image('black_rook', 'assets/black_rook.svg');
    this.load.image('black_knight', 'assets/black_knight.svg');
    this.load.image('black_bishop', 'assets/black_bishop.svg');
    this.load.image('black_queen', 'assets/black_queen.svg');
    this.load.image('black_king', 'assets/black_king.svg');
}

let selectedTile = null;
const pieceSprites = {};

function placePieces(positions, tileSize) {
    positions.white.pawns.forEach(pos => {
        pieceSprites[`white_pawn_${pos.x}_${pos.y}`] = this.add.image(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, 'white_pawn');
    });
    positions.black.pawns.forEach(pos => {
        pieceSprites[`black_pawn_${pos.x}_${pos.y}`] = this.add.image(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, 'black_pawn');
    });

    positions.white.pieces.forEach(pos => {
        pieceSprites[`white_${pos.type}_${pos.x}_${pos.y}`] = this.add.image(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, `white_${pos.type}`);
    });
    positions.black.pieces.forEach(pos => {
        pieceSprites[`black_${pos.type}_${pos.x}_${pos.y}`] = this.add.image(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, `black_${pos.type}`);
    });
}

function create() {
    const boardSize = 8;
    const tileSize = 100;

    const startingPositions = {
        white: {
            pawns: Array.from({ length: 8 }, (_, i) => ({ x: i, y: 6 })),
            pieces: [
                { type: 'rook', x: 0, y: 7 }, { type: 'knight', x: 1, y: 7 }, { type: 'bishop', x: 2, y: 7 },
                { type: 'queen', x: 3, y: 7 }, { type: 'king', x: 4, y: 7 }, { type: 'bishop', x: 5, y: 7 },
                { type: 'knight', x: 6, y: 7 }, { type: 'rook', x: 7, y: 7 }
            ]
        },
        black: {
            pawns: Array.from({ length: 8 }, (_, i) => ({ x: i, y: 1 })),
            pieces: [
                { type: 'rook', x: 0, y: 0 }, { type: 'knight', x: 1, y: 0 }, { type: 'bishop', x: 2, y: 0 },
                { type: 'queen', x: 3, y: 0 }, { type: 'king', x: 4, y: 0 }, { type: 'bishop', x: 5, y: 0 },
                { type: 'knight', x: 6, y: 0 }, { type: 'rook', x: 7, y: 0 }
            ]
        }
    };

    for (let x = 0; x < boardSize; x++) {
        for (let y = 0; y < boardSize; y++) {
            const color = (x + y) % 2 === 0 ? 0xffffff : 0x000000;
            const tile = this.add.rectangle(x * tileSize, y * tileSize, tileSize, tileSize, color).setOrigin(0);
            tile.setInteractive();
            tile.on('pointerdown', () => handleTileClick.call(this, x, y, tile));
        }
    }

    placePieces.call(this, startingPositions, tileSize);

    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'joined') console.log(message.message);
        else if (message.type === 'proposedMove') displayProposedMove.call(this, message.move, message.count);
        else if (message.type === 'updateBoard') displayMove.call(this, message.move);
    });
}

function handleTileClick(x, y, tile) {
    if (!selectedTile) {
        selectedTile = { x, y };
        tile.setFillStyle(0x00ff00);
        console.log(`Selected piece at (${x}, ${y})`);
    } else {
        const proposedMove = { fromX: selectedTile.x, fromY: selectedTile.y, toX: x, toY: y };
        sendMessage({ type: 'proposeMove', move: proposedMove });
        console.log(`Proposed move from (${selectedTile.x}, ${selectedTile.y}) to (${x}, ${y})`);

        selectedTile = null;
        this.children.each(child => {
            if (child.fillColor !== undefined) {
                const originalColor = (Math.floor(child.x / 100) + Math.floor(child.y / 100)) % 2 === 0 ? 0xffffff : 0x000000;
                child.setFillStyle(originalColor);
            }
        });
    }
}

function displayProposedMove(move, count) {
    const { fromX, fromY, toX, toY } = move;
    const tileSize = 100;

    // Adjust color intensity based on the count
    const maxIntensity = 255; // Maximum color intensity
    const baseIntensity = 50; // Starting intensity for the first vote
    const colorIntensity = Math.min(maxIntensity, baseIntensity + count * 40); // Increase intensity with each vote
    const colorHighlight = Phaser.Display.Color.GetColor(0, 0, colorIntensity); // Adjust blue intensity

    // Highlight the destination tile with the adjusted color
    this.add.rectangle(toX * tileSize, toY * tileSize, tileSize, tileSize, colorHighlight).setOrigin(0);

    // Display a faint image of the proposed piece
    const pieceKey = Object.keys(pieceSprites).find(key => key.includes(`${fromX}_${fromY}`));
    if (pieceKey && this.textures.exists(pieceSprites[pieceKey].texture.key)) {
        this.add.image(toX * tileSize + tileSize / 2, toY * tileSize + tileSize / 2, pieceSprites[pieceKey].texture.key)
            .setAlpha(0.3); // Set transparency to make it faint
    }
}



function displayMove(move) {
    const { fromX, fromY, toX, toY } = move;
    this.children.each(child => {
        const originalColor = (Math.floor(child.x / 100) + Math.floor(child.y / 100)) % 2 === 0 ? 0xffffff : 0x000000;
        child.setFillStyle(originalColor);
    });

    const pieceKey = Object.keys(pieceSprites).find(key => key.includes(`${fromX}_${fromY}`));
    if (pieceKey) {
        const piece = pieceSprites[pieceKey];
        piece.setPosition(toX * tileSize + tileSize / 2, toY * tileSize + tileSize / 2);

        pieceSprites[`${pieceKey.split('_').slice(0, -2).join('_')}_${toX}_${toY}`] = piece;
        delete pieceSprites[pieceKey];
    }

    this.add.rectangle(toX * tileSize, toY * tileSize, tileSize, tileSize, 0xff0000).setOrigin(0);
}

function sendMessage(data) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.error("WebSocket connection is not open. Message not sent.");
    }
}

socket.addEventListener('open', () => {
    console.log('Connected to the WebSocket server');
    sendMessage({ type: 'joinGame', playerId: 'Player1' });
});
