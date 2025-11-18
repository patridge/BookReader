import './style.css'

class BookReader {
  constructor() {
    this.words = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.intervalId = null;
    this.wpm = 300; // Words per minute
    
    this.elements = {
      wordDisplay: document.getElementById('word-display'),
      fileInput: document.getElementById('file-input'),
      playPauseBtn: document.getElementById('play-pause'),
      speedSlider: document.getElementById('speed'),
      speedValue: document.getElementById('speed-value'),
      progressText: document.getElementById('progress-text')
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.elements.fileInput.addEventListener('change', (e) => this.loadBook(e));
    this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.elements.speedSlider.addEventListener('input', (e) => this.updateSpeed(e.target.value));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.words.length > 0) {
        e.preventDefault();
        this.togglePlayPause();
      }
    });
  }
  
  loadBook(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Split by whitespace and filter out empty strings
      this.words = text.split(/\s+/).filter(word => word.length > 0);
      this.currentIndex = 0;
      this.updateDisplay();
      this.elements.playPauseBtn.disabled = false;
      this.updateProgress();
    };
    reader.readAsText(file);
  }
  
  updateSpeed(wpm) {
    this.wpm = parseInt(wpm);
    this.elements.speedValue.textContent = wpm;
    
    // If currently playing, restart with new speed
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
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
    
    const interval = 60000 / this.wpm; // Convert WPM to milliseconds
    this.intervalId = setInterval(() => {
      this.displayNextWord();
    }, interval);
  }
  
  pause() {
    this.stop();
    this.elements.playPauseBtn.textContent = 'Play';
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
  }
  
  updateDisplay() {
    if (this.words.length > 0 && this.currentIndex < this.words.length) {
      this.elements.wordDisplay.textContent = this.words[this.currentIndex];
    }
  }
  
  updateProgress() {
    this.elements.progressText.textContent = 
      `${this.currentIndex + 1} / ${this.words.length}`;
  }
}

// Initialize the book reader
new BookReader();

