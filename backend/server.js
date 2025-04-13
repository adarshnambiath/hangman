const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let word = '';
let revealed = [];
let guesses = [];
let mutex=false;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.emit('gameState', { revealed, guesses, mutex });

  socket.on('setWord', (data) => {
    if(mutex) return;
    mutex=true;
    word = data.toLowerCase();
    revealed = Array(word.length).fill('_');
    guesses = [];
    io.emit('gameState', { revealed, guesses, mutex });
  });

  socket.on('guessLetter', (letter) => {
    letter = letter.toLowerCase();
    if (!guesses.includes(letter)) {
      guesses.push(letter);

      for (let i = 0; i < word.length; i++) {
        if (word[i] === letter) {
          revealed[i] = letter;
        }
      }

      io.emit('gameState', { revealed, guesses,mutex });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(8080, () => {
  console.log('Socket.IO server running on http://localhost:8080');
});
