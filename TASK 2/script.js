document.addEventListener('DOMContentLoaded', () => {
    // --- Constants for better readability ---
    const THEME_STORAGE_KEY = 'stopwatchTheme';
    const DEFAULT_THEME = 'light';
    const TICK_INTERVAL_MS = 10; // Update display every 10 milliseconds

    // --- Audio file paths ---
    const SOUND_PATHS = {
        start: 'https://www.soundjay.com/buttons/beep-07.mp3',
        pause: 'https://www.soundjay.com/buttons/beep-06.mp3',
        lap: 'https://www.soundjay.com/buttons/beep-02.mp3'
    };

    /**
     * Represents the main Stopwatch application logic.
     * Encapsulates state, DOM manipulation, and event handling.
     */
    class Stopwatch {
        constructor() {
            // DOM Elements
            this.display = {
                minutes: document.getElementById('minutes'),
                seconds: document.getElementById('seconds'),
                milliseconds: document.getElementById('milliseconds')
            };

            this.buttons = {
                start: document.getElementById('start-btn'),
                pause: document.getElementById('pause-btn'),
                reset: document.getElementById('reset-btn'),
                lap: document.getElementById('lap-btn'),
                export: document.getElementById('export-btn'),
                themeToggle: document.getElementById('theme-toggle-btn')
            };

            this.lapList = document.getElementById('lap-list');
            this.body = document.body;

            // Stopwatch State Variables
            this.startTime = 0;
            this.elapsedTime = 0;
            this.timerInterval = null;
            this.isRunning = false;
            this.lapCounter = 0;
            this.lastLapTime = 0; // Time at which the last lap was recorded
            this.lapData = []; // Stores lap details for export

            // Visuals
            this.lapColors = [
                '#E0F7FA', '#E8F5E9', '#FFFDE7', '#FCE4EC', '#F3E5F5', '#E1F5FE' // Lighter, pastel shades (These match the new CSS palette better)
            ];
            this.currentColorIndex = 0;

            // Audio Objects
            this.sounds = {};
            this.loadSounds();

            this.initEventListeners();
            this.loadTheme(); // Apply theme on load
            this.updateButtonStates(); // Set initial button disabled states
            this.updateDisplay(); // Initialize display to "00:00:00"
        }

        /**
         * Loads audio files. Handles potential errors silently.
         */
        loadSounds() {
            for (const key in SOUND_PATHS) {
                try {
                    this.sounds[key] = new Audio(SOUND_PATHS[key]);
                } catch (e) {
                    console.warn(`Failed to load audio for ${key}:`, e);
                    this.sounds[key] = null; // Set to null if loading fails
                }
            }
        }

        /**
         * Plays a sound if the audio element exists and can be played.
         * @param {HTMLAudioElement|null} audioElement - The audio element to play.
         */
        playSound(audioElement) {
            if (audioElement) {
                audioElement.currentTime = 0; // Reset to start for quick successive plays
                audioElement.play().catch(e => {
                    // console.warn(`Audio play failed for ${audioElement.src}:`, e);
                    // This catch block prevents a Promise rejection error in console
                    // if user hasn't interacted with document yet (autoplay policy)
                });
            }
        }

        /**
         * Formats milliseconds into an object with minutes, seconds, and milliseconds.
         * This function ensures two digits for minutes, seconds, and milliseconds (00-99).
         * @param {number} ms - Total milliseconds.
         * @returns {object} Formatted time components.
         */
        formatTime(ms) {
            const totalMilliseconds = ms;
            // Minutes calculation: total milliseconds / (1000 ms/s * 60 s/min) then modulo 60
            const minutes = Math.floor((totalMilliseconds / (1000 * 60)) % 60);
            const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
            const milliseconds = Math.floor((totalMilliseconds % 1000) / 10); // Divide by 10 to get 00-99

            // Ensures two digits for m, s and two for ms
            return {
                m: String(minutes).padStart(2, '0'),
                s: String(seconds).padStart(2, '0'),
                ms: String(milliseconds).padStart(2, '0') // Two digits for milliseconds
            };
        }

        /**
         * Formats milliseconds into a string (MM:SS:MM) for lap list and export.
         * This version *always* includes leading zeros for consistency and two digits for milliseconds.
         * @param {number} ms - Total milliseconds.
         * @returns {string} Formatted time string.
         */
        formatTimeToString(ms) {
            const totalMilliseconds = ms;
            // Minutes calculation: total milliseconds / (1000 ms/s * 60 s/min) then modulo 60
            const minutes = Math.floor((totalMilliseconds / (1000 * 60)) % 60);
            const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
            const milliseconds = Math.floor((totalMilliseconds % 1000) / 10); // Divide by 10 to get 00-99

            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(2, '0')}`; // Two digits for milliseconds
        }

        /**
         * Updates the stopwatch display with the current elapsed time.
         */
        updateDisplay() {
            const formatted = this.formatTime(this.elapsedTime);
            this.display.minutes.textContent = formatted.m;
            this.display.seconds.textContent = formatted.s;
            this.display.milliseconds.textContent = formatted.ms;
        }

        /**
         * Updates the disabled state of control buttons based on the stopwatch's running status and lap data.
         */
        updateButtonStates() {
            this.buttons.start.disabled = this.isRunning;
            this.buttons.pause.disabled = !this.isRunning;
            this.buttons.lap.disabled = !this.isRunning;
            this.buttons.export.disabled = (this.lapData.length === 0 && this.isRunning === false);
            this.buttons.start.textContent = this.isRunning ? 'Running' : (this.elapsedTime > 0 ? 'Resume' : 'Start');
        }

        /**
         * Starts or resumes the stopwatch.
         */
        start() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.startTime = Date.now() - this.elapsedTime;
                this.timerInterval = setInterval(() => {
                    this.elapsedTime = Date.now() - this.startTime;
                    this.updateDisplay();
                }, TICK_INTERVAL_MS);

                this.updateButtonStates();
                this.playSound(this.sounds.start);
            }
        }

        /**
         * Pauses the stopwatch.
         */
        pause() {
            if (this.isRunning) {
                this.isRunning = false;
                clearInterval(this.timerInterval);
                this.updateButtonStates();
                this.playSound(this.sounds.pause);
            }
        }

        /**
         * Resets the stopwatch to its initial state.
         */
        reset() {
            this.isRunning = false;
            clearInterval(this.timerInterval);
            this.elapsedTime = 0;
            this.lapCounter = 0;
            this.lastLapTime = 0;
            this.lapData = [];
            this.lapList.innerHTML = '';
            this.currentColorIndex = 0;
            this.updateDisplay();
            this.updateButtonStates();
        }

        /**
         * Records a lap time and adds it to the lap list.
         */
        recordLap() {
            if (this.isRunning) {
                this.lapCounter++;
                const currentLapElapsedTime = this.elapsedTime;
                const intervalTime = currentLapElapsedTime - this.lastLapTime;

                this.lapData.push({
                    lap: this.lapCounter,
                    totalMs: currentLapElapsedTime,
                    intervalMs: intervalTime,
                    totalString: this.formatTimeToString(currentLapElapsedTime),
                    intervalString: this.formatTimeToString(intervalTime)
                });

                const li = document.createElement('li');
                li.style.backgroundColor = this.lapColors[this.currentColorIndex];
                this.currentColorIndex = (this.currentColorIndex + 1) % this.lapColors.length;

                li.innerHTML = `
                    <span>Lap ${this.lapCounter}:</span>
                    <div class="lap-times-details">
                        <span>Total: ${this.formatTimeToString(currentLapElapsedTime)}</span>
                        <span>Interval: ${this.formatTimeToString(intervalTime)}</span>
                    </div>
                `;

                if (this.lapList.firstChild) {
                    this.lapList.insertBefore(li, this.lapList.firstChild);
                } else {
                    this.lapList.appendChild(li);
                }

                this.lastLapTime = currentLapElapsedTime;
                this.playSound(this.sounds.lap);
                this.updateButtonStates();
            }
        }

        /**
         * Exports recorded lap data to a CSV file.
         */
        exportLapData() {
            if (this.lapData.length === 0) {
                alert("No lap data to export!");
                return;
            }

            let csvContent = "Lap,Total Time,Interval Time\n";
            this.lapData.forEach(data => {
                csvContent += `${data.lap},${data.totalString},${data.intervalString}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'stopwatch_laps.csv');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        /**
         * Applies the specified theme ('light' or 'dark') to the document body.
         * @param {string} theme - The theme to apply.
         */
        applyTheme(theme) {
            this.body.classList.toggle('dark-theme', theme === 'dark');
            this.buttons.themeToggle.textContent = theme === 'dark' ? 'Light Theme' : 'Dark Theme';
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }

        /**
         * Toggles between 'light' and 'dark' themes.
         */
        toggleTheme() {
            const currentTheme = this.body.classList.contains('dark-theme') ? 'dark' : 'light';
            this.applyTheme(currentTheme === 'light' ? 'dark' : 'light');
        }

        /**
         * Loads the user's preferred theme from localStorage or applies the default.
         */
        loadTheme() {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
            this.applyTheme(savedTheme);
        }

        /**
         * Initializes all event listeners for the control buttons.
         */
        initEventListeners() {
            this.buttons.start.addEventListener('click', () => this.start());
            this.buttons.pause.addEventListener('click', () => this.pause());
            this.buttons.reset.addEventListener('click', () => this.reset());
            this.buttons.lap.addEventListener('click', () => this.recordLap());
            this.buttons.export.addEventListener('click', () => this.exportLapData());
            this.buttons.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    // Initialize the Stopwatch application when the DOM is fully loaded
    new Stopwatch();
});