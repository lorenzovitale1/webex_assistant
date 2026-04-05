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

    // Default config
    let config = {
        studentEmail: "",
        speed: 1.0,
        silenceSkip: false,
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
        
        thresholdSlider.value = state.threshold !== undefined ? state.threshold : 2.0;
        thresholdLabel.textContent = parseFloat(state.threshold !== undefined ? state.threshold : 2.0).toFixed(1) + '%';
        
        durationSlider.value = state.silenceDuration !== undefined ? state.silenceDuration : 1.0;
        durationLabel.textContent = parseFloat(state.silenceDuration !== undefined ? state.silenceDuration : 1.0).toFixed(1) + 's';
        
        skipSpeedSlider.value = state.skipSpeed || 8;
        skipSpeedLabel.textContent = parseFloat(state.skipSpeed || 8).toFixed(2) + 'x';
    };

    // Invia parametri e salva nello storage
    const sendConfig = () => {
        config = {
            studentEmail: studentEmailInput.value.trim(),
            speed: parseFloat(speedSlider.value),
            silenceSkip: silenceToggle.checked,
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
    thresholdSlider.addEventListener('input', sendConfig);
    durationSlider.addEventListener('input', sendConfig);
    skipSpeedSlider.addEventListener('input', sendConfig);

    resetBtn.addEventListener('click', () => {
        speedSlider.value = 1.0;
        sendConfig();
    });
});
