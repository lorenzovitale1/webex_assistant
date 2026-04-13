let config = {
    studentEmail: "",
    speed: 1.0,
    silenceSkip: false,
    showRemainingTime: true,
    darkMode: false,
    threshold: 2.0,
    silenceDuration: 1.0,
    skipSpeed: 8.0
};

// --- DARK MODE ---
const DARK_MODE_STYLE_ID = '__polimi-dark-style';
const DARK_MODE_CLASS = '__polimi-dark';

function injectDarkModeStyle() {
    if (document.getElementById(DARK_MODE_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = DARK_MODE_STYLE_ID;
    style.textContent = `
        /* === POLIMI DARK MODE === */
        html.${DARK_MODE_CLASS} {
            filter: invert(1) hue-rotate(180deg) !important;
            background-color: #111 !important;
        }

        /* Re-invert: video e canvas (vanno mostrati come sono) */
        html.${DARK_MODE_CLASS} video,
        html.${DARK_MODE_CLASS} canvas {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: wrapper player Webex (vjs + wxp) */
        html.${DARK_MODE_CLASS} .vjs-tech,
        html.${DARK_MODE_CLASS} .wxp-video-wrapper video,
        html.${DARK_MODE_CLASS} .vjs-poster {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: anteprime sulla barra del video (usano background-image su div, non <img>)
           .vjs-thumbnails-tooltip-img = anteprima hover Webex classico
           .wxp-progress-bar-tip-img   = anteprima hover player wxp */
        html.${DARK_MODE_CLASS} .vjs-thumbnails-tooltip-img,
        html.${DARK_MODE_CLASS} .wxp-progress-bar-tip-img {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: thumbnail, anteprime e immagini di copertina */
        html.${DARK_MODE_CLASS} img {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: iframe (es. player stream dentro sharepoint) */
        html.${DARK_MODE_CLASS} iframe {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* FIX logo Polimi (PNG con sfondo trasparente):
           NON re-invertire: lasciamo che l'html invert lo trasformi
           da logo scuro -> logo chiaro su sfondo scuro (effetto desiderato) */
        html.${DARK_MODE_CLASS} img.logo-polimi,
        html.${DARK_MODE_CLASS} img[alt="logo-polimi"] {
            filter: none !important;
            background-color: transparent !important;
        }

        /* FIX RecMan - Toolbar: il background esplicito diventa nero dopo inversione.
           Impostiamo #c8c8c8 in CSS -> dopo inversione html appare come ~#373737 (grigio scuro) */
        html.${DARK_MODE_CLASS} .addons-toolBar-css,
        html.${DARK_MODE_CLASS} .ui-widget-header {
            background-color: #c8c8c8 !important;
        }

        /* FIX RecMan - Righe alternate .pari: grigio chiaro -> quasi nero dopo inversione.
           Impostiamo #d8d8d8 in CSS -> dopo inversione appare come ~#272727 (riconoscibile dal nero puro) */
        html.${DARK_MODE_CLASS} tr.pari {
            background-color: #d8d8d8 !important;
        }

        /* FIX Full-Screen: Il layer del full-screen (top layer) NON eredita il filter: invert del tag HTML.
           Se non rimuoviamo i nostri re-invert, questi si applicheranno da soli, invertendo il video e le anteprime! */
        html.${DARK_MODE_CLASS} *:fullscreen,
        html.${DARK_MODE_CLASS} *:fullscreen video,
        html.${DARK_MODE_CLASS} *:fullscreen canvas,
        html.${DARK_MODE_CLASS} *:fullscreen .vjs-tech,
        html.${DARK_MODE_CLASS} *:fullscreen .wxp-video-wrapper video,
        html.${DARK_MODE_CLASS} *:fullscreen .vjs-poster,
        html.${DARK_MODE_CLASS} *:fullscreen .vjs-thumbnails-tooltip-img,
        html.${DARK_MODE_CLASS} *:fullscreen .wxp-progress-bar-tip-img,
        html.${DARK_MODE_CLASS} *:fullscreen img,
        html.${DARK_MODE_CLASS} *:fullscreen iframe,
        
        html.${DARK_MODE_CLASS} *:-webkit-full-screen,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen video,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen canvas,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .vjs-tech,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .wxp-video-wrapper video,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .vjs-poster,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .vjs-thumbnails-tooltip-img,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .wxp-progress-bar-tip-img,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen img,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen iframe {
            filter: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

function applyDarkMode(enabled) {
    injectDarkModeStyle();
    if (enabled) {
        document.documentElement.classList.add(DARK_MODE_CLASS);
    } else {
        document.documentElement.classList.remove(DARK_MODE_CLASS);
    }
}
// --- END DARK MODE ---

let audioCtx = null;
let analyser = null;
let source = null;
let isSkipping = false;
let monitorLoopId = null;
let silenceStart = null;
let isAudioConnected = false;
window._polimiVideoSpeedExpected = null;

if (window.location.hostname.includes("idbroker-eu.webex.com")) {
    handleSSOLogin();
} else {
    handleVideoPlayer();
}

// Leggi e applica subito il dark mode (anche su pagine senza video, es. RecMan)
chrome.storage.local.get(['config'], (result) => {
    if (result.config?.darkMode) {
        applyDarkMode(true);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "getVideoState") {
        if (currentVideo) {
            sendResponse({ duration: currentVideo.duration, currentTime: currentVideo.currentTime });
        } else {
            sendResponse({});
        }
    }
});

function handleSSOLogin() {
    chrome.storage.local.get(['config'], (result) => {
        const studentEmail = result.config?.studentEmail;
        if (!studentEmail) return;

        let attempts = 0;
        const attemptLogin = setInterval(() => {
            attempts++;
            const emailInput = document.getElementById('IDToken1');
            const submitBtn = document.getElementById('IDButton2');
            if (emailInput && submitBtn) {
                clearInterval(attemptLogin);
                emailInput.value = studentEmail;
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
                submitBtn.disabled = false;

                // La pagina potrebbe chiamare processForm se facciamo submit
                if (typeof window.processForm === 'function') {
                    window.processForm();
                } else {
                    submitBtn.click();
                }
            } else if (attempts > 30) {
                clearInterval(attemptLogin);
            }
        }, 300);
    });
}

let currentVideo = null;

function handleVideoPlayer() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.config) {
            config = { ...config, ...changes.config.newValue };
            if (currentVideo) applyConfig(currentVideo);
            // Aggiorna il dark mode in tempo reale
            applyDarkMode(config.darkMode || false);
        }
    });

    chrome.storage.local.get(['config'], (result) => {
        if (result.config) {
            config = { ...config, ...result.config };
        }
        applyDarkMode(config.darkMode || false);

        setInterval(() => {
            let video = null;
            let maxArea = -1;
            // Cerchiamo il video con la dimensione fisica maggiore per evitare finti video, background o thumbnail
            for (const v of document.querySelectorAll('video')) {
                const area = v.offsetWidth * v.offsetHeight;
                if (area > maxArea) {
                    maxArea = area;
                    video = v;
                }
            }

            if (video && video !== currentVideo) {
                currentVideo = video;

                // Clear old audio context if video changes
                if (audioCtx) {
                    audioCtx.close().catch(console.error);
                    audioCtx = null;
                    analyser = null;
                    source = null;
                    isAudioConnected = false;
                }
                stopAudioMonitoring();
                applyConfig(video);
            }
        }, 1000);
    });
}

function applyConfig(video) {
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

    // Ratechange interceptor in caso i player (Webex/Sharepoint) forzino velocità diverse
    if (!video.dataset.hasRateListener) {
        video.addEventListener('ratechange', function () {
            // Evitiamo conflitti se il player (es. Shaka) sta bufferizzando o è fermo
            if (video.playbackRate === 0 || video.readyState < 3) return;

            const targetSpeed = isSkipping ? config.skipSpeed : config.speed;

            // Se l'utente ha appena cliccato su una velocità nativa, permettiamo la modifica
            if (window._polimiVideoSpeedExpected && Math.abs(video.playbackRate - window._polimiVideoSpeedExpected) < 0.05) {
                return;
            }

            if (Math.abs(video.playbackRate - targetSpeed) > 0.05) {
                video.playbackRate = targetSpeed;
            }
        });
        video.dataset.hasRateListener = 'true';
    }

    // Timeupdate interceptor per mostrare il tempo rimanente a schermo
    if (!video.dataset.hasTimeListener) {
        let remTimeSpan = document.getElementById('polimi-rem-time');
        video.addEventListener('timeupdate', function () {
            if (config.showRemainingTime === false) {
                if (remTimeSpan) remTimeSpan.style.display = 'none';
                return;
            }

            const timeLeft = this.duration - this.currentTime;
            if (isNaN(timeLeft) || timeLeft <= 0) return;

            const projectedLeft = timeLeft / this.playbackRate;
            const text = " [- " + formatTimeContent(projectedLeft) + "]";

            if (!remTimeSpan) {
                remTimeSpan = document.createElement('span');
                remTimeSpan.id = 'polimi-rem-time';
                remTimeSpan.style.color = '#3ad779';
                remTimeSpan.style.marginLeft = '8px';
                remTimeSpan.style.fontSize = '0.9em';
                remTimeSpan.style.fontWeight = 'bold';

                // Cerca div Sharepoint compatibile (ha aria-hidden e text content come "1:44:13 / 2:20:42")
                const findSharepointContainer = () => {
                    const divs = document.querySelectorAll('div[aria-hidden="true"]');
                    for (const d of divs) {
                        if (d.textContent && d.textContent.includes(' / ') && /\d:\d\d/.test(d.textContent)) {
                            return d.parentElement;
                        }
                    }
                    return null;
                };

                // Euristiche di iniezione: Webex (.vjs*, wxp-time-display) o generiche Sharepoint/FluentUI
                let container = document.querySelector('wxp-time-display')
                    || document.querySelector('.vjs-time-control')
                    || document.querySelector('.vjs-duration-display')
                    || findSharepointContainer();

                if (container) {
                    container.appendChild(remTimeSpan);
                }
            }

            if (remTimeSpan && remTimeSpan.parentElement) {
                remTimeSpan.style.display = 'inline';
                remTimeSpan.textContent = text;
            }
        });
        video.dataset.hasTimeListener = 'true';
    }
}

function formatTimeContent(totalSeconds) {
    if (!totalSeconds || !isFinite(totalSeconds) || totalSeconds < 0) return "--:--:--";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }

    // Connettere createMediaElementSource a un AudioContext 'suspended' frizza i video su Chrome/Sharepoint.
    // Aspettiamo che il contesto sia 'running' (dopo interazione utente).
    const tryConnect = () => {
        if (!video || isAudioConnected) return;
        if (audioCtx.state !== 'running') {
            audioCtx.resume().then(() => {
                if (audioCtx.state === 'running') connectNodes(video);
            }).catch(e => console.log("Webex Assistant: In attesa di interazione utente per l'audio"));
            return;
        }
        connectNodes(video);
    };

    if (audioCtx.state === 'running') {
        tryConnect();
    } else {
        const userGestureEvents = ['click', 'keydown', 'play', 'touchstart'];
        const gestureHandler = () => {
            audioCtx.resume().then(() => {
                if (!isAudioConnected) tryConnect();
                userGestureEvents.forEach(e => document.removeEventListener(e, gestureHandler, true));
                video.removeEventListener('play', gestureHandler);
            }).catch(e => { });
        };
        userGestureEvents.forEach(e => document.addEventListener(e, gestureHandler, true));
        video.addEventListener('play', gestureHandler);
        tryConnect();
    }
}

function connectNodes(video) {
    if (isAudioConnected) return;
    try {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.1; // Rende il grafico reattivo

        source = audioCtx.createMediaElementSource(video);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        isAudioConnected = true;

        if (!monitorLoopId) {
            monitorAudio(video);
        }
        console.log("Polimi Webex Assistant: Silence Skipper Iniziato.");
    } catch (e) {
        console.error("Polimi Webex Assistant: Errore setup Web Audio", e);
    }
}

function stopAudioMonitoring() {
    if (monitorLoopId) {
        cancelAnimationFrame(monitorLoopId);
        monitorLoopId = null;
    }
    isSkipping = false;
    silenceStart = null;
}

function monitorAudio(video) {
    if (!config.silenceSkip || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i]);
    }
    let average = sum / dataArray.length;
    // Amplifichiamo leggermente il segnale per renderlo più leggibile nei video Sharepoint che hanno volume basso
    let volumePercent = (average / 255) * 100 * 1.5;

    // Seleziona la logica solo se il video sta andando e non sta bufferizzando
    if (!video.paused) {
        if (volumePercent <= config.threshold) {
            if (!isSkipping) {
                if (!silenceStart) {
                    silenceStart = Date.now();
                } else if (Date.now() - silenceStart > (config.silenceDuration * 1000)) {
                    isSkipping = true;
                    setActualSpeed(video, config.skipSpeed);
                }
            }
        } else {
            silenceStart = null;
            if (isSkipping) {
                // E' ritornata la voce
                isSkipping = false;
                setActualSpeed(video, config.speed);
            }
        }
    }

    monitorLoopId = requestAnimationFrame(() => monitorAudio(video));
}

// Intercetta i click dell'utente sulle opzioni di velocità del player nativo
document.addEventListener('click', function(e) {
    if (!e.isTrusted) return;

    // Aggiunti i role generici usati da Fluent UI (SharePoint) come [role="menuitemradio"] ecc.
    let el = e.target.closest('li, button, div.vjs-menu-item, [role="menuitem"], [role="menuitemradio"], [role="option"]');
    if (!el) return;

    // Ignora i bottoni principali (es. i combobox che aprono il menu)
    if (el.hasAttribute('aria-expanded') || el.getAttribute('role') === 'combobox') return;

    let newSpeed = null;

    if (el.hasAttribute('data-rate')) {
        newSpeed = parseFloat(el.getAttribute('data-rate'));
    } else {
        // Rimuove spazi vuoti, ritorni a capo o icone (es. le spunte "✓ 1.5x") estraendo solo la cifra
        let text = (el.innerText || el.textContent || "").toLowerCase().replace(/[^0-9\.x]/g, '');
        let match = text.match(/^([0-9]+(?:\.[0-9]+)?)x?$/);
        if (match) {
            newSpeed = parseFloat(match[1]);
        }
    }

    if (newSpeed && !isNaN(newSpeed) && newSpeed !== config.speed && newSpeed > 0 && newSpeed <= 10) {
        window._polimiVideoSpeedExpected = newSpeed;
        console.log("Webex Assistant: Rilevato cambio velocità dal menu nativo a: " + newSpeed);
        chrome.storage.local.get(['config'], (result) => {
            const currentConfig = result.config || config;
            currentConfig.speed = newSpeed;
            chrome.storage.local.set({ config: currentConfig });
        });
    }
}, true);
