let config = {
    speed: 1.0,
    silenceSkip: false,
    threshold: 2,
    skipSpeed: 8.0
};

// Status Web Audio API
let audioCtx = null;
let analyser = null;
let source = null;
let isSkipping = false;
let monitorLoopId = null;

// Ascolto messaggi dal popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_STATE') {
        sendResponse(config);
    } else if (request.type === 'UPDATE_CONFIG') {
        config = request.config;
        applyConfig();
        sendResponse({status: "ok"});
    }
});

function applyConfig() {
    const video = document.querySelector('video');
    if (!video) return;

    if (config.silenceSkip) {
        setupAudioMonitoring(video);
    } else {
        stopAudioMonitoring();
    }
    
    // Se lo skip del silenzio non è attivo
    if (!config.silenceSkip || !isSkipping) {
        setActualSpeed(video, config.speed);
    } else if (config.silenceSkip && isSkipping) {
        setActualSpeed(video, config.skipSpeed);
    }
    
    // Ratechange interceptor in caso Webex provi a forzare una velocità predefinita
    if (!video.dataset.hasRateListener) {
        video.addEventListener('ratechange', function() {
            const targetSpeed = isSkipping ? config.skipSpeed : config.speed;
            if (Math.abs(this.playbackRate - targetSpeed) > 0.05) {
                this.playbackRate = targetSpeed;
            }
        });
        video.dataset.hasRateListener = 'true';
    }
}

function setActualSpeed(video, speed) {
    video.playbackRate = speed;
    
    // Aggiorna visivamente il player nativo se presente
    const webexSpeedBtn = document.querySelector('.wxp-playback-rate-button');
    if (webexSpeedBtn) {
        webexSpeedBtn.textContent = parseFloat(speed).toFixed(2) + 'X';
    }
    const vjsSpeedValue = document.querySelector('.vjs-playback-rate-value');
    if (vjsSpeedValue) {
        vjsSpeedValue.textContent = parseFloat(speed).toFixed(2) + 'X';
    }
}

function setupAudioMonitoring(video) {
    if (audioCtx) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (!monitorLoopId) {
            monitorAudio(video);
        }
        return;
    }

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.1; // Rende il grafico reattivo, scende veloce quando si interrompe la voce

        source = audioCtx.createMediaElementSource(video);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        monitorAudio(video);
        console.log("Webex Speed Controller: Silence Skipper Iniziato.");
    } catch (e) {
        console.error("Webex Speed Controller: Errore setup Web Audio", e);
    }
}

function stopAudioMonitoring() {
    if (monitorLoopId) {
        cancelAnimationFrame(monitorLoopId);
        monitorLoopId = null;
    }
    isSkipping = false;
}

function monitorAudio(video) {
    if (!config.silenceSkip || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    let average = sum / dataArray.length;
    let volumePercent = (average / 255) * 100;

    // Seleziona la logica solo se il video sta andando e non sta bufferizzando
    if (!video.paused) {
        if (volumePercent <= config.threshold) {
            if (!isSkipping) {
                isSkipping = true;
                setActualSpeed(video, config.skipSpeed);
            }
        } else {
            if (isSkipping) {
                // E' ritornata la voce
                isSkipping = false;
                setActualSpeed(video, config.speed);
            }
        }
    }

    monitorLoopId = requestAnimationFrame(() => monitorAudio(video));
}

// Initialization in caso sia presente fin dall'avvio
setTimeout(() => {
    applyConfig();
}, 3000);
