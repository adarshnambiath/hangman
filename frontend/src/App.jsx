import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:8080');

function App() {
  const [revealed, setRevealed] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [isWordSetter, setIsWordSetter] = useState(false);
  const [hasSetWord, setHasSetWord] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [mutex, setMutex] = useState(false);

  useEffect(() => {
    socket.on('gameState', ({ revealed, guesses, mutex }) => {
      setRevealed(revealed);
      setGuesses(guesses);
      setMutex(mutex);
    });

    return () => {
      socket.off('gameState');
    };
  }, []);

  const sendWord = () => {
    socket.emit('setWord', wordInput);
    setHasSetWord(true);
    //setIsWordSetter(false);
    setWordInput('');
  };

  const guessLetter = () => {
    if (input.trim() !== '') {
      socket.emit('guessLetter', input);
      setInput('');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Hangman Game (Socket.IO)</h1>

      {isWordSetter ? (
        hasSetWord?(<>
          <div style={{ fontSize: 30 }}>
            {revealed.map((char, idx) => (
              <span key={idx} style={{ margin: 5 }}>{char}</span>
            ))}
          </div>
        </>)
        :(<>
          <input
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="Enter word to guess"
          />
          <button onClick={sendWord}>Set Word</button>
        </>)
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
          />
          <button onClick={guessLetter}>Guess</button>
        </>
      )}

      <div>
        <h3>Guessed Letters:</h3>
        {guesses.join(', ')}
      </div>

      <br />
      {mutex?(<></>):(<button onClick={() => setIsWordSetter(true)}>Become Word Setter</button>)}
    </div>
  );
}

export default App;
