let config = {
    studentEmail: "",
    speed: 1.0,
    silenceSkip: false,
    showRemainingTime: true,
    darkMode: false,
    threshold: 2.0,
    silenceDuration: 1.0,
    skipSpeed: 8.0,
    darkModeWebex: true,
    darkModeRecMan: true
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

        /* Re-invert: video and canvas (they must be shown as they are) */
        html.${DARK_MODE_CLASS} video,
        html.${DARK_MODE_CLASS} canvas {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: Webex player wrapper (vjs + wxp) */
        html.${DARK_MODE_CLASS} .vjs-tech,
        html.${DARK_MODE_CLASS} .wxp-video-wrapper video,
        html.${DARK_MODE_CLASS} .vjs-poster {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: thumbnails on the video bar (they use background-image on div, not <img>)
           .vjs-thumbnails-tooltip-img = classic Webex hover thumbnail
           .wxp-progress-bar-tip-img   = wxp player hover thumbnail */
        html.${DARK_MODE_CLASS} .vjs-thumbnails-tooltip-img,
        html.${DARK_MODE_CLASS} .wxp-progress-bar-tip-img {
            filter: invert(1) hue-rotate(180deg) !important;
        }

        /* Re-invert: thumbnails, previews, and cover images */
        html.${DARK_MODE_CLASS} img {
            filter: invert(1) hue-rotate(180deg) !important;
        }


        /* FIX Polimi logo (PNG with transparent background):
           DO NOT re-invert: let the html invert transform it
           from dark logo -> light logo on dark background (desired effect) */
        html.${DARK_MODE_CLASS} img.logo-polimi,
        html.${DARK_MODE_CLASS} img[alt="logo-polimi"] {
            filter: none !important;
            background-color: transparent !important;
        }

        /* FIX RecMan - Toolbar: the explicit background becomes black after inversion.
           Set #c8c8c8 in CSS -> after html inversion it appears as ~#373737 (dark gray) */
        html.${DARK_MODE_CLASS} .addons-toolBar-css,
        html.${DARK_MODE_CLASS} .ui-widget-header {
            background-color: #c8c8c8 !important;
        }

        /* FIX RecMan - Alternating rows .pari: light gray -> almost black after inversion.
           Set #d8d8d8 in CSS -> after inversion it appears as ~#272727 (distinguishable from pure black) */
        html.${DARK_MODE_CLASS} tr.pari {
            background-color: #d8d8d8 !important;
        }

        /* FIX Full-Screen: The full-screen layer (top layer) DOES NOT inherit the filter: invert of the HTML tag.
           If we don't remove our re-inverts, they will apply on their own, inverting the video and thumbnails! */
        html.${DARK_MODE_CLASS} *:fullscreen,
        html.${DARK_MODE_CLASS} *:fullscreen video,
        html.${DARK_MODE_CLASS} *:fullscreen canvas,
        html.${DARK_MODE_CLASS} *:fullscreen .vjs-tech,
        html.${DARK_MODE_CLASS} *:fullscreen .wxp-video-wrapper video,
        html.${DARK_MODE_CLASS} *:fullscreen .vjs-poster,
        html.${DARK_MODE_CLASS} *:fullscreen .vjs-thumbnails-tooltip-img,
        html.${DARK_MODE_CLASS} *:fullscreen .wxp-progress-bar-tip-img,
        html.${DARK_MODE_CLASS} *:fullscreen img,
        
        html.${DARK_MODE_CLASS} *:-webkit-full-screen,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen video,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen canvas,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .vjs-tech,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .wxp-video-wrapper video,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .vjs-poster,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .vjs-thumbnails-tooltip-img,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen .wxp-progress-bar-tip-img,
        html.${DARK_MODE_CLASS} *:-webkit-full-screen img {
            filter: none !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
}

function applyDarkMode(enabled) {
    // Do not apply dark mode to login pages (already natively dark)
    if (window.location.hostname.includes("idbroker") || document.title.includes("Accedi - Webex")) {
        document.documentElement.classList.remove(DARK_MODE_CLASS);
        return;
    }

    injectDarkModeStyle();
    
    let isDomainEnabled = true;
    const host = window.location.hostname;
    
    if (host.includes("webex.com")) {
        isDomainEnabled = config.darkModeWebex !== false;
    } else if (host.includes("sharepoint.com")) {
        isDomainEnabled = false;
    } else if (host.includes("ceda.polimi.it")) {
        isDomainEnabled = config.darkModeRecMan !== false;
    }

    if (enabled && isDomainEnabled) {
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

if (window.location.hostname.includes("idbroker") || document.title.includes("Accedi - Webex")) {
    handleSSOLogin();
} else {
    handleVideoPlayer();
}

// Read and apply dark mode immediately (even on pages without video, e.g. RecMan)
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

                // The page might call processForm if we submit
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
            // Update dark mode in real time
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
            // Search for the video with the largest physical dimension to avoid fake videos, backgrounds or thumbnails
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

    // If silence skip is not active
    if (!config.silenceSkip || !isSkipping) {
        setActualSpeed(video, config.speed);
    } else if (config.silenceSkip && isSkipping) {
        setActualSpeed(video, config.skipSpeed);
    }

    // Ratechange interceptor in case players (Webex/Sharepoint) force different speeds
    if (!video.dataset.hasRateListener) {
        video.addEventListener('ratechange', function () {
            // Avoid conflicts if the player (e.g. Shaka) is buffering or stopped
            if (video.playbackRate === 0 || video.readyState < 3) return;

            const targetSpeed = isSkipping ? config.skipSpeed : config.speed;

            // If the user just clicked a native speed, allow the change
            if (window._polimiVideoSpeedExpected && Math.abs(video.playbackRate - window._polimiVideoSpeedExpected) < 0.05) {
                return;
            }

            if (Math.abs(video.playbackRate - targetSpeed) > 0.05) {
                video.playbackRate = targetSpeed;
            }
        });
        video.dataset.hasRateListener = 'true';
    }

    // Timeupdate interceptor to show remaining time on screen
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

                // Search for a compatible Sharepoint div (has aria-hidden and text content like "1:44:13 / 2:20:42")
                const findSharepointContainer = () => {
                    const divs = document.querySelectorAll('div[aria-hidden="true"]');
                    for (const d of divs) {
                        if (d.textContent && d.textContent.includes(' / ') && /\d:\d\d/.test(d.textContent)) {
                            return d.parentElement;
                        }
                    }
                    return null;
                };

                // Injection heuristics: Webex (.vjs*, wxp-time-display) or generic Sharepoint/FluentUI
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

    // Visually update native player if present
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

    // Connecting createMediaElementSource to a 'suspended' AudioContext freezes videos on Chrome/Sharepoint.
    // We wait for the context to be 'running' (after user interaction).
    const tryConnect = () => {
        if (!video || isAudioConnected) return;
        if (audioCtx.state !== 'running') {
            audioCtx.resume().then(() => {
                if (audioCtx.state === 'running') connectNodes(video);
            }).catch(e => console.log("Webex Assistant: Waiting for user interaction for audio"));
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
        analyser.smoothingTimeConstant = 0.1; // Makes the graph reactive

        source = audioCtx.createMediaElementSource(video);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        isAudioConnected = true;

        if (!monitorLoopId) {
            monitorAudio(video);
        }
        console.log("Polimi Webex Assistant: Silence Skipper Started.");
    } catch (e) {
        console.error("Polimi Webex Assistant: Web Audio setup error", e);
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
    // Slightly amplify the signal to make it more readable in Sharepoint videos that have low volume
    let volumePercent = (average / 255) * 100 * 1.5;

    // Run the logic only if the video is playing and not buffering
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
                // Voice returned
                isSkipping = false;
                setActualSpeed(video, config.speed);
            }
        }
    }

    monitorLoopId = requestAnimationFrame(() => monitorAudio(video));
}

// Intercept user clicks on native player speed options
document.addEventListener('click', function(e) {
    if (!e.isTrusted) return;

    // Added generic roles used by Fluent UI (SharePoint) like [role="menuitemradio"] etc.
    let el = e.target.closest('li, button, div.vjs-menu-item, [role="menuitem"], [role="menuitemradio"], [role="option"]');
    if (!el) return;

    // Ignore main buttons (e.g. comboboxes that open the menu)
    if (el.hasAttribute('aria-expanded') || el.getAttribute('role') === 'combobox') return;

    // Ignore non-speed control buttons (like forward/rewind 10 seconds)
    const title = (el.getAttribute('title') || '').toLowerCase();
    const originalText = (el.innerText || el.textContent || "").toLowerCase();
    if (title.includes('forward') || title.includes('rewind') || 
        originalText.includes('forward') || originalText.includes('rewind') || originalText.includes('second')) {
        return;
    }

    let newSpeed = null;

    if (el.hasAttribute('data-rate')) {
        newSpeed = parseFloat(el.getAttribute('data-rate'));
    } else {
        // Remove whitespace, line breaks or icons (e.g. checkmarks "✓ 1.5x") extracting only the number
        let text = originalText.replace(/[^0-9\.x]/g, '');
        let match = text.match(/^([0-9]+(?:\.[0-9]+)?)x?$/);
        if (match) {
            newSpeed = parseFloat(match[1]);
        }
    }

    if (newSpeed && !isNaN(newSpeed) && newSpeed !== config.speed && newSpeed > 0 && newSpeed <= 10) {
        window._polimiVideoSpeedExpected = newSpeed;
        console.log("Webex Assistant: Detected speed change from native menu to: " + newSpeed);
        chrome.storage.local.get(['config'], (result) => {
            const currentConfig = result.config || config;
            currentConfig.speed = newSpeed;
            chrome.storage.local.set({ config: currentConfig });
        });
    }
}, true);
