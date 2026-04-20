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

    const saveEmailBtn = document.getElementById('save-email-btn');
    const remainingTimeLabel = document.getElementById('remaining-time-label');
    const remainingTimeToggle = document.getElementById('remaining-time-toggle');

    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeExpand = document.getElementById('dark-mode-expand');
    const darkModeOptions = document.getElementById('dark-mode-options');
    const darkWebexToggle = document.getElementById('dark-webex-toggle');
    const darkSharepointToggle = document.getElementById('dark-sharepoint-toggle');
    const darkRecmanToggle = document.getElementById('dark-recman-toggle');

    let cachedDuration = 0;
    let cachedCurrentTime = 0;

    let isSavingEmail = false;
    const originalSaveIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
    const successSaveIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    // Helper: format seconds into HH:MM:SS
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
        darkMode: false,
        darkModeWebex: true,
        darkModeSharepoint: true,
        darkModeRecMan: true,
        threshold: 2.0,
        silenceDuration: 1.0,
        skipSpeed: 8.0
    };

    // On load, retrieve global state from storage
    chrome.storage.local.get(['config'], (result) => {
        if (result.config) {
            config = { ...config, ...result.config };
        }
        updateUI(config);
    });

    // If value changes elsewhere (e.g. player click), update popup live
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.config) {
            config = { ...config, ...changes.config.newValue };
            updateUI(config);
        }
    });

    const updateUI = (state) => {
        if (document.activeElement !== studentEmailInput) {
            studentEmailInput.value = state.studentEmail || "";
        }
        
        if (isSavingEmail) {
            saveEmailBtn.style.display = 'flex';
        } else if (studentEmailInput.value.trim() !== (state.studentEmail || "")) {
            saveEmailBtn.style.display = 'flex';
        } else {
            saveEmailBtn.style.display = 'none';
        }

        speedSlider.value = state.speed;
        speedLabel.textContent = parseFloat(state.speed).toFixed(2) + 'x';

        silenceToggle.checked = state.silenceSkip || false;
        remainingTimeToggle.checked = state.showRemainingTime !== false;

        darkModeToggle.checked = state.darkMode || false;
        darkWebexToggle.checked = state.darkModeWebex !== false;
        darkSharepointToggle.checked = state.darkModeSharepoint !== false;
        darkRecmanToggle.checked = state.darkModeRecMan !== false;

        const thresh = state.threshold !== undefined ? state.threshold : 2.0;
        thresholdSlider.value = thresh;
        thresholdLabel.textContent = parseFloat(thresh).toFixed(1) + '%';

        const dur = state.silenceDuration !== undefined ? state.silenceDuration : 1.0;
        durationSlider.value = dur;
        durationLabel.textContent = parseFloat(dur).toFixed(1) + 's';

        const skip = state.skipSpeed || 8;
        skipSpeedSlider.value = skip;
        skipSpeedLabel.textContent = parseFloat(skip).toFixed(2) + 'x';

        updateRemainingTimeLabel();
        applyPopupDarkMode(state.darkMode || false);
    };

    const applyPopupDarkMode = (enabled) => {
        if (enabled) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
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

    // Send parameters and save to storage
    // Helper to save a validated partial state
    const saveState = (newState) => {
        config = { ...config, ...newState };
        // Always read toggle states for safety (they are booleans)
        config.silenceSkip = silenceToggle.checked;
        config.showRemainingTime = remainingTimeToggle.checked;
        config.darkMode = darkModeToggle.checked;
        config.darkModeWebex = darkWebexToggle.checked;
        config.darkModeSharepoint = darkSharepointToggle.checked;
        config.darkModeRecMan = darkRecmanToggle.checked;
        // Do not overwrite email here unless explicitly requested

        chrome.storage.local.set({ config: config });
        updateUI(config);
    };

    // Email visual feedback and button visibility
    const checkEmailChange = () => {
        if (studentEmailInput.value.trim() !== (config.studentEmail || "")) {
            isSavingEmail = false;
            saveEmailBtn.style.display = 'flex';
            saveEmailBtn.style.opacity = '1';
            saveEmailBtn.innerHTML = originalSaveIcon;
            saveEmailBtn.style.color = '';
        } else {
            if (!isSavingEmail) {
                saveEmailBtn.style.display = 'none';
            }
        }
    };

    const handleEmailSave = () => {
        if (studentEmailInput.value.trim() === (config.studentEmail || "")) return;
        
        isSavingEmail = true;
        saveEmailBtn.innerHTML = successSaveIcon;
        saveEmailBtn.style.color = 'var(--accent)';
        saveEmailBtn.style.display = 'flex';
        
        saveState({ studentEmail: studentEmailInput.value.trim() });
        
        // Aspetta 1.2 secondi, poi avvia il fade out
        setTimeout(() => {
            if (isSavingEmail) {
                saveEmailBtn.style.opacity = '0';
                
                // Dopo che l'opacità è andata a 0 (300ms), nascondi e resetta
                setTimeout(() => {
                    if (isSavingEmail) {
                        isSavingEmail = false;
                        saveEmailBtn.style.display = 'none';
                        saveEmailBtn.style.opacity = '1';
                        saveEmailBtn.innerHTML = originalSaveIcon;
                        saveEmailBtn.style.color = '';
                    }
                }, 300);
            }
        }, 1200);
    };

    // Email Listeners
    saveEmailBtn.addEventListener('click', handleEmailSave);
    studentEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleEmailSave();
            e.target.blur();
        }
    });
    studentEmailInput.addEventListener('blur', handleEmailSave);
    studentEmailInput.addEventListener('input', checkEmailChange);

    // Helper for blur on Enter (forces change event visually for various text fields)
    const blurOnEnter = (e) => { if (e.key === 'Enter') e.target.blur(); };

    // Slider Listeners (Update in real time)
    speedSlider.addEventListener('input', (e) => saveState({ speed: parseFloat(e.target.value) }));
    thresholdSlider.addEventListener('input', (e) => saveState({ threshold: parseFloat(e.target.value) }));
    durationSlider.addEventListener('input', (e) => saveState({ silenceDuration: parseFloat(e.target.value) }));
    skipSpeedSlider.addEventListener('input', (e) => saveState({ skipSpeed: parseFloat(e.target.value) }));

    // Toggle Listeners
    silenceToggle.addEventListener('change', () => saveState({}));
    remainingTimeToggle.addEventListener('change', () => saveState({}));
    darkModeToggle.addEventListener('change', () => saveState({}));
    darkWebexToggle.addEventListener('change', () => saveState({}));
    darkSharepointToggle.addEventListener('change', () => saveState({}));
    darkRecmanToggle.addEventListener('change', () => saveState({}));

    // Expand menu listener
    darkModeExpand.addEventListener('click', () => {
        darkModeOptions.classList.toggle('open');
        darkModeExpand.classList.toggle('open');
    });

    resetBtn.addEventListener('click', () => {
        saveState({ speed: 1.0 });
    });

    // Function to request video data from the page
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

    // Request data immediately
    requestVideoState();

    // Set interval to update data in real time as long as the popup is open
    setInterval(requestVideoState, 1000);
});
