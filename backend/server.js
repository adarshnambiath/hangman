const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const games = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    socket.room = room;

    if (!games[room]) {
      //if the room doesnt exist
      games[room] = {
        word: "",
        revealed: [],
        guesses: [],
        mutex: false,
      };
    }

    const game = games[room];
    socket.emit("gameState", game);
  });

  socket.on("setWord", ({ room, word }) => {
    const game = games[room];
    if (!game || game.mutex) return;

    game.word = word.toLowerCase();
    game.revealed = Array(word.length).fill("_");
    game.guesses = [];
    game.mutex = true;

    io.to(room).emit("gameState", game);
  });

  socket.on("guessLetter", ({ room, letter }) => {
    const game = games[room];
    if (!game || !game.mutex) return;

    letter = letter.toLowerCase(); // to remove case sensitivity
    if (!game.guesses.includes(letter)) {
      game.guesses.push(letter);

      for (let i = 0; i < game.word.length; i++) {
        if (game.word[i] === letter) {
          game.revealed[i] = letter;
        }
      }

      io.to(room).emit("gameState", game);

      const wrongGuesses = game.guesses.filter((l) => !game.word.includes(l))
        .length;
      const won = !game.revealed.includes("_");
      const lost = wrongGuesses >= 6;

      if (won || lost) {
        io.to(room).emit("gameOver", {
          word: game.word,
          status: won ? "win" : "lose", //propogates win status
        });

        games[room] = {
          word: "",
          revealed: [],
          guesses: [],
          mutex: false,
        };

        io.to(room).emit("gameState", games[room]);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const room = socket.room;
    if (!room) return;

    setTimeout(() => {
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      if (roomSize === 0) {
        console.log(`Room "${room}" is empty. Deleting...`); //deletion of room if nobody is in it
        delete games[room];
      }
    }, 1000);
  });
});

server.listen(8080, () => {
  console.log("Socket.IO server running on http://localhost:8080");
});
