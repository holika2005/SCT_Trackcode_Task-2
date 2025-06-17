document.addEventListener('DOMContentLoaded', () => {
    const displayHours = document.getElementById('display-hours');
    const displayMinutes = document.getElementById('display-minutes');
    const displaySeconds = document.getElementById('display-seconds');
    const displayMilliseconds = document.getElementById('display-milliseconds');

    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const lapBtn = document.getElementById('lap-btn');
    const exportBtn = document.getElementById('export-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn'); // Get the new theme toggle button

    const lapList = document.getElementById('lap-list');
    const body = document.body; // Reference to the body element

    let startTime = 0;
    let elapsedTime = 0;
    let timerInterval;
    let isRunning = false;
    let lapCounter = 0;
    let lastLapTime = 0;
    let lapData = []; // Array to store lap data for export

    const lapColors = [
        '#e6f7ff', '#e6ffe6', '#fff3e6', '#f7e6ff', '#e0e0e0', '#ffebe6'
    ];
    let currentColorIndex = 0;

    // --- Sound Management ---
    const startSound = new Audio('https://www.soundjay.com/buttons/beep-07.mp3');
    const pauseSound = new Audio('https://www.soundjay.com/buttons/beep-06.mp3');
    const lapSound = new Audio('https://www.soundjay.com/buttons/beep-02.mp3');

    function playSound(audioElement) {
        if (audioElement) {
            audioElement.currentTime = 0;
            audioElement.play().catch(e => console.warn("Audio play failed:", e));
        }
    }
    // --- End Sound Management ---

    // --- Theme Management ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-theme');
            themeToggleBtn.textContent = 'Light Theme';
        } else {
            body.classList.remove('dark-theme');
            themeToggleBtn.textContent = 'Dark Theme';
        }
        localStorage.setItem('stopwatchTheme', theme); // Save preference
    }

    function toggleTheme() {
        if (body.classList.contains('dark-theme')) {
            applyTheme('light');
        } else {
            applyTheme('dark');
        }
    }

    // Load theme preference on page load
    const savedTheme = localStorage.getItem('stopwatchTheme') || 'light'; // Default to light
    applyTheme(savedTheme);
    // --- End Theme Management ---


    function formatTime(ms) {
        const totalMilliseconds = ms;
        const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
        const milliseconds = Math.floor(totalMilliseconds % 1000);

        return {
            h: String(hours).padStart(2, '0'),
            m: String(minutes).padStart(2, '0'),
            s: String(seconds).padStart(2, '0'),
            ms: String(milliseconds).padStart(3, '0')
        };
    }

    function formatTimeToString(ms) {
        const f = formatTime(ms);
        return `${f.h}:${f.m}:${f.s}:${f.ms}`;
    }

    function updateDisplay() {
        const formatted = formatTime(elapsedTime);
        displayHours.textContent = formatted.h;
        displayMinutes.textContent = formatted.m;
        displaySeconds.textContent = formatted.s;
        displayMilliseconds.textContent = formatted.ms;
    }

    function startStopwatch() {
        if (!isRunning) {
            isRunning = true;
            startTime = Date.now() - elapsedTime;
            timerInterval = setInterval(() => {
                elapsedTime = Date.now() - startTime;
                updateDisplay();
            }, 10);

            startBtn.textContent = 'Resume';
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            lapBtn.disabled = false;
            exportBtn.disabled = true;
            playSound(startSound);
        }
    }

    function pauseStopwatch() {
        if (isRunning) {
            isRunning = false;
            clearInterval(timerInterval);
            startBtn.textContent = 'Resume';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            lapBtn.disabled = true;
            exportBtn.disabled = (lapData.length === 0);
            playSound(pauseSound);
        }
    }

    function resetStopwatch() {
        isRunning = false;
        clearInterval(timerInterval);
        elapsedTime = 0;
        lapCounter = 0;
        lastLapTime = 0;
        lapData = [];
        updateDisplay();
        lapList.innerHTML = '';
        currentColorIndex = 0;
        startBtn.textContent = 'Start';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        lapBtn.disabled = true;
        exportBtn.disabled = true;
    }

    function recordLap() {
        if (isRunning) {
            lapCounter++;
            const currentLapElapsedTime = elapsedTime;
            const intervalTime = currentLapElapsedTime - lastLapTime;

            const formattedTotalTime = formatTime(currentLapElapsedTime);
            const formattedIntervalTime = formatTime(intervalTime);

            // Store lap data
            lapData.push({
                lap: lapCounter,
                totalMs: currentLapElapsedTime,
                intervalMs: intervalTime,
                totalString: formatTimeToString(currentLapElapsedTime),
                intervalString: formatTimeToString(intervalTime)
            });

            const li = document.createElement('li');
            // Lap item background color is independent of main theme for variety
            li.style.backgroundColor = lapColors[currentColorIndex]; 
            currentColorIndex = (currentColorIndex + 1) % lapColors.length;

            li.innerHTML = `
                <span>Lap ${lapCounter}:</span>
                <div class="lap-times-details">
                    <span>Total: ${formattedTotalTime.h}:${formattedTotalTime.m}:${formattedTotalTime.s}:${formattedTotalTime.ms}</span>
                    <span>Interval: ${formattedIntervalTime.h}:${formattedIntervalTime.m}:${formattedIntervalTime.s}:${formattedIntervalTime.ms}</span>
                </div>
            `;

            if (lapList.firstChild) {
                lapList.insertBefore(li, lapList.firstChild);
            } else {
                lapList.appendChild(li);
            }

            lastLapTime = currentLapElapsedTime;
            playSound(lapSound);
            exportBtn.disabled = false;
        }
    }

    function exportLapData() {
        if (lapData.length === 0) {
            alert("No lap data to export!");
            return;
        }

        let csvContent = "Lap,Total Time,Interval Time\n";
        lapData.forEach(data => {
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

    startBtn.addEventListener('click', startStopwatch);
    pauseBtn.addEventListener('click', pauseStopwatch);
    resetBtn.addEventListener('click', resetStopwatch);
    lapBtn.addEventListener('click', recordLap);
    exportBtn.addEventListener('click', exportLapData);
    themeToggleBtn.addEventListener('click', toggleTheme); // Event listener for theme toggle

    // Initial state of buttons
    pauseBtn.disabled = true;
    lapBtn.disabled = true;
    exportBtn.disabled = true;
});