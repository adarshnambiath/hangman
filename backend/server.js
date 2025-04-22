const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Create an HTTP server (Render will handle HTTPS)
const server = require('http').Server(app);

// Create a Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*', // You can specify your Netlify frontend URL here if needed
    methods: ['GET', 'POST']
  }
});

// Track the game state
const games = {}; // Tracks state for each room

// Handle new connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle joining a room
  socket.on('joinRoom', (room) => {
    socket.join(room);
    socket.room = room;

    // Create room if it doesn't exist
    if (!games[room]) {
      games[room] = {
        word: '',
        revealed: [],
        guesses: [],
        mutex: false
      };
    }

    const game = games[room];
    socket.emit('gameState', game);
  });

  // Set the word to be guessed
  socket.on('setWord', ({ room, word }) => {
    const game = games[room];
    if (!game || game.mutex) return;

    game.word = word.toLowerCase();
    game.revealed = Array(word.length).fill('_');
    game.guesses = [];
    game.mutex = true;

    io.to(room).emit('gameState', game);
  });

  // Handle guessing a letter
  socket.on('guessLetter', ({ room, letter }) => {
    const game = games[room];
    if (!game || !game.mutex) return;

    letter = letter.toLowerCase();
    if (!game.guesses.includes(letter)) {
      game.guesses.push(letter);

      for (let i = 0; i < game.word.length; i++) {
        if (game.word[i] === letter) {
          game.revealed[i] = letter;
        }
      }

      io.to(room).emit('gameState', game);

      const wrongGuesses = game.guesses.filter(l => !game.word.includes(l)).length;
      const won = !game.revealed.includes('_');
      const lost = wrongGuesses >= 6;

      if (won || lost) {
        io.to(room).emit('gameOver', {
          word: game.word,
          status: won ? 'win' : 'lose'
        });

        // Reset game for room
        game.word = '';
        game.revealed = [];
        game.guesses = [];
        game.mutex = false;
      }
    }
  });

  // Clean up empty rooms on disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    const room = socket.room;
    if (!room) return;

    setTimeout(() => {
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      if (roomSize === 0) {
        console.log(`Room "${room}" is empty. Deleting...`);
        delete games[room];
      }
    }, 1000);
  });
});

// Start the server, Render will automatically handle HTTPS
server.listen(80, () => {
  console.log('Socket.IO server running on https://hangman-backend.onrender.com');
});
