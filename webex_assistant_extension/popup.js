document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const studentEmailInput = document.getElementById('student-email');
    const speedSlider = document.getElementById('speed-slider');
    const speedLabel = document.getElementById('speed-label');
    const resetBtn = document.getElementById('reset-btn');
    
    const silenceToggle = document.getElementById('silence-toggle');
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdLabel = document.getElementById('threshold-label');
    const durationSlider = document.getElementById('duration-slider');
    const durationLabel = document.getElementById('duration-label');
    const skipSpeedSlider = document.getElementById('skip-speed-slider');
    const skipSpeedLabel = document.getElementById('skip-speed-label');
    const remainingTimeLabel = document.getElementById('remaining-time-label');
    const remainingTimeToggle = document.getElementById('remaining-time-toggle');

    let cachedDuration = 0;
    let cachedCurrentTime = 0;

    // Helper: formatta i secondi in HH:MM:SS
    const formatTime = (totalSeconds) => {
        if (!totalSeconds || !isFinite(totalSeconds) || totalSeconds < 0) return "--:--:--";
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Default config
    let config = {
        studentEmail: "",
        speed: 1.0,
        silenceSkip: false,
        showRemainingTime: true,
        threshold: 2.0,
        silenceDuration: 1.0,
        skipSpeed: 8.0
    };

    // Al caricamento, recupera lo stato globale dallo storage
    chrome.storage.local.get(['config'], (result) => {
        if (result.config) {
            config = { ...config, ...result.config };
        }
        updateUI(config);
    });

    // Funzione per aggiornare l'interfaccia utente partendo dai dati
    const updateUI = (state) => {
        studentEmailInput.value = state.studentEmail || "";
        speedSlider.value = state.speed;
        speedLabel.textContent = parseFloat(state.speed).toFixed(2) + 'x';

        silenceToggle.checked = state.silenceSkip || false;
        remainingTimeToggle.checked = state.showRemainingTime !== false;
        
        thresholdSlider.value = state.threshold !== undefined ? state.threshold : 2.0;
        thresholdLabel.textContent = parseFloat(state.threshold !== undefined ? state.threshold : 2.0).toFixed(1) + '%';
        
        durationSlider.value = state.silenceDuration !== undefined ? state.silenceDuration : 1.0;
        durationLabel.textContent = parseFloat(state.silenceDuration !== undefined ? state.silenceDuration : 1.0).toFixed(1) + 's';
        
        skipSpeedSlider.value = state.skipSpeed || 8;
        skipSpeedLabel.textContent = parseFloat(state.skipSpeed || 8).toFixed(2) + 'x';
        
        updateRemainingTimeLabel();
    };

    const updateRemainingTimeLabel = () => {
        if (cachedDuration > 0) {
            const timeLeft = cachedDuration - cachedCurrentTime;
            const projectedTimeLeft = timeLeft / parseFloat(speedSlider.value);
            remainingTimeLabel.textContent = "-" + formatTime(projectedTimeLeft);
        } else {
            remainingTimeLabel.textContent = "--:--:--";
        }
    };

    // Invia parametri e salva nello storage
    const sendConfig = () => {
        config = {
            studentEmail: studentEmailInput.value.trim(),
            speed: parseFloat(speedSlider.value),
            silenceSkip: silenceToggle.checked,
            showRemainingTime: remainingTimeToggle.checked,
            threshold: parseFloat(thresholdSlider.value),
            silenceDuration: parseFloat(durationSlider.value),
            skipSpeed: parseFloat(skipSpeedSlider.value)
        };
        
        updateUI(config);

        chrome.storage.local.set({ config: config });
    };

    // Listeners
    studentEmailInput.addEventListener('change', sendConfig);
    speedSlider.addEventListener('input', sendConfig);
    silenceToggle.addEventListener('change', sendConfig);
    remainingTimeToggle.addEventListener('change', sendConfig);
    thresholdSlider.addEventListener('input', sendConfig);
    durationSlider.addEventListener('input', sendConfig);
    skipSpeedSlider.addEventListener('input', sendConfig);

    resetBtn.addEventListener('click', () => {
        speedSlider.value = 1.0;
        sendConfig();
    });

    // Funzione per richiedere i dati del video alla pagina
    const requestVideoState = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { command: "getVideoState" }, (response) => {
                    if (response && response.duration) {
                        cachedDuration = response.duration;
                        cachedCurrentTime = response.currentTime;
                        updateRemainingTimeLabel();
                    }
                });
            }
        });
    };

    // Richiedi subito i dati
    requestVideoState();

    // Imposta un intervallo per aggiornare i dati in tempo reale finché il popup è aperto
    setInterval(requestVideoState, 1000);
});
