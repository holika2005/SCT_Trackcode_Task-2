document.addEventListener('DOMContentLoaded', () => {
    // --- Constants for better readability ---
    const THEME_STORAGE_KEY = 'stopwatchTheme';
    const DEFAULT_THEME = 'light';
    const TICK_INTERVAL_MS = 10; // Update display every 10 milliseconds

    // --- Audio file paths ---
    const SOUND_PATHS = {
        start: 'https://www.soundjay.com/buttons/beep-07.mp3', // Example sound
        pause: 'https://www.soundjay.com/buttons/beep-06.mp3', // Example sound
        lap: 'https://www.soundjay.com/buttons/beep-02.mp3'    // Example sound
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
                milliseconds: document.getElementById('milliseconds'),
                currentDateElement: document.getElementById('current-date') // Date and Time element
            };

            this.buttons = {
                start: document.getElementById('start-btn'),
                pause: document.getElementById('pause-btn'),
                reset: document.getElementById('reset-btn'),
                lap: document.getElementById('lap-btn'),
                export: document.getElementById('export-btn'), // New export button
                themeToggle: document.getElementById('theme-toggle-btn') // New theme toggle button
            };

            this.lapList = document.getElementById('lap-list');
            this.body = document.body; // Reference to the body for theme classes

            // Stopwatch State Variables
            this.startTime = 0;
            this.elapsedTime = 0;
            this.timerInterval = null;
            this.isRunning = false;
            this.lapCounter = 0;
            this.lastLapTime = 0; // Time at which the last lap was recorded
            this.lapData = []; // Stores lap details for export

            // Visuals - for alternating lap row colors
            this.lapColors = {
                light: ['#E0F7FA', '#E8F5E9', '#FFFDE7', '#FCE4EC', '#F3E5F5', '#E1F5FE'], // Pastel shades for light theme
                dark: ['#425A70', '#3E546C', '#4F667A', '#5A728A', '#657D94', '#7088A0']   // Darker, subtle shades for dark theme
            };
            this.currentLapColorIndex = 0; // Renamed for clarity
            this.activeLapColors = []; // Will hold the currently active theme's colors

            // Audio Objects
            this.sounds = {};
            this.loadSounds();

            this.initEventListeners();
            this.loadTheme(); // Apply theme on load, which also sets activeLapColors
            this.updateButtonStates(); // Set initial button disabled states
            this.updateDisplay(); // Initialize display to "00:00:00"
            this.updateDateAndTimeDisplay(); // Updated: Display the current date and time
            setInterval(() => this.updateDateAndTimeDisplay(), 1000); // Update time every second
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
            const minutes = Math.floor((totalMilliseconds / (1000 * 60)) % 60);
            const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
            const milliseconds = Math.floor((totalMilliseconds % 1000) / 10); // Divide by 10 to get 00-99

            return {
                m: String(minutes).padStart(2, '0'),
                s: String(seconds).padStart(2, '0'),
                ms: String(milliseconds).padStart(2, '0')
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
            const minutes = Math.floor((totalMilliseconds / (1000 * 60)) % 60);
            const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
            const milliseconds = Math.floor((totalMilliseconds % 1000) / 10);

            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(2, '0')}`;
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
         * Updates the display with the current date and time.
         */
        updateDateAndTimeDisplay() {
            const now = new Date();
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }; // Added seconds and AM/PM
            const formattedDate = now.toLocaleDateString(undefined, dateOptions);
            const formattedTime = now.toLocaleTimeString(undefined, timeOptions);
            this.display.currentDateElement.textContent = `${formattedDate} | ${formattedTime}`;
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
            this.lapData = []; // Clear lap data on reset
            this.lapList.innerHTML = ''; // Clear lap list display
            this.currentLapColorIndex = 0; // Reset color index
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

                // Store more detailed lap data for export
                this.lapData.push({
                    lap: this.lapCounter,
                    totalMs: currentLapElapsedTime,
                    intervalMs: intervalTime,
                    totalString: this.formatTimeToString(currentLapElapsedTime),
                    intervalString: this.formatTimeToString(intervalTime)
                });

                const li = document.createElement('li');
                // Use the alternating colors for list items from the active theme palette
                li.style.backgroundColor = this.activeLapColors[this.currentLapColorIndex];
                this.currentLapColorIndex = (this.currentLapColorIndex + 1) % this.activeLapColors.length; // Cycle through colors

                li.innerHTML = `
                    <span>Lap ${this.lapCounter}:</span>
                    <div class="lap-times-details">
                        <span>Total: ${this.formatTimeToString(currentLapElapsedTime)}</span>
                        <span>Interval: ${this.formatTimeToString(intervalTime)}</span>
                    </div>
                `;

                // Add new lap at the top of the list
                if (this.lapList.firstChild) {
                    this.lapList.insertBefore(li, this.lapList.firstChild);
                } else {
                    this.lapList.appendChild(li);
                }

                this.lastLapTime = currentLapElapsedTime; // Update last lap time for next interval
                this.playSound(this.sounds.lap);
                this.updateButtonStates(); // Update export button state
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

            // CSV Header
            let csvContent = "Lap,Total Time,Interval Time\n";

            // Add lap data rows
            this.lapData.forEach(data => {
                csvContent += `${data.lap},${data.totalString},${data.intervalString}\n`;
            });

            // Create a Blob and download it as a CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'stopwatch_laps.csv');
            link.style.display = 'none'; // Hide the link
            document.body.appendChild(link);
            link.click(); // Programmatically click the link to trigger download
            document.body.removeChild(link); // Clean up the link
            URL.revokeObjectURL(url); // Release the object URL
        }

        /**
         * Applies the specified theme ('light' or 'dark') to the document body.
         * Also sets the appropriate lap color palette.
         * @param {string} theme - The theme to apply.
         */
        applyTheme(theme) {
            this.body.classList.toggle('dark-theme', theme === 'dark');
            this.buttons.themeToggle.textContent = theme === 'dark' ? 'Light Theme' : 'Dark Theme';
            localStorage.setItem(THEME_STORAGE_KEY, theme);

            // Set the active lap colors based on the theme
            this.activeLapColors = theme === 'dark' ? this.lapColors.dark : this.lapColors.light;
            this.currentLapColorIndex = 0; // Reset index when theme changes

            // Re-apply lap background colors for existing laps to reflect the new theme
            const lapItems = this.lapList.children;
            for (let i = 0; i < lapItems.length; i++) {
                lapItems[i].style.backgroundColor = this.activeLapColors[i % this.activeLapColors.length];
            }
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
