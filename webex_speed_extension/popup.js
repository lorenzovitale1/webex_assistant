document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const speedSlider = document.getElementById('speed-slider');
    const speedLabel = document.getElementById('speed-label');
    const resetBtn = document.getElementById('reset-btn');
    
    const silenceToggle = document.getElementById('silence-toggle');
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdLabel = document.getElementById('threshold-label');
    const skipSpeedSlider = document.getElementById('skip-speed-slider');
    const skipSpeedLabel = document.getElementById('skip-speed-label');

    // Default config
    let config = {
        speed: 1.0,
        silenceSkip: false,
        threshold: 2,
        skipSpeed: 8.0
    };

    // Al caricamento, recupera lo stato attuale chiedendolo alla pagina attiva
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATE' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Content script non ancora inizializzato su questa pagina. Ricaricare la scheda.");
                    return;
                }
                if (response) {
                    config = response;
                    updateUI(config);
                }
            });
        }
    });

    // Funzione per aggiornare l'interfaccia utente partendo dai dati
    const updateUI = (state) => {
        speedSlider.value = state.speed;
        speedLabel.textContent = parseFloat(state.speed).toFixed(2) + 'x';

        silenceToggle.checked = state.silenceSkip || false;
        
        thresholdSlider.value = state.threshold || 2;
        thresholdLabel.textContent = (state.threshold || 2) + '%';
        
        skipSpeedSlider.value = state.skipSpeed || 8;
        skipSpeedLabel.textContent = parseFloat(state.skipSpeed || 8).toFixed(2) + 'x';
    };

    // Invia parametri tramite messaggio al content script
    const sendConfig = () => {
        config = {
            speed: parseFloat(speedSlider.value),
            silenceSkip: silenceToggle.checked,
            threshold: parseFloat(thresholdSlider.value),
            skipSpeed: parseFloat(skipSpeedSlider.value)
        };
        
        updateUI(config);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_CONFIG', config: config }, (res) => {
                    if (chrome.runtime.lastError) {
                        console.error("Errore di com: " + chrome.runtime.lastError.message);
                    }
                });
            }
        });
    };

    // Listeners
    speedSlider.addEventListener('input', sendConfig);
    silenceToggle.addEventListener('change', sendConfig);
    thresholdSlider.addEventListener('input', sendConfig);
    skipSpeedSlider.addEventListener('input', sendConfig);

    resetBtn.addEventListener('click', () => {
        speedSlider.value = 1.0;
        sendConfig();
    });
});
