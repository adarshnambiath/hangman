const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const games = {}; // Tracks game state per room
const clients = new Map(); // Map each socket to a room

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.type === 'joinRoom') {
      const { room } = msg;
      clients.set(ws, room);
      ws.room = room;

      if (!games[room]) {
        games[room] = {
          word: '',
          revealed: [],
          guesses: [],
          mutex: false
        };
      }

      const game = games[room];
      ws.send(JSON.stringify({ type: 'gameState', game }));
    }

    if (msg.type === 'setWord') {
      const { room, word } = msg;
      const game = games[room];
      if (!game || game.mutex) return;

      game.word = word.toLowerCase();
      game.revealed = Array(word.length).fill('_');
      game.guesses = [];
      game.mutex = true;

      broadcast(room, { type: 'gameState', game });
    }

    if (msg.type === 'guessLetter') {
      const { room, letter } = msg;
      const game = games[room];
      if (!game || !game.mutex) return;

      const l = letter.toLowerCase();
      if (!game.guesses.includes(l)) {
        game.guesses.push(l);

        for (let i = 0; i < game.word.length; i++) {
          if (game.word[i] === l) {
            game.revealed[i] = l;
          }
        }

        broadcast(room, { type: 'gameState', game });

        const wrongGuesses = game.guesses.filter(ch => !game.word.includes(ch)).length;
        const won = !game.revealed.includes('_');
        const lost = wrongGuesses >= 6;

        if (won || lost) {
          broadcast(room, {
            type: 'gameOver',
            word: game.word,
            status: won ? 'win' : 'lose'
          });

          game.word = '';
          game.revealed = [];
          game.guesses = [];
          game.mutex = false;
        }
      }
    }
  });

  ws.on('close', () => {
    const room = ws.room;
    clients.delete(ws);

    if (!room) return;

    setTimeout(() => {
      const roomClients = Array.from(clients.entries()).filter(([, r]) => r === room);
      if (roomClients.length === 0) {
        console.log(`Room "${room}" is empty. Deleting...`);
        delete games[room];
      }
    }, 1000);
  });
});

function broadcast(room, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && clients.get(client) === room) {
      client.send(JSON.stringify(data));
    }
  });
}

server.listen(8080, () => {
  console.log('WebSocket server running on http://localhost:8080');
});
