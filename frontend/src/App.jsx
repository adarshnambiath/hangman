import { useEffect, useState } from 'react';
import './App.css';

const socket = new WebSocket('ws://localhost:8080');

function App() {
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);

  const [revealed, setRevealed] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [isWordSetter, setIsWordSetter] = useState(false);
  const [hasSetWord, setHasSetWord] = useState(false);
  const [mutex, setMutex] = useState(false);

  useEffect(() => {
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'gameState') {
        setRevealed(message.game.revealed);
        setGuesses(message.game.guesses);
        setMutex(message.game.mutex);

        if (message.game.mutex && !hasSetWord) {
          setIsWordSetter(false);
        }
      }

      if (message.type === 'gameOver') {
        if (message.status === 'win') {
          alert(`🎉 You guessed it! The word was "${message.word}"`);
        } else {
          alert(`💀 Game Over! The word was "${message.word}"`);
        }

        setIsWordSetter(false);
        setHasSetWord(false);
        setRevealed([]);
        setGuesses([]);
        setMutex(false);
      }
    };
  }, [hasSetWord]);

  const send = (data) => {
    socket.send(JSON.stringify(data));
  };

  const joinRoom = () => {
    if (room.trim() !== '') {
      send({ type: 'joinRoom', room });
      setJoined(true);
    }
  };

  const sendWord = () => {
    if (/^[a-zA-Z]+$/.test(wordInput)) {
      send({ type: 'setWord', room, word: wordInput });
      setHasSetWord(true);
      setWordInput('');
    } else {
      alert("Please enter a valid word (letters only).");
    }
  };

  const guessLetter = () => {
    const letter = input.trim().toLowerCase();
    if (/^[a-z]$/.test(letter) && !guesses.includes(letter)) {
      send({ type: 'guessLetter', room, letter });
      setInput('');
    }
  };

  const getHangmanDrawing = (wrongGuessCount) => {
    const parts = ['  O  ', '  |  ', ' /', '|', '\\', ' / ', ' \\'];
    const scaffold = [
      ' +---+',
      ' |   |',
      ` |   ${wrongGuessCount > 0 ? parts[0] : ''}`,
      ` |  ${wrongGuessCount > 2 ? parts[2] : ' '}${wrongGuessCount > 1 ? parts[1] : ''}${wrongGuessCount > 3 ? parts[4] : ''}`,
      ` |  ${wrongGuessCount > 4 ? parts[5] : ''}${wrongGuessCount > 5 ? parts[6] : ''}`,
      ' |',
      '========='
    ];
    return scaffold.join('\n');
  };

  const wrongGuesses = guesses.filter((l) => !revealed.includes(l) && !wordInput.includes(l)).length;
  const hangman = getHangmanDrawing(wrongGuesses);

  if (!joined) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Enter Room Code</h2>
        <input value={room} onChange={(e) => setRoom(e.target.value)} />
        <button onClick={joinRoom}>Join</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Hangman Game (Room: {room})</h1>

      <pre style={{ fontFamily: 'monospace', fontSize: 16 }}>{hangman}</pre>

      {isWordSetter ? (
        hasSetWord ? (
          <div style={{ fontSize: 30 }}>
            {revealed.map((char, idx) => (
              <span key={idx} style={{ margin: 5 }}>{char}</span>
            ))}
          </div>
        ) : (
          <>
            <input
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Enter word to guess"
            />
            <button onClick={sendWord}>Set Word</button>
          </>
        )
      ) : (
        <>
          <div style={{ fontSize: 30 }}>
            {revealed.map((char, idx) => (
              <span key={idx} style={{ margin: 5 }}>{char}</span>
            ))}
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Guess a letter"
            maxLength={1}
            disabled={revealed.length === 0 || !mutex}
          />
          <button onClick={guessLetter}>Guess</button>
        </>
      )}

      <div>
        <h3>Guessed Letters:</h3>
        {guesses.join(', ')}
      </div>

      <br />
      {!mutex && !hasSetWord && !isWordSetter && (
        <button onClick={() => setIsWordSetter(true)}>Become Word Setter</button>
      )}
    </div>
  );
}

export default App;
