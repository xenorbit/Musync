/**
 * Musync - 3D Symbiote Audio Visualizer
 * A reactive 3D blob visualization that responds to audio input
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // Symbiote settings
    baseRadius: 0.9,
    segments: 128,
    rotationSpeed: 0.0004,

    // Audio
    fftSize: 512,  // More frequency detail
    smoothing: 0.7,

    // Interaction
    mouseInfluence: 0.6,
    pokeForce: 1.0,
    pokeDecay: 0.92,
    dragStrength: 0.15,
    dragDecay: 0.85,

    // Audio reactivity multipliers
    bassMultiplier: 2.0,
    midMultiplier: 1.5,
    highMultiplier: 1.8,

    // Multi-layered noise system
    noise: {
        // Bass layer - large, slow undulations
        bass: {
            scale: 1.2,       // Large features
            speed: 0.3,       // Slow movement
            amplitude: 0.4,   // Strong effect
        },
        // Mid layer - medium ripples
        mid: {
            scale: 2.5,       // Medium features
            speed: 0.8,       // Moderate speed
            amplitude: 0.25,  // Medium effect
        },
        // High layer - sharp spikes
        high: {
            scale: 4.0,       // Fine features
            speed: 2.0,       // Fast movement
            amplitude: 0.35,  // Sharp spikes
        },
        // Micro detail layer
        detail: {
            scale: 6.0,       // Very fine
            speed: 1.5,
            amplitude: 0.08,
        },
    },

    // Frequency spatial mapping (how much each region responds to frequencies)
    spatialMapping: {
        enabled: true,
        bassBottomBias: 0.7,   // Bass affects bottom more
        highTopBias: 0.6,      // Highs affect top more
    },

    // Hotspot spike system
    hotspots: {
        enabled: true,
        count: 8,              // Number of hotspot attractors
        beatThreshold: 0.65,   // Trigger threshold for beat detection
        spikeStrength: 0.8,    // How strong hotspot spikes are
        decay: 0.92,           // How fast spikes decay
    },

    // Beat detection
    beatDetection: {
        sensitivity: 1.5,
        decayRate: 0.98,
    },
};

// ============================================
// State
// ============================================
const state = {
    // Three.js
    scene: null,
    camera: null,
    renderer: null,
    symbiote: null,
    originalPositions: null,

    // Animation
    time: 0,

    // Mouse & Drag Physics
    mouse: { x: 0, y: 0, prevX: 0, prevY: 0, isOver: false, isDown: false },
    drag: { velocityX: 0, velocityY: 0, offsetX: 0, offsetY: 0 },
    poke: { force: 0 },

    // Audio
    audioContext: null,
    analyser: null,
    frequencyData: null,
    audioSource: null,
    isAudioActive: false,

    // Frequency bands (normalized 0-1)
    bass: 0,
    mid: 0,
    high: 0,

    // Sub-frequency bands for more detail (8 bands)
    subBands: [0, 0, 0, 0, 0, 0, 0, 0],

    // Beat detection
    beat: {
        detected: false,
        energy: 0,
        prevEnergy: 0,
        intensity: 0,  // Decaying beat intensity for smooth visuals
    },

    // Hotspot spike system
    hotspots: [], // Will be populated with {x, y, z, intensity, frequency}
};

// ============================================
// Simplex Noise Implementation
// ============================================
class SimplexNoise {
    constructor() {
        this.p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) this.p[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        this.perm = new Uint8Array(512);
        for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
    }

    noise3D(x, y, z) {
        const floor = Math.floor;
        const F3 = 1 / 3, G3 = 1 / 6;

        const s = (x + y + z) * F3;
        const i = floor(x + s), j = floor(y + s), k = floor(z + s);
        const t = (i + j + k) * G3;
        const X0 = i - t, Y0 = j - t, Z0 = k - t;
        const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
            else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
            else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
        } else {
            if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
            else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
            else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        }

        const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
        const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
        const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

        const ii = i & 255, jj = j & 255, kk = k & 255;

        const grad = (hash, x, y, z) => {
            const h = hash & 15;
            const u = h < 8 ? x : y;
            const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
            return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
        };

        let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
        let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj + this.perm[kk]]], x0, y0, z0); }
        let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]], x1, y1, z1); }
        let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * grad(this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]], x2, y2, z2); }
        let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 > 0) { t3 *= t3; n3 = t3 * t3 * grad(this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]], x3, y3, z3); }

        return 32 * (n0 + n1 + n2 + n3);
    }
}

const noise = new SimplexNoise();

// ============================================
// Initialization
// ============================================
function init() {
    // Setup Three.js scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xffffff);

    // Camera - centered perspective
    state.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    state.camera.position.z = 6;

    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('app').insertBefore(
        state.renderer.domElement,
        document.getElementById('controls')
    );

    // Remove old canvas if exists
    const oldCanvas = document.getElementById('visualizer');
    if (oldCanvas) oldCanvas.remove();

    // Create symbiote
    createSymbiote();

    // Initialize hotspot spike attractors
    initHotspots();

    // Add lighting
    setupLighting();

    // Event listeners
    setupEventListeners();

    // Handle resize
    window.addEventListener('resize', onResize);

    // Start animation
    animate();

    // Auto-start system audio
    startSystemAudio();
}

function createSymbiote() {
    // Create sphere geometry with high detail for deformation
    const geometry = new THREE.SphereGeometry(
        CONFIG.baseRadius,
        CONFIG.segments,
        CONFIG.segments
    );

    // Store original positions for deformation reference
    state.originalPositions = geometry.attributes.position.array.slice();

    // Dark, glossy material for symbiote look
    const material = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.15,
        metalness: 0.9,
        envMapIntensity: 1.0,
    });

    state.symbiote = new THREE.Mesh(geometry, material);
    state.scene.add(state.symbiote);
}

function setupLighting() {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    state.scene.add(ambient);

    // Main key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 5, 5);
    state.scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-5, 0, 5);
    state.scene.add(fillLight);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -5, -5);
    state.scene.add(rimLight);
}

function onResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    const canvas = state.renderer.domElement;

    // Mouse events
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseenter', () => state.mouse.isOver = true);
    canvas.addEventListener('mouseleave', () => { state.mouse.isOver = false; state.mouse.isDown = false; });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    // Touch events
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    // Control buttons
    document.getElementById('systemAudioBtn').addEventListener('click', startSystemAudio);
    document.getElementById('micBtn').addEventListener('click', startMicrophone);
    document.getElementById('audioFile').addEventListener('change', onFileUpload);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
}

function onMouseMove(e) {
    // Store previous position for velocity calculation
    state.mouse.prevX = state.mouse.x;
    state.mouse.prevY = state.mouse.y;

    // Normalize mouse position to -1 to 1
    state.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Calculate drag velocity when dragging
    if (state.mouse.isDown) {
        state.drag.velocityX = (state.mouse.x - state.mouse.prevX) * 5;
        state.drag.velocityY = (state.mouse.y - state.mouse.prevY) * 5;
    }
}

function onMouseDown(e) {
    state.mouse.isDown = true;
    state.poke.force = CONFIG.pokeForce;
}

function onMouseUp(e) {
    state.mouse.isDown = false;
}

function onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    state.mouse.prevX = state.mouse.x;
    state.mouse.prevY = state.mouse.y;
    state.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    state.mouse.isOver = true;
    state.mouse.isDown = true;
    state.poke.force = CONFIG.pokeForce;
}

function onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    state.mouse.prevX = state.mouse.x;
    state.mouse.prevY = state.mouse.y;
    state.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

    if (state.mouse.isDown) {
        state.drag.velocityX = (state.mouse.x - state.mouse.prevX) * 5;
        state.drag.velocityY = (state.mouse.y - state.mouse.prevY) * 5;
    }
}

function onTouchEnd() {
    state.mouse.isOver = false;
    state.mouse.isDown = false;
}

// ============================================
// Audio Setup
// ============================================
async function initAudioContext() {
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = CONFIG.fftSize;
        state.analyser.smoothingTimeConstant = CONFIG.smoothing;
        state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    }

    if (state.audioContext.state === 'suspended') {
        await state.audioContext.resume();
    }
}

async function startSystemAudio() {
    try {
        await initAudioContext();
        stopCurrentSource();

        showStatus('Select a tab or window to capture audio...');

        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        stream.getVideoTracks().forEach(track => track.stop());

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            showStatus('No audio track found. Make sure to share a tab with audio.');
            return;
        }

        state.audioSource = state.audioContext.createMediaStreamSource(stream);
        state.audioSource.connect(state.analyser);
        state.isAudioActive = true;

        updateButtonStates('system');
        showStatus('Capturing system audio');

        audioTracks[0].onended = () => {
            state.isAudioActive = false;
            updateButtonStates(null);
            showStatus('Audio capture stopped');
        };

    } catch (err) {
        console.error('System audio error:', err);
        showStatus('Failed to capture system audio');
    }
}

async function startMicrophone() {
    try {
        await initAudioContext();
        stopCurrentSource();

        showStatus('Requesting microphone access...');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        state.audioSource = state.audioContext.createMediaStreamSource(stream);
        state.audioSource.connect(state.analyser);
        state.isAudioActive = true;

        updateButtonStates('mic');
        showStatus('Microphone active');

    } catch (err) {
        console.error('Microphone error:', err);
        showStatus('Failed to access microphone');
    }
}

async function onFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        await initAudioContext();
        stopCurrentSource();

        showStatus('Loading audio file...');

        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);

        state.audioSource = state.audioContext.createBufferSource();
        state.audioSource.buffer = audioBuffer;
        state.audioSource.loop = true;
        state.audioSource.connect(state.analyser);
        state.analyser.connect(state.audioContext.destination);
        state.audioSource.start();
        state.isAudioActive = true;

        updateButtonStates('file');
        showStatus(`Playing: ${file.name}`);

    } catch (err) {
        console.error('File upload error:', err);
        showStatus('Failed to load audio file');
    }
}

function stopCurrentSource() {
    if (state.audioSource) {
        try {
            if (state.audioSource.stop) state.audioSource.stop();
            state.audioSource.disconnect();
        } catch (e) { }
        state.audioSource = null;
    }
    state.isAudioActive = false;
}

function updateButtonStates(active) {
    document.getElementById('systemAudioBtn').classList.toggle('active', active === 'system');
    document.getElementById('micBtn').classList.toggle('active', active === 'mic');
    document.getElementById('fileBtn').classList.toggle('active', active === 'file');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.classList.add('visible');
    setTimeout(() => status.classList.remove('visible'), 3000);
}

// ============================================
// Audio Analysis
// ============================================
function analyzeAudio() {
    if (!state.isAudioActive || !state.analyser) {
        // Decay all values when no audio
        state.bass *= 0.95;
        state.mid *= 0.95;
        state.high *= 0.95;
        state.beat.intensity *= 0.9;
        for (let i = 0; i < state.subBands.length; i++) {
            state.subBands[i] *= 0.92;
        }
        // Decay hotspots
        state.hotspots.forEach(h => h.intensity *= CONFIG.hotspots.decay);
        return;
    }

    state.analyser.getByteFrequencyData(state.frequencyData);

    const bins = state.frequencyData.length;
    const bassEnd = Math.floor(bins * 0.08);   // Sub-bass to bass
    const lowMidEnd = Math.floor(bins * 0.15); // Low mids
    const midEnd = Math.floor(bins * 0.4);     // Mids
    const highMidEnd = Math.floor(bins * 0.6); // High mids

    let bassSum = 0, midSum = 0, highSum = 0;
    let totalEnergy = 0;

    // Calculate 8 sub-bands for detailed frequency response
    const bandSize = Math.floor(bins / 8);
    const bandSums = [0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < bins; i++) {
        const value = state.frequencyData[i] / 255;
        totalEnergy += value;

        // Main frequency bands
        if (i < bassEnd) bassSum += value;
        else if (i < midEnd) midSum += value;
        else highSum += value;

        // Sub-bands
        const bandIndex = Math.min(7, Math.floor(i / bandSize));
        bandSums[bandIndex] += value;
    }

    // Normalize and apply multipliers
    const targetBass = (bassSum / bassEnd) * CONFIG.bassMultiplier;
    const targetMid = (midSum / (midEnd - bassEnd)) * CONFIG.midMultiplier;
    const targetHigh = (highSum / (bins - midEnd)) * CONFIG.highMultiplier;

    // Smooth interpolation for organic movement
    state.bass += (targetBass - state.bass) * 0.35;
    state.mid += (targetMid - state.mid) * 0.3;
    state.high += (targetHigh - state.high) * 0.4;

    // Update sub-bands with varying smoothing (lower = faster response)
    for (let i = 0; i < 8; i++) {
        const targetBand = (bandSums[i] / bandSize) * 1.5;
        const smoothing = 0.25 + (i * 0.03); // Lower bands react faster
        state.subBands[i] += (targetBand - state.subBands[i]) * smoothing;
    }

    // Beat detection
    state.beat.prevEnergy = state.beat.energy;
    state.beat.energy = totalEnergy / bins;

    const energyDelta = state.beat.energy - state.beat.prevEnergy;
    const beatThreshold = CONFIG.hotspots.beatThreshold * (1 - state.beat.energy * 0.3);

    state.beat.detected = energyDelta > beatThreshold && state.beat.energy > 0.3;

    if (state.beat.detected) {
        // Boost beat intensity
        state.beat.intensity = Math.min(1.5, state.beat.intensity + energyDelta * CONFIG.beatDetection.sensitivity);

        // Trigger hotspot spikes on beat
        if (CONFIG.hotspots.enabled) {
            triggerHotspotSpike();
        }
    }

    // Decay beat intensity
    state.beat.intensity *= CONFIG.beatDetection.decayRate;

    // Update hotspot intensities
    state.hotspots.forEach(h => {
        h.intensity *= CONFIG.hotspots.decay;
    });
}

// Initialize hotspots with random positions on sphere surface
function initHotspots() {
    state.hotspots = [];
    for (let i = 0; i < CONFIG.hotspots.count; i++) {
        // Random point on unit sphere using spherical coordinates
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        state.hotspots.push({
            x: Math.sin(phi) * Math.cos(theta),
            y: Math.sin(phi) * Math.sin(theta),
            z: Math.cos(phi),
            intensity: 0,
            frequencyBand: i % 8, // Each hotspot responds to different sub-band
            basePhase: Math.random() * Math.PI * 2,
        });
    }
}

// Trigger a spike at random hotspots on beat
function triggerHotspotSpike() {
    // Pick 1-3 random hotspots to spike
    const spikesCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < spikesCount; i++) {
        const idx = Math.floor(Math.random() * state.hotspots.length);
        const hotspot = state.hotspots[idx];

        // Spike intensity based on the hotspot's assigned frequency band
        const bandEnergy = state.subBands[hotspot.frequencyBand];
        hotspot.intensity = Math.min(1.5, hotspot.intensity + CONFIG.hotspots.spikeStrength * (0.5 + bandEnergy));
    }
}

// ============================================
// Animation Loop
// ============================================
function animate() {
    requestAnimationFrame(animate);

    state.time += 0.016; // ~60fps timestep

    // Analyze audio
    analyzeAudio();

    // Apply drag physics - accumulate offset from velocity
    state.drag.offsetX += state.drag.velocityX * CONFIG.dragStrength;
    state.drag.offsetY += state.drag.velocityY * CONFIG.dragStrength;

    // Decay drag velocity and offset (spring back)
    state.drag.velocityX *= CONFIG.dragDecay;
    state.drag.velocityY *= CONFIG.dragDecay;
    state.drag.offsetX *= 0.92; // Spring back to center
    state.drag.offsetY *= 0.92;

    // Update symbiote deformation
    updateSymbiote();

    // Rotate symbiote
    state.symbiote.rotation.y += CONFIG.rotationSpeed;
    state.symbiote.rotation.x = Math.sin(state.time * 0.2) * 0.1;

    // Decay poke force
    state.poke.force *= CONFIG.pokeDecay;

    // Render
    state.renderer.render(state.scene, state.camera);
}

function updateSymbiote() {
    const geometry = state.symbiote.geometry;
    const positions = geometry.attributes.position.array;
    const original = state.originalPositions;

    const t = state.time;
    const noiseConfig = CONFIG.noise;

    // Global audio influence for overall size breathing
    const globalBreathing = 1 + state.bass * 0.3 + state.beat.intensity * 0.2;

    // Mouse influence
    const mouseInfluence = state.mouse.isOver ? CONFIG.mouseInfluence : 0;

    // Drag offset influence
    const dragMagnitude = Math.sqrt(state.drag.offsetX * state.drag.offsetX + state.drag.offsetY * state.drag.offsetY);

    for (let i = 0; i < positions.length; i += 3) {
        const ox = original[i];
        const oy = original[i + 1];
        const oz = original[i + 2];

        // Get normalized direction from center
        const length = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / length;
        const ny = oy / length;
        const nz = oz / length;

        // ==========================================
        // MULTI-LAYERED NOISE SYSTEM
        // ==========================================

        // 1. BASS LAYER - Large, slow undulating waves
        const bassNoise = noise.noise3D(
            nx * noiseConfig.bass.scale + t * noiseConfig.bass.speed,
            ny * noiseConfig.bass.scale + t * noiseConfig.bass.speed * 0.7,
            nz * noiseConfig.bass.scale
        );
        const bassDisplacement = bassNoise * noiseConfig.bass.amplitude * (0.3 + state.bass * 1.5);

        // 2. MID LAYER - Medium flowing ripples
        const midNoise = noise.noise3D(
            nx * noiseConfig.mid.scale + t * noiseConfig.mid.speed,
            ny * noiseConfig.mid.scale - t * noiseConfig.mid.speed * 0.5,
            nz * noiseConfig.mid.scale + t * noiseConfig.mid.speed * 0.3
        );
        const midDisplacement = midNoise * noiseConfig.mid.amplitude * (0.2 + state.mid * 1.2);

        // 3. HIGH LAYER - Sharp, fast spikes
        const highNoise = noise.noise3D(
            nx * noiseConfig.high.scale + t * noiseConfig.high.speed,
            ny * noiseConfig.high.scale + t * noiseConfig.high.speed * 1.2,
            nz * noiseConfig.high.scale - t * noiseConfig.high.speed * 0.8
        );
        // Only spike when noise is positive (creates sharp peaks, not valleys)
        const highSpike = Math.max(0, highNoise) * noiseConfig.high.amplitude * (0.1 + state.high * 2.0);

        // 4. DETAIL LAYER - Fine surface texture
        const detailNoise = noise.noise3D(
            nx * noiseConfig.detail.scale + t * noiseConfig.detail.speed * 0.5,
            ny * noiseConfig.detail.scale,
            nz * noiseConfig.detail.scale + t * noiseConfig.detail.speed
        );
        const detailDisplacement = detailNoise * noiseConfig.detail.amplitude;

        // ==========================================
        // SPATIAL FREQUENCY MAPPING
        // ==========================================
        let spatialModifier = 0;

        if (CONFIG.spatialMapping.enabled) {
            // ny ranges from -1 (bottom) to 1 (top)
            const verticalPos = ny;

            // Bass affects bottom hemisphere more
            const bassRegion = Math.max(0, -verticalPos); // 1 at bottom, 0 at top
            const bassBoost = bassRegion * state.bass * CONFIG.spatialMapping.bassBottomBias;

            // Highs affect top hemisphere more
            const highRegion = Math.max(0, verticalPos); // 1 at top, 0 at bottom
            const highBoost = highRegion * state.high * CONFIG.spatialMapping.highTopBias * 0.5;

            // Mids affect the equator more
            const midRegion = 1 - Math.abs(verticalPos); // 1 at equator, 0 at poles
            const midBoost = midRegion * state.mid * 0.3;

            spatialModifier = bassBoost + highBoost + midBoost;
        }

        // ==========================================
        // HOTSPOT SPIKE ATTRACTORS
        // ==========================================
        let hotspotDisplacement = 0;

        if (CONFIG.hotspots.enabled && state.hotspots.length > 0) {
            for (const hotspot of state.hotspots) {
                if (hotspot.intensity > 0.01) {
                    // Calculate distance from this vertex to hotspot
                    const dx = nx - hotspot.x;
                    const dy = ny - hotspot.y;
                    const dz = nz - hotspot.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // Influence falls off with distance (gaussian-ish)
                    const influence = Math.exp(-dist * dist * 4);

                    // Add spike contribution with some noise for organic look
                    const spikeNoise = noise.noise3D(
                        nx * 3 + hotspot.basePhase,
                        ny * 3 + t * 0.5,
                        nz * 3
                    );
                    hotspotDisplacement += hotspot.intensity * influence * (0.5 + Math.abs(spikeNoise) * 0.5);
                }
            }
        }

        // ==========================================
        // SUB-BAND REACTIVE DETAIL (8 bands)
        // ==========================================
        let subBandDetail = 0;

        // Each sub-band creates ripples at different frequencies
        for (let b = 0; b < 8; b++) {
            if (state.subBands[b] > 0.1) {
                const bandScale = 2 + b * 0.8;
                const bandSpeed = 0.5 + b * 0.3;
                const bandNoise = noise.noise3D(
                    nx * bandScale + t * bandSpeed + b,
                    ny * bandScale,
                    nz * bandScale - t * bandSpeed * 0.5
                );
                subBandDetail += bandNoise * state.subBands[b] * 0.08;
            }
        }

        // ==========================================
        // BEAT PULSE EFFECT
        // ==========================================
        const beatPulse = state.beat.intensity * 0.15;

        // ==========================================
        // POKE & DRAG EFFECTS
        // ==========================================
        let interactionDisplacement = 0;

        // Poke effect
        if (state.poke.force > 0.01) {
            interactionDisplacement += state.poke.force * bassNoise * 0.6;
        }

        // Drag deformation - liquid-like stretching
        if (dragMagnitude > 0.01) {
            const dragDirX = state.drag.offsetX / (dragMagnitude + 0.001);
            const dragDirY = state.drag.offsetY / (dragMagnitude + 0.001);
            const alignment = nx * dragDirX + ny * dragDirY;

            if (alignment > 0) {
                interactionDisplacement += alignment * dragMagnitude * 2.0;
            } else {
                interactionDisplacement += alignment * dragMagnitude * 0.5;
            }
        }

        // Mouse attraction
        if (mouseInfluence > 0) {
            const mouseDir = new THREE.Vector3(state.mouse.x, state.mouse.y, 0.5).normalize();
            const dot = nx * mouseDir.x + ny * mouseDir.y + nz * mouseDir.z;
            if (dot > 0) {
                interactionDisplacement += dot * mouseInfluence * 0.4;
            }
        }

        // ==========================================
        // COMBINE ALL LAYERS
        // ==========================================
        const totalDisplacement =
            bassDisplacement +
            midDisplacement +
            highSpike +
            detailDisplacement +
            spatialModifier +
            hotspotDisplacement +
            subBandDetail +
            beatPulse +
            interactionDisplacement;

        // Apply final displacement
        const scale = globalBreathing + totalDisplacement;
        positions[i] = ox * scale;
        positions[i + 1] = oy * scale;
        positions[i + 2] = oz * scale;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
}

// ============================================
// Start
// ============================================
document.addEventListener('DOMContentLoaded', init);
