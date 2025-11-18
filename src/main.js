import './style.css'

const SPEED_ADJUSTMENT_STEP = 50; // WPM to increase/decrease with arrow keys
const WORD_JUMP_AMOUNT = 50; // Words to jump with left/right arrows

class BookReader {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.intervalId = null;
    this.wpm = 300; // Words per minute
    this.readingMode = 'visual'; // 'visual' or 'speech'
    this.currentUtterance = null;
    this.speechQueue = [];
    this.isSpeechActive = false;
    
    this.elements = {
      wordDisplay: document.getElementById('word-display'),
      fileInput: document.getElementById('file-input'),
      loadSampleBtn: document.getElementById('load-sample'),
      playPauseBtn: document.getElementById('play-pause'),
      speedSlider: document.getElementById('speed'),
      speedValue: document.getElementById('speed-value'),
      progressText: document.getElementById('progress-text'),
      helpButton: document.getElementById('help-button'),
      helpOverlay: document.getElementById('help-overlay'),
      closeHelpBtn: document.getElementById('close-help'),
      readingModeInputs: document.querySelectorAll('input[name="reading-mode"]')
    };
    
    this.setupEventListeners();
    this.loadFromLocalStorage();
  }
  
  setupEventListeners() {
    this.elements.fileInput.addEventListener('change', (e) => this.loadBook(e));
    this.elements.loadSampleBtn.addEventListener('click', () => this.loadSampleBook());
    this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.elements.speedSlider.addEventListener('input', (e) => this.updateSpeed(e.target.value));
    this.elements.readingModeInputs.forEach(input => {
      input.addEventListener('change', (e) => this.setReadingMode(e.target.value));
    });
    this.elements.helpButton.addEventListener('click', () => this.toggleHelp());
    this.elements.closeHelpBtn.addEventListener('click', () => this.toggleHelp());
    this.elements.helpOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.helpOverlay) {
        this.toggleHelp();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.words.length > 0) {
        e.preventDefault();
        this.togglePlayPause();
      }
      
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        this.adjustSpeed(SPEED_ADJUSTMENT_STEP);
      }
      
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.adjustSpeed(-SPEED_ADJUSTMENT_STEP);
      }
      
      if (e.code === 'ArrowLeft' && this.words.length > 0) {
        e.preventDefault();
        this.jumpWords(-WORD_JUMP_AMOUNT);
      }
      
      if (e.code === 'ArrowRight' && this.words.length > 0) {
        e.preventDefault();
        this.jumpWords(WORD_JUMP_AMOUNT);
      }
      
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        this.toggleMode();
      }
      
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        this.toggleHelp();
      }
      
      if (e.code === 'Escape') {
        if (!this.elements.helpOverlay.classList.contains('hidden')) {
          this.toggleHelp();
        }
      }
    });
  }
  
  loadBook(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      this.processBookText(text);
    };
    reader.readAsText(file);
  }
  
  async loadSampleBook() {
    try {
      const response = await fetch('/books/pg-alice.txt');
      if (!response.ok) throw new Error('Failed to load sample book');
      const text = await response.text();
      this.processBookText(text);
    } catch (error) {
      console.error('Error loading sample book:', error);
      alert('Failed to load sample book. Please check that the file exists.');
    }
  }
  
  processBookText(text) {
    // Split by whitespace and filter out empty strings
    this.words = text.split(/\s+/).filter(word => word.length > 0);
    this.currentIndex = 0;
    this.updateDisplay();
    this.elements.playPauseBtn.disabled = false;
    this.updateProgress();
    this.saveToLocalStorage();
  }
  
  saveToLocalStorage() {
    try {
      const bookData = {
        text: this.words.join(' '),
        currentIndex: this.currentIndex,
        wpm: this.wpm,
        readingMode: this.readingMode
      };
      localStorage.setItem('bookReaderData', JSON.stringify(bookData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  loadFromLocalStorage() {
    try {
      const savedData = localStorage.getItem('bookReaderData');
      if (!savedData) return;
      
      const bookData = JSON.parse(savedData);
      
      // Restore the book
      this.words = bookData.text.split(/\s+/).filter(word => word.length > 0);
      
      // Restore position
      this.currentIndex = Math.min(bookData.currentIndex || 0, this.words.length - 1);
      
      // Restore speed
      if (bookData.wpm) {
        this.wpm = bookData.wpm;
        this.updateSpeed(this.wpm);
      }
      
      // Restore reading mode
      if (bookData.readingMode) {
        this.readingMode = bookData.readingMode;
        const modeInput = document.querySelector(`input[name="reading-mode"][value="${this.readingMode}"]`);
        if (modeInput) modeInput.checked = true;
      }
      
      // Update UI
      if (this.words.length > 0) {
        this.updateDisplay();
        this.elements.playPauseBtn.disabled = false;
        this.updateProgress();
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }
  
  updateSpeed(wpm) {
    this.wpm = parseInt(wpm);
    this.elements.speedValue.textContent = wpm;
    this.elements.speedSlider.value = wpm;
    
    // If currently playing, restart with new speed
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
    
    // Save speed change
    if (this.words.length > 0) {
      this.saveToLocalStorage();
    }
  }
  
  adjustSpeed(change) {
    const newSpeed = Math.max(100, Math.min(1000, this.wpm + change));
    this.updateSpeed(newSpeed);
  }
  
  setReadingMode(mode) {
    // Stop current playback if switching modes
    if (this.isPlaying) {
      this.pause();
    }
    
    this.readingMode = mode;
    
    // Update radio buttons
    const modeInput = document.querySelector(`input[name="reading-mode"][value="${mode}"]`);
    if (modeInput) {
      modeInput.checked = true;
    }
    
    // Save preference
    if (this.words.length > 0) {
      this.saveToLocalStorage();
    }
  }
  
  toggleMode() {
    const newMode = this.readingMode === 'visual' ? 'speech' : 'visual';
    this.setReadingMode(newMode);
  }
  
  speakFromCurrentPosition() {
    // Get remaining words from current position
    const remainingWords = this.words.slice(this.currentIndex);
    
    console.log('Total words to speak:', remainingWords.length);
    
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      console.log('Canceling existing speech');
      window.speechSynthesis.cancel();
    }
    
    // Clear any existing queue
    this.speechQueue = [];
    this.isSpeechActive = true;
    
    // Split into chunks of ~200 words to avoid browser limits
    const chunkSize = 200;
    for (let i = 0; i < remainingWords.length; i += chunkSize) {
      const chunk = remainingWords.slice(i, i + chunkSize);
      this.speechQueue.push({
        text: chunk.join(' '),
        startIndex: this.currentIndex + i,
        wordCount: chunk.length
      });
    }
    
    console.log('Created', this.speechQueue.length, 'speech chunks');
    
    // Start speaking the first chunk
    this.speakNextChunk();
  }
  
  speakNextChunk() {
    if (!this.isSpeechActive || this.speechQueue.length === 0) {
      // Done speaking all chunks
      if (this.isSpeechActive) {
        console.log('Speech completed');
        this.currentIndex = this.words.length - 1;
        this.updateDisplay();
        this.updateProgress();
        this.pause();
      }
      return;
    }
    
    const chunk = this.speechQueue.shift();
    console.log('Speaking chunk, words:', chunk.wordCount, 'starting at index:', chunk.startIndex);
    
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    let lastWordIndex = 0;
    
    utterance.onstart = () => {
      console.log('Chunk started');
      this.currentIndex = chunk.startIndex;
      this.updateDisplay();
      this.updateProgress();
    };
    
    // Track word boundaries to update display
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Count words spoken in current chunk based on character position
        const spokenText = chunk.text.substring(0, event.charIndex);
        const wordsSpoken = spokenText.trim().split(/\s+/).filter(w => w.length > 0).length;
        
        if (wordsSpoken !== lastWordIndex) {
          lastWordIndex = wordsSpoken;
          this.currentIndex = chunk.startIndex + wordsSpoken;
          this.updateDisplay();
          this.updateProgress();
        }
      }
    };
    
    utterance.onend = () => {
      console.log('Chunk ended, remaining chunks:', this.speechQueue.length);
      this.currentIndex = chunk.startIndex + chunk.wordCount;
      this.updateDisplay();
      this.updateProgress();
      
      // Speak next chunk
      this.speakNextChunk();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      this.isSpeechActive = false;
      this.pause();
    };
    
    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
  
  jumpWords(amount) {
    const newIndex = Math.max(0, Math.min(this.words.length - 1, this.currentIndex + amount));
    this.currentIndex = newIndex;
    this.updateDisplay();
    this.updateProgress();
    this.saveToLocalStorage();
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play() {
    if (this.currentIndex >= this.words.length) {
      this.currentIndex = 0;
    }
    
    this.isPlaying = true;
    this.elements.playPauseBtn.textContent = 'Pause';
    
    console.log('Play mode:', this.readingMode);
    
    if (this.readingMode === 'speech') {
      // Use speech synthesis
      console.log('Starting speech from index:', this.currentIndex);
      this.speakFromCurrentPosition();
    } else {
      // Visual word-by-word display
      const interval = 60000 / this.wpm; // Convert WPM to milliseconds
      this.intervalId = setInterval(() => {
        this.displayNextWord();
      }, interval);
    }
  }
  
  pause() {
    this.stop();
    this.elements.playPauseBtn.textContent = 'Play';
    
    // Stop speech mode
    this.isSpeechActive = false;
    this.speechQueue = [];
    
    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }
  
  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  displayNextWord() {
    if (this.currentIndex >= this.words.length) {
      this.pause();
      this.currentIndex = 0;
      return;
    }
    
    this.updateDisplay();
    this.currentIndex++;
    this.updateProgress();
    
    // Save progress periodically (every 10 words to reduce storage writes)
    if (this.currentIndex % 10 === 0) {
      this.saveToLocalStorage();
    }
  }
  
  updateDisplay() {
    if (this.words.length > 0 && this.currentIndex < this.words.length) {
      const currentWord = this.words[this.currentIndex];
      this.elements.wordDisplay.textContent = currentWord;
    }
  }
  
  updateProgress() {
    this.elements.progressText.textContent = 
      `${this.currentIndex + 1} / ${this.words.length}`;
  }
  
  toggleHelp() {
    const isCurrentlyHidden = this.elements.helpOverlay.classList.contains('hidden');
    
    // If we're about to show the help overlay and currently playing, pause
    if (isCurrentlyHidden && this.isPlaying) {
      this.pause();
    }
    
    this.elements.helpOverlay.classList.toggle('hidden');
  }
}

// Initialize the book reader
new BookReader();

