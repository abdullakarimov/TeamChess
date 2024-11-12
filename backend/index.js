// backend/index.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.PORT || 3001;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Placeholder game logic
const gameLogic = require('./gameLogic');

wss.on('connection', (ws) => {
    console.log('New player connected');
    ws.on('message', (message) => {
        // Handle incoming messages
        const data = JSON.parse(message);
        gameLogic.handleMove(ws, data);
    });

    ws.on('close', () => console.log('Player disconnected'));
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
