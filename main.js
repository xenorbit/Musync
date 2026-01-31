/**
 * Musync - 3D Symbiote Audio Visualizer
 * A reactive 3D blob visualization that responds to audio input
 * Enhanced with Jelly Physics, Ripples, Particles & Chromatics
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
    fftSize: 512,
    smoothing: 0.7,

    // Jelly Physics (Spring-Mass-Damper)
    physics: {
        springStrength: 0.08,    // How strongly blob returns to center
        damping: 0.92,           // Velocity damping (lower = more wobbly)
        throwRetention: 0.95,    // How much velocity is kept on release
        bounceElasticity: 0.7,   // Bounce off screen edges
        maxDisplacement: 2.5,    // Max distance from center
        wobbleFrequency: 3.0,    // Wobble oscillation speed
        wobbleDecay: 0.95,       // How fast wobble settles
    },

    // Ripple System
    ripples: {
        enabled: true,
        maxRipples: 10,
        speed: 2.5,              // How fast ripples travel
        wavelength: 0.8,         // Distance between wave peaks
        amplitude: 0.15,         // Height of ripples
        decay: 0.97,             // How fast ripples fade
        beatTrigger: true,       // Spawn ripples on beat
    },

    // Particle System
    particles: {
        enabled: true,
        count: 250,
        orbitRadius: 2.0,
        orbitSpeed: 0.3,
        size: 0.03,
        repulsionForce: 0.5,     // How much bass pushes particles
        returnSpeed: 0.02,       // How fast particles return to orbit
    },

    // Chromatic Effects
    chromatics: {
        enabled: true,
        currentTheme: 'void',
        emissiveIntensity: 0.8,
        transitionSpeed: 0.15,
    },

    // Color Theme Presets
    themes: {
        void: {
            name: 'Void',
            idleColor: 0x0a0a0a,
            lowEnergyColor: 0x1a0a2e,    // Deep purple
            highEnergyColor: 0x8b0000,   // Crimson
            peakColor: 0x00ffff,         // Electric cyan
            particleColor: 0x4a0080,
            backgroundColor: 0xffffff,
        },
        gold: {
            name: 'Liquid Gold',
            idleColor: 0x1a1a0a,
            lowEnergyColor: 0x8b6914,    // Bronze
            highEnergyColor: 0xffd700,   // Gold
            peakColor: 0xffffff,         // White hot
            particleColor: 0xdaa520,
            backgroundColor: 0xfaf8f0,
        },
        cyber: {
            name: 'Cyberpunk',
            idleColor: 0x0a0a1a,
            lowEnergyColor: 0xff00ff,    // Magenta
            highEnergyColor: 0x00ffff,   // Cyan
            peakColor: 0xffff00,         // Yellow
            particleColor: 0xff1493,
            backgroundColor: 0x0a0a0f,
        },
        bio: {
            name: 'Bioluminescence',
            idleColor: 0x001a0a,
            lowEnergyColor: 0x004d40,    // Dark teal
            highEnergyColor: 0x00ff88,   // Bright green
            peakColor: 0x00ffcc,         // Aqua
            particleColor: 0x00aa55,
            backgroundColor: 0x0a1a1a,
        },
    },

    // Premium Material
    material: {
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transmission: 0.15,
        thickness: 0.5,
        envMapIntensity: 1.5,
    },

    // Legacy settings (kept for compatibility)
    mouseInfluence: 0.6,
    pokeForce: 1.0,
    pokeDecay: 0.92,

    // Audio reactivity multipliers
    bassMultiplier: 2.0,
    midMultiplier: 1.5,
    highMultiplier: 1.8,

    // Multi-layered noise system
    noise: {
        bass: { scale: 1.2, speed: 0.3, amplitude: 0.4 },
        mid: { scale: 2.5, speed: 0.8, amplitude: 0.25 },
        high: { scale: 4.0, speed: 2.0, amplitude: 0.35 },
        detail: { scale: 6.0, speed: 1.5, amplitude: 0.08 },
    },

    spatialMapping: {
        enabled: true,
        bassBottomBias: 0.7,
        highTopBias: 0.6,
    },

    hotspots: {
        enabled: true,
        count: 8,
        beatThreshold: 0.65,
        spikeStrength: 0.8,
        decay: 0.92,
    },

    beatDetection: {
        sensitivity: 1.5,
        decayRate: 0.98,
    },

    // Quality mode
    highQuality: true,

    // Waveform Overlay
    waveformEnabled: false,
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
    envMap: null,

    // Waveform
    waveformCanvas: null,
    waveformCtx: null,

    // Particles
    particles: null,
    particlePositions: null,
    particleVelocities: null,
    particleOriginalPositions: null,

    // Animation
    time: 0,
    deltaTime: 0,
    lastTime: 0,

    // Jelly Physics
    physics: {
        positionX: 0,
        positionY: 0,
        velocityX: 0,
        velocityY: 0,
        wobbleIntensity: 0,
        wobblePhase: 0,
    },

    // Mouse & Drag
    mouse: { x: 0, y: 0, prevX: 0, prevY: 0, isOver: false, isDown: false },
    drag: { velocityX: 0, velocityY: 0, offsetX: 0, offsetY: 0 },
    poke: { force: 0, x: 0, y: 0, z: 0 },

    // Ripple System
    ripples: [],

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
    subBands: [0, 0, 0, 0, 0, 0, 0, 0],

    // Beat detection
    beat: {
        detected: false,
        energy: 0,
        prevEnergy: 0,
        intensity: 0,
    },

    // Chromatic state
    currentColor: new THREE.Color(0x0a0a0a),
    targetColor: new THREE.Color(0x0a0a0a),
    currentEmissive: new THREE.Color(0x000000),

    // Hotspots
    hotspots: [],
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
// ============================================
// Initialization
// ============================================
function init() {
    // Waveform Setup
    state.waveformCanvas = document.getElementById('waveformCanvas');
    if (state.waveformCanvas) {
        state.waveformCtx = state.waveformCanvas.getContext('2d');
        state.waveformCanvas.width = window.innerWidth;
        state.waveformCanvas.height = 150;
    }

    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xffffff);

    state.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    state.camera.position.z = 6;

    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 1.2;
    document.getElementById('app').insertBefore(
        state.renderer.domElement,
        document.getElementById('controls')
    );

    const oldCanvas = document.getElementById('visualizer');
    if (oldCanvas) oldCanvas.remove();

    // Generate environment map for reflections
    generateEnvMap();

    // Create symbiote with premium material
    createSymbiote();

    // Create particle system
    if (CONFIG.particles.enabled) {
        createParticles();
    }

    // Initialize systems
    initHotspots();
    setupLighting();
    setupEventListeners();

    window.addEventListener('resize', onResize);

    // Start animation
    state.lastTime = performance.now();
    animate();

    // Auto-start system audio
    startSystemAudio();
}

// ============================================
// Environment Map Generation
// ============================================
function generateEnvMap() {
    // Create a simple gradient environment for reflections
    const pmremGenerator = new THREE.PMREMGenerator(state.renderer);
    pmremGenerator.compileEquirectangularShader();

    // Create a simple scene for the environment
    const envScene = new THREE.Scene();

    // Gradient background sphere
    const envGeometry = new THREE.SphereGeometry(50, 32, 32);
    const envMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {},
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec3 direction = normalize(vWorldPosition);
                float t = direction.y * 0.5 + 0.5;
                vec3 topColor = vec3(0.95, 0.95, 1.0);
                vec3 bottomColor = vec3(0.2, 0.2, 0.25);
                vec3 color = mix(bottomColor, topColor, t);
                // Add some variation for interesting reflections
                color += 0.1 * sin(direction.x * 10.0) * sin(direction.z * 10.0);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const envMesh = new THREE.Mesh(envGeometry, envMaterial);
    envScene.add(envMesh);

    // Add some bright spots for specular highlights
    const lightGeom = new THREE.SphereGeometry(2, 16, 16);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const light1 = new THREE.Mesh(lightGeom, lightMat);
    light1.position.set(20, 20, 20);
    envScene.add(light1);

    const light2 = new THREE.Mesh(lightGeom, lightMat);
    light2.position.set(-15, 10, 25);
    envScene.add(light2);

    // Render to cubemap
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
    cubeCamera.update(state.renderer, envScene);

    state.envMap = pmremGenerator.fromCubemap(cubeRenderTarget.texture).texture;
    pmremGenerator.dispose();
}

// ============================================
// Symbiote Creation with Premium Material
// ============================================
function createSymbiote() {
    const geometry = new THREE.SphereGeometry(
        CONFIG.baseRadius,
        CONFIG.segments,
        CONFIG.segments
    );

    state.originalPositions = geometry.attributes.position.array.slice();

    let material;

    if (CONFIG.highQuality) {
        // Premium MeshPhysicalMaterial for wet/liquid look
        material = new THREE.MeshPhysicalMaterial({
            color: CONFIG.chromatics.idleColor,
            roughness: CONFIG.material.roughness,
            metalness: CONFIG.material.metalness,
            clearcoat: CONFIG.material.clearcoat,
            clearcoatRoughness: CONFIG.material.clearcoatRoughness,
            envMap: state.envMap,
            envMapIntensity: CONFIG.material.envMapIntensity,
            emissive: 0x000000,
            emissiveIntensity: 0,
        });
    } else {
        // Fallback for lower-end devices
        material = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.15,
            metalness: 0.9,
            envMap: state.envMap,
            envMapIntensity: 1.0,
        });
    }

    state.symbiote = new THREE.Mesh(geometry, material);
    state.scene.add(state.symbiote);
}

// ============================================
// Particle System
// ============================================
function createParticles() {
    const count = CONFIG.particles.count;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Distribute particles in a shell around the blob
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = CONFIG.particles.orbitRadius * (0.8 + Math.random() * 0.4);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;

        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x0a0a0a,
        size: CONFIG.particles.size,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
    });

    state.particles = new THREE.Points(geometry, material);
    state.particlePositions = positions;
    state.particleVelocities = velocities;
    state.particleOriginalPositions = originalPositions;

    state.scene.add(state.particles);
}

function updateParticles() {
    if (!state.particles) return;

    const positions = state.particlePositions;
    const velocities = state.particleVelocities;
    const originals = state.particleOriginalPositions;
    const count = CONFIG.particles.count;

    // Calculate repulsion from blob center based on audio
    const repulsion = state.bass * CONFIG.particles.repulsionForce + state.beat.intensity * 0.3;

    // Mouse velocity influence
    const mouseVelX = state.drag.velocityX * 0.5;
    const mouseVelY = state.drag.velocityY * 0.5;

    for (let i = 0; i < count; i++) {
        const idx = i * 3;

        // Current position
        let x = positions[idx];
        let y = positions[idx + 1];
        let z = positions[idx + 2];

        // Original orbit position (slowly rotating)
        const origX = originals[idx];
        const origY = originals[idx + 1];
        const origZ = originals[idx + 2];

        // Apply rotation to original position (with eased variation)
        const angle = state.time * CONFIG.particles.orbitSpeed + Math.sin(state.time * 0.3) * 0.2;
        const rotatedX = origX * Math.cos(angle) - origZ * Math.sin(angle);
        const rotatedZ = origX * Math.sin(angle) + origZ * Math.cos(angle);

        // Direction from center
        const dist = Math.sqrt(x * x + y * y + z * z);
        const nx = x / (dist + 0.001);
        const ny = y / (dist + 0.001);
        const nz = z / (dist + 0.001);

        // Repulsion force pushes outward
        velocities[idx] += nx * repulsion * 0.1;
        velocities[idx + 1] += ny * repulsion * 0.1;
        velocities[idx + 2] += nz * repulsion * 0.1;

        // Mouse influence
        velocities[idx] += mouseVelX * 0.02;
        velocities[idx + 1] += mouseVelY * 0.02;

        // Return force toward orbit position
        velocities[idx] += (rotatedX - x) * CONFIG.particles.returnSpeed;
        velocities[idx + 1] += (origY - y) * CONFIG.particles.returnSpeed;
        velocities[idx + 2] += (rotatedZ - z) * CONFIG.particles.returnSpeed;

        // Apply velocity with damping
        x += velocities[idx];
        y += velocities[idx + 1];
        z += velocities[idx + 2];

        velocities[idx] *= 0.95;
        velocities[idx + 1] *= 0.95;
        velocities[idx + 2] *= 0.95;

        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
    }

    state.particles.geometry.attributes.position.needsUpdate = true;

    // Update particle color with chromatics
    if (CONFIG.chromatics.enabled) {
        state.particles.material.color.lerp(state.currentColor, 0.1);
    }
}

// ============================================
// Ripple System
// ============================================
function addRipple(x, y, z, strength = 1) {
    if (!CONFIG.ripples.enabled) return;

    // Normalize the position to sphere surface
    const len = Math.sqrt(x * x + y * y + z * z);

    state.ripples.push({
        centerX: x / len,
        centerY: y / len,
        centerZ: z / len,
        time: 0,
        strength: strength,
        maxTime: 3.0, // Ripple lifetime
    });

    // Limit number of active ripples
    if (state.ripples.length > CONFIG.ripples.maxRipples) {
        state.ripples.shift();
    }
}

function updateRipples() {
    const dt = state.deltaTime;

    // Update and remove expired ripples
    state.ripples = state.ripples.filter(ripple => {
        ripple.time += dt * CONFIG.ripples.speed;
        ripple.strength *= CONFIG.ripples.decay;
        return ripple.time < ripple.maxTime && ripple.strength > 0.01;
    });
}

function calculateRippleDisplacement(nx, ny, nz) {
    let totalDisplacement = 0;

    for (const ripple of state.ripples) {
        // Calculate geodesic distance (angle between points on sphere)
        const dot = nx * ripple.centerX + ny * ripple.centerY + nz * ripple.centerZ;
        const distance = Math.acos(Math.min(1, Math.max(-1, dot)));

        // Sinusoidal wave traveling outward
        const wavePhase = distance / CONFIG.ripples.wavelength - ripple.time;
        const wave = Math.sin(wavePhase * Math.PI * 2);

        // Amplitude decreases with distance and time
        const amplitude = ripple.strength * CONFIG.ripples.amplitude;
        const falloff = Math.exp(-distance * 2) * Math.exp(-ripple.time * 0.5);

        totalDisplacement += wave * amplitude * falloff;
    }

    return totalDisplacement;
}

// ============================================
// Jelly Physics
// ============================================
function updateJellyPhysics() {
    const physics = state.physics;
    const config = CONFIG.physics;

    if (state.mouse.isDown) {
        // When dragging, follow mouse with spring
        const targetX = state.mouse.x * 2;
        const targetY = state.mouse.y * 2;

        const forceX = (targetX - physics.positionX) * config.springStrength * 2;
        const forceY = (targetY - physics.positionY) * config.springStrength * 2;

        physics.velocityX += forceX;
        physics.velocityY += forceY;
    } else {
        // Spring back to center
        const forceX = -physics.positionX * config.springStrength;
        const forceY = -physics.positionY * config.springStrength;

        physics.velocityX += forceX;
        physics.velocityY += forceY;
    }

    // Apply damping
    physics.velocityX *= config.damping;
    physics.velocityY *= config.damping;

    // Update position
    physics.positionX += physics.velocityX;
    physics.positionY += physics.velocityY;

    // Bounce off screen edges
    const maxDist = config.maxDisplacement;
    if (Math.abs(physics.positionX) > maxDist) {
        physics.positionX = Math.sign(physics.positionX) * maxDist;
        physics.velocityX *= -config.bounceElasticity;
        physics.wobbleIntensity += Math.abs(physics.velocityX) * 0.5;
    }
    if (Math.abs(physics.positionY) > maxDist) {
        physics.positionY = Math.sign(physics.positionY) * maxDist;
        physics.velocityY *= -config.bounceElasticity;
        physics.wobbleIntensity += Math.abs(physics.velocityY) * 0.5;
    }

    // Update wobble
    physics.wobblePhase += state.deltaTime * config.wobbleFrequency;
    physics.wobbleIntensity *= config.wobbleDecay;

    // Add wobble on sudden velocity changes
    const velocityMagnitude = Math.sqrt(physics.velocityX * physics.velocityX + physics.velocityY * physics.velocityY);
    if (velocityMagnitude > 0.1) {
        physics.wobbleIntensity = Math.min(1, physics.wobbleIntensity + velocityMagnitude * 0.1);
    }

    // Update symbiote position
    if (state.symbiote) {
        state.symbiote.position.x = physics.positionX;
        state.symbiote.position.y = physics.positionY;
    }
}

// ============================================
// Chromatic Effects
// ============================================
function getTheme() {
    return CONFIG.themes[CONFIG.chromatics.currentTheme] || CONFIG.themes.void;
}

function updateChromatics() {
    if (!CONFIG.chromatics.enabled || !state.symbiote) return;

    const theme = getTheme();
    const energy = state.bass * 0.5 + state.mid * 0.3 + state.beat.intensity * 0.5;

    // Determine target color based on energy level
    if (energy < 0.2) {
        state.targetColor.setHex(theme.idleColor);
    } else if (energy < 0.5) {
        state.targetColor.setHex(theme.lowEnergyColor);
    } else if (energy < 0.8) {
        state.targetColor.setHex(theme.highEnergyColor);
    } else {
        state.targetColor.setHex(theme.peakColor);
    }

    // Smooth transition
    state.currentColor.lerp(state.targetColor, CONFIG.chromatics.transitionSpeed);

    // Update emissive based on beat intensity
    const emissiveIntensity = state.beat.intensity * CONFIG.chromatics.emissiveIntensity;
    state.currentEmissive.copy(state.currentColor).multiplyScalar(emissiveIntensity);

    // Apply to material
    const material = state.symbiote.material;
    material.color.copy(state.currentColor);
    material.emissive.copy(state.currentEmissive);
    material.emissiveIntensity = emissiveIntensity;
}

function applyTheme(themeKey) {
    if (!CONFIG.themes[themeKey]) return;

    CONFIG.chromatics.currentTheme = themeKey;
    const theme = CONFIG.themes[themeKey];

    // Update background color
    if (state.scene) {
        state.scene.background.setHex(theme.backgroundColor);
    }

    // Update particle colors
    if (state.particles) {
        state.particles.material.color.setHex(theme.particleColor);
    }

    // Reset current color to idle
    state.currentColor.setHex(theme.idleColor);
    state.targetColor.setHex(theme.idleColor);

    showStatus(`Theme: ${theme.name}`);
}

// ============================================
// Lighting Setup
// ============================================
function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    state.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 5, 5);
    state.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 0, 5);
    state.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, -5, -5);
    state.scene.add(rimLight);

    // Add point light for specular highlights
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(3, 3, 3);
    state.scene.add(pointLight);
}

function onResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);

    if (state.waveformCanvas) {
        state.waveformCanvas.width = window.innerWidth;
        state.waveformCanvas.height = 150;
    }
}

// ============================================
// Event Listeners
// ============================================
let uiHideTimeout = null;
let isPaused = false;
let settingsOpen = false;
let menuManuallyHidden = false;

function setupEventListeners() {
    const canvas = state.renderer.domElement;

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseenter', () => state.mouse.isOver = true);
    canvas.addEventListener('mouseleave', () => { state.mouse.isOver = false; state.mouse.isDown = false; });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    // Audio controls
    document.getElementById('systemAudioBtn').addEventListener('click', startSystemAudio);
    document.getElementById('micBtn').addEventListener('click', startMicrophone);
    document.getElementById('audioFile').addEventListener('change', onFileUpload);
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

    // Quality toggle
    const qualityBtn = document.getElementById('qualityBtn');
    if (qualityBtn) {
        qualityBtn.addEventListener('click', toggleQuality);
    }

    // Settings panel
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => toggleSettings());
        closeSettingsBtn.addEventListener('click', () => toggleSettings(false));
    }

    // Settings sliders
    setupSettingsControls();

    // Hide menu button
    const hideMenuBtn = document.getElementById('hideMenuBtn');
    if (hideMenuBtn) {
        hideMenuBtn.addEventListener('click', () => toggleUIVisibility(false));
    }

    // Floating show button (appears when menu is hidden)
    const floatingShowBtn = document.getElementById('floatingShowBtn');
    if (floatingShowBtn) {
        floatingShowBtn.addEventListener('click', () => toggleUIVisibility(true));
    }

    // Auto-hide UI
    document.addEventListener('mousemove', resetUIHideTimer);
    document.addEventListener('touchstart', resetUIHideTimer);
    resetUIHideTimer();

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Show keyboard hints briefly on load
    showKeyboardHints();
}

function setupSettingsControls() {
    // Size slider
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    if (sizeSlider) {
        sizeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.baseRadius = value;
            sizeValue.textContent = value.toFixed(2);
            recreateSymbiote();
        });
    }

    // Sensitivity slider
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    const sensitivityValue = document.getElementById('sensitivityValue');
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.beatDetection.sensitivity = value;
            sensitivityValue.textContent = value.toFixed(1);
        });
    }

    // Damping (wobble) slider
    const dampingSlider = document.getElementById('dampingSlider');
    const dampingValue = document.getElementById('dampingValue');
    if (dampingSlider) {
        dampingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            CONFIG.physics.damping = value;
            dampingValue.textContent = value.toFixed(2);
        });
    }

    // Particle toggle
    const particleToggle = document.getElementById('particleToggle');
    if (particleToggle) {
        particleToggle.addEventListener('change', (e) => {
            CONFIG.particles.enabled = e.target.checked;
            if (state.particles) {
                state.particles.visible = e.target.checked;
            }
        });
    }

    // Chromatic toggle
    const chromaticToggle = document.getElementById('chromaticToggle');
    if (chromaticToggle) {
        chromaticToggle.addEventListener('change', (e) => {
            CONFIG.chromatics.enabled = e.target.checked;
            if (!e.target.checked && state.symbiote) {
                state.symbiote.material.color.setHex(0x0a0a0a);
                state.symbiote.material.emissive.setHex(0x000000);
            }
        });
    }

    // Theme selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    // Waveform toggle
    const waveformToggle = document.getElementById('waveformToggle');
    if (waveformToggle) {
        waveformToggle.addEventListener('change', (e) => {
            CONFIG.waveformEnabled = e.target.checked;
        });
    }



    // Reset button
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
}

function toggleSettings(open = null) {
    const panel = document.getElementById('settingsPanel');
    if (!panel) return;

    settingsOpen = open !== null ? open : !settingsOpen;
    panel.classList.toggle('open', settingsOpen);
}

function resetSettings() {
    // Reset to defaults
    CONFIG.baseRadius = 0.9;
    CONFIG.beatDetection.sensitivity = 1.5;
    CONFIG.physics.damping = 0.92;
    CONFIG.particles.enabled = true;
    CONFIG.chromatics.enabled = true;
    CONFIG.waveformEnabled = false;

    // Update UI
    document.getElementById('sizeSlider').value = 0.9;
    document.getElementById('sizeValue').textContent = '0.9';
    document.getElementById('sensitivitySlider').value = 1.5;
    document.getElementById('sensitivityValue').textContent = '1.5';
    document.getElementById('dampingSlider').value = 0.92;
    document.getElementById('dampingValue').textContent = '0.92';
    document.getElementById('particleToggle').checked = true;
    document.getElementById('chromaticToggle').checked = true;
    document.getElementById('themeSelect').value = 'void';
    if (document.getElementById('waveformToggle')) {
        document.getElementById('waveformToggle').checked = false;
    }

    // Apply changes
    recreateSymbiote();
    if (state.particles) state.particles.visible = true;
    applyTheme('void');

    showStatus('Settings reset to defaults');
}

function recreateSymbiote() {
    if (state.symbiote) {
        state.scene.remove(state.symbiote);
        createSymbiote();
    }
}

// ============================================
// Auto-Hide UI
// ============================================
function resetUIHideTimer() {
    // Don't auto-show if menu was manually hidden
    if (menuManuallyHidden) return;

    const controls = document.getElementById('controls');
    const hints = document.getElementById('keyboardHints');
    const floatingBtn = document.getElementById('floatingShowBtn');

    if (controls) {
        controls.classList.remove('hidden');
    }
    if (floatingBtn) {
        floatingBtn.classList.remove('visible');
    }

    if (uiHideTimeout) {
        clearTimeout(uiHideTimeout);
    }

    uiHideTimeout = setTimeout(() => {
        if (controls && !settingsOpen) {
            controls.classList.add('hidden');
        }
        if (hints) {
            hints.classList.remove('visible');
        }
    }, 3000);
}

function showKeyboardHints() {
    const hints = document.getElementById('keyboardHints');
    if (hints) {
        setTimeout(() => {
            hints.classList.add('visible');
            setTimeout(() => {
                hints.classList.remove('visible');
            }, 5000);
        }, 1000);
    }
}

// ============================================
// Keyboard Shortcuts
// ============================================
function handleKeyboard(e) {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
        case 'h':
            // Toggle UI visibility
            toggleUIVisibility();
            break;
        case ' ':
            // Pause/Resume
            e.preventDefault();
            togglePause();
            break;
        case 'r':
            // Reset position
            resetPosition();
            break;
        case 's':
            // Toggle settings
            toggleSettings();
            break;
        case 'f':
            // Fullscreen
            toggleFullscreen();
            break;
        case 'q':
            // Quality toggle
            toggleQuality();
            break;
        case 'escape':
            // Close settings if open
            if (settingsOpen) {
                toggleSettings(false);
            }
            break;
    }
}

function toggleUIVisibility(forceShow = null) {
    const controls = document.getElementById('controls');
    const floatingBtn = document.getElementById('floatingShowBtn');

    if (!controls) return;

    if (forceShow === true) {
        // Force show (from floating button or H key when hidden)
        menuManuallyHidden = false;
        controls.classList.remove('hidden');
        if (floatingBtn) floatingBtn.classList.remove('visible');
        showStatus('UI Visible');
        resetUIHideTimer();
    } else if (forceShow === false || !controls.classList.contains('hidden')) {
        // Hide menu
        menuManuallyHidden = true;
        controls.classList.add('hidden');
        if (floatingBtn) floatingBtn.classList.add('visible');
        if (uiHideTimeout) clearTimeout(uiHideTimeout);
    } else {
        // Toggle - currently hidden, so show
        menuManuallyHidden = false;
        controls.classList.remove('hidden');
        if (floatingBtn) floatingBtn.classList.remove('visible');
        showStatus('UI Visible');
        resetUIHideTimer();
    }
}

function togglePause() {
    isPaused = !isPaused;
    showStatus(isPaused ? 'Paused' : 'Resumed');
}

function resetPosition() {
    state.physics.positionX = 0;
    state.physics.positionY = 0;
    state.physics.velocityX = 0;
    state.physics.velocityY = 0;
    state.physics.wobbleIntensity = 0;

    if (state.symbiote) {
        state.symbiote.position.set(0, 0, 0);
    }

    showStatus('Position reset');
}

// ============================================
// Snapshot
// ============================================
function takeSnapshot() {
    // Render one frame to ensure it's current
    state.renderer.render(state.scene, state.camera);

    // Get canvas data
    const dataURL = state.renderer.domElement.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.download = `musync-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    showStatus('Snapshot saved!');
}

function onMouseMove(e) {
    state.mouse.prevX = state.mouse.x;
    state.mouse.prevY = state.mouse.y;

    state.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (state.mouse.isDown) {
        state.drag.velocityX = (state.mouse.x - state.mouse.prevX) * 5;
        state.drag.velocityY = (state.mouse.y - state.mouse.prevY) * 5;
    }
}

function onMouseDown(e) {
    state.mouse.isDown = true;
    state.poke.force = CONFIG.pokeForce;

    // Add ripple at click position
    const x = state.mouse.x;
    const y = state.mouse.y;
    const z = 0.5;
    addRipple(x, y, z, 1.0);

    // Trigger wobble
    state.physics.wobbleIntensity += 0.3;
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

    addRipple(state.mouse.x, state.mouse.y, 0.5, 1.0);
    state.physics.wobbleIntensity += 0.3;
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

function toggleQuality() {
    CONFIG.highQuality = !CONFIG.highQuality;
    showStatus(CONFIG.highQuality ? 'High Quality Mode' : 'Performance Mode');

    // Recreate symbiote with new material
    if (state.symbiote) {
        state.scene.remove(state.symbiote);
        createSymbiote();
    }
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
        state.bass *= 0.95;
        state.mid *= 0.95;
        state.high *= 0.95;
        state.beat.intensity *= 0.9;
        for (let i = 0; i < state.subBands.length; i++) {
            state.subBands[i] *= 0.92;
        }
        state.hotspots.forEach(h => h.intensity *= CONFIG.hotspots.decay);
        return;
    }

    state.analyser.getByteFrequencyData(state.frequencyData);

    const bins = state.frequencyData.length;
    const bassEnd = Math.floor(bins * 0.08);
    const lowMidEnd = Math.floor(bins * 0.15);
    const midEnd = Math.floor(bins * 0.4);
    const highMidEnd = Math.floor(bins * 0.6);

    let bassSum = 0, midSum = 0, highSum = 0;
    let totalEnergy = 0;

    const bandSize = Math.floor(bins / 8);
    const bandSums = [0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < bins; i++) {
        const value = state.frequencyData[i] / 255;
        totalEnergy += value;

        if (i < bassEnd) bassSum += value;
        else if (i < midEnd) midSum += value;
        else highSum += value;

        const bandIndex = Math.min(7, Math.floor(i / bandSize));
        bandSums[bandIndex] += value;
    }

    const targetBass = (bassSum / bassEnd) * CONFIG.bassMultiplier;
    const targetMid = (midSum / (midEnd - bassEnd)) * CONFIG.midMultiplier;
    const targetHigh = (highSum / (bins - midEnd)) * CONFIG.highMultiplier;

    state.bass += (targetBass - state.bass) * 0.35;
    state.mid += (targetMid - state.mid) * 0.3;
    state.high += (targetHigh - state.high) * 0.4;

    for (let i = 0; i < 8; i++) {
        const targetBand = (bandSums[i] / bandSize) * 1.5;
        const smoothing = 0.25 + (i * 0.03);
        state.subBands[i] += (targetBand - state.subBands[i]) * smoothing;
    }

    state.beat.prevEnergy = state.beat.energy;
    state.beat.energy = totalEnergy / bins;

    const energyDelta = state.beat.energy - state.beat.prevEnergy;
    const beatThreshold = CONFIG.hotspots.beatThreshold * (1 - state.beat.energy * 0.3);

    state.beat.detected = energyDelta > beatThreshold && state.beat.energy > 0.3;

    if (state.beat.detected) {
        state.beat.intensity = Math.min(1.5, state.beat.intensity + energyDelta * CONFIG.beatDetection.sensitivity);

        if (CONFIG.hotspots.enabled) {
            triggerHotspotSpike();
        }

        // Trigger ripple on beat
        if (CONFIG.ripples.beatTrigger) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            addRipple(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi),
                state.beat.intensity * 0.8
            );
        }

        // Add wobble on beat
        state.physics.wobbleIntensity += state.beat.intensity * 0.2;
    }

    state.beat.intensity *= CONFIG.beatDetection.decayRate;

    state.hotspots.forEach(h => {
        h.intensity *= CONFIG.hotspots.decay;
    });
}

// ============================================
// Waveform Visualization
// ============================================
function drawWaveform() {
    if (!state.waveformCtx || !state.analyser) return;

    const width = state.waveformCanvas.width;
    const height = state.waveformCanvas.height;
    const ctx = state.waveformCtx;

    // Get time domain data
    const dataArray = new Uint8Array(state.analyser.fftSize);
    state.analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 2;

    // Match waveform color to symbiote material color
    let colorHex = 'ffffff';
    if (state.symbiote && state.symbiote.material && state.symbiote.material.color) {
        colorHex = state.symbiote.material.color.getHexString();
    }

    ctx.strokeStyle = `#${colorHex}`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `#${colorHex}`;

    ctx.beginPath();

    const sliceWidth = width * 1.0 / state.analyser.fftSize;
    let x = 0;

    for (let i = 0; i < state.analyser.fftSize; i++) {
        const v = dataArray[i] / 128.0; // 0..2
        const y = (v * height) / 2; // scale to canvas height

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
}

function initHotspots() {
    state.hotspots = [];
    for (let i = 0; i < CONFIG.hotspots.count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        state.hotspots.push({
            x: Math.sin(phi) * Math.cos(theta),
            y: Math.sin(phi) * Math.sin(theta),
            z: Math.cos(phi),
            intensity: 0,
            frequencyBand: i % 8,
            basePhase: Math.random() * Math.PI * 2,
        });
    }
}

function triggerHotspotSpike() {
    const spikesCount = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < spikesCount; i++) {
        const idx = Math.floor(Math.random() * state.hotspots.length);
        const hotspot = state.hotspots[idx];

        const bandEnergy = state.subBands[hotspot.frequencyBand];
        hotspot.intensity = Math.min(1.5, hotspot.intensity + CONFIG.hotspots.spikeStrength * (0.5 + bandEnergy));
    }
}

// ============================================
// Animation Loop
// ============================================
function animate() {
    requestAnimationFrame(animate);

    // Calculate delta time
    const currentTime = performance.now();
    state.deltaTime = (currentTime - state.lastTime) / 1000;
    state.lastTime = currentTime;

    // Skip updates if paused (but still render)
    if (!isPaused) {
        state.time += state.deltaTime;

        // Update systems
        analyzeAudio();
        updateJellyPhysics();
        updateRipples();
        updateChromatics();
        updateParticles();

        // Apply drag physics (legacy compatibility)
        state.drag.offsetX += state.drag.velocityX * 0.15;
        state.drag.offsetY += state.drag.velocityY * 0.15;
        state.drag.velocityX *= 0.85;
        state.drag.velocityY *= 0.85;
        state.drag.offsetX *= 0.92;
        state.drag.offsetY *= 0.92;

        // Update symbiote deformation
        updateSymbiote();

        // Rotate symbiote (with ease-in-out fluctuation)
        state.symbiote.rotation.y += CONFIG.rotationSpeed * (1 + 0.3 * Math.sin(state.time * 0.5));
        state.symbiote.rotation.x = Math.sin(state.time * 0.2) * 0.1;

        // Decay poke force
        state.poke.force *= CONFIG.pokeDecay;
    }

    // Render
    state.renderer.render(state.scene, state.camera);

    // Draw waveform overlay
    if (CONFIG.waveformEnabled) {
        drawWaveform();
    } else if (state.waveformCtx) {
        state.waveformCtx.clearRect(0, 0, state.waveformCanvas.width, state.waveformCanvas.height);
    }
}

function updateSymbiote() {
    const geometry = state.symbiote.geometry;
    const positions = geometry.attributes.position.array;
    const original = state.originalPositions;

    const t = state.time;
    const noiseConfig = CONFIG.noise;
    const physics = state.physics;

    // Global audio influence for overall size breathing
    // Global audio influence (Removed size breathing, fixed base scale)
    const globalBreathing = 1.0;

    // Wobble effect from physics
    const wobble = physics.wobbleIntensity * Math.sin(physics.wobblePhase);

    // Mouse influence
    const mouseInfluence = state.mouse.isOver ? CONFIG.mouseInfluence : 0;

    // Drag offset influence
    const dragMagnitude = Math.sqrt(state.drag.offsetX * state.drag.offsetX + state.drag.offsetY * state.drag.offsetY);

    for (let i = 0; i < positions.length; i += 3) {
        const ox = original[i];
        const oy = original[i + 1];
        const oz = original[i + 2];

        const length = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / length;
        const ny = oy / length;
        const nz = oz / length;

        // Multi-layered noise
        const bassNoise = noise.noise3D(
            nx * noiseConfig.bass.scale + t * noiseConfig.bass.speed,
            ny * noiseConfig.bass.scale + t * noiseConfig.bass.speed * 0.7,
            nz * noiseConfig.bass.scale
        );
        const bassDisplacement = bassNoise * noiseConfig.bass.amplitude * (0.3 + state.bass * 1.5);

        const midNoise = noise.noise3D(
            nx * noiseConfig.mid.scale + t * noiseConfig.mid.speed,
            ny * noiseConfig.mid.scale - t * noiseConfig.mid.speed * 0.5,
            nz * noiseConfig.mid.scale + t * noiseConfig.mid.speed * 0.3
        );
        const midDisplacement = midNoise * noiseConfig.mid.amplitude * (0.2 + state.mid * 1.2);

        const highNoise = noise.noise3D(
            nx * noiseConfig.high.scale + t * noiseConfig.high.speed,
            ny * noiseConfig.high.scale + t * noiseConfig.high.speed * 1.2,
            nz * noiseConfig.high.scale - t * noiseConfig.high.speed * 0.8
        );
        const highSpike = Math.max(0, highNoise) * noiseConfig.high.amplitude * (0.1 + state.high * 2.0);

        const detailNoise = noise.noise3D(
            nx * noiseConfig.detail.scale + t * noiseConfig.detail.speed * 0.5,
            ny * noiseConfig.detail.scale,
            nz * noiseConfig.detail.scale + t * noiseConfig.detail.speed
        );
        const detailDisplacement = detailNoise * noiseConfig.detail.amplitude;

        // Spatial frequency mapping
        let spatialModifier = 0;
        if (CONFIG.spatialMapping.enabled) {
            const verticalPos = ny;
            const bassRegion = Math.max(0, -verticalPos);
            const bassBoost = bassRegion * state.bass * CONFIG.spatialMapping.bassBottomBias;
            const highRegion = Math.max(0, verticalPos);
            const highBoost = highRegion * state.high * CONFIG.spatialMapping.highTopBias * 0.5;
            const midRegion = 1 - Math.abs(verticalPos);
            const midBoost = midRegion * state.mid * 0.3;
            spatialModifier = bassBoost + highBoost + midBoost;
        }

        // Hotspot spikes
        let hotspotDisplacement = 0;
        if (CONFIG.hotspots.enabled && state.hotspots.length > 0) {
            for (const hotspot of state.hotspots) {
                if (hotspot.intensity > 0.01) {
                    const dx = nx - hotspot.x;
                    const dy = ny - hotspot.y;
                    const dz = nz - hotspot.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    const influence = Math.exp(-dist * dist * 4);
                    const spikeNoise = noise.noise3D(
                        nx * 3 + hotspot.basePhase,
                        ny * 3 + t * 0.5,
                        nz * 3
                    );
                    hotspotDisplacement += hotspot.intensity * influence * (0.5 + Math.abs(spikeNoise) * 0.5);
                }
            }
        }

        // Sub-band detail
        let subBandDetail = 0;
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

        // Beat pulse
        // Beat pulse (Applied to noise, not global size)
        const beatPulse = state.beat.intensity * 0.2 * bassNoise;

        // Wobble displacement (jelly effect)
        const wobbleDisplacement = wobble * 0.1 * (1 + Math.sin(nx * 3 + ny * 2 + nz));

        // Ripple displacement
        const rippleDisplacement = calculateRippleDisplacement(nx, ny, nz);

        // Interaction effects
        let interactionDisplacement = 0;

        if (state.poke.force > 0.01) {
            interactionDisplacement += state.poke.force * bassNoise * 0.6;
        }

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

        if (mouseInfluence > 0) {
            const mouseDir = new THREE.Vector3(state.mouse.x, state.mouse.y, 0.5).normalize();
            const dot = nx * mouseDir.x + ny * mouseDir.y + nz * mouseDir.z;
            if (dot > 0) {
                interactionDisplacement += dot * mouseInfluence * 0.4;
            }
        }

        // Combine all layers
        const totalDisplacement =
            bassDisplacement +
            midDisplacement +
            highSpike +
            detailDisplacement +
            spatialModifier +
            hotspotDisplacement +
            subBandDetail +
            beatPulse +
            wobbleDisplacement +
            rippleDisplacement +
            interactionDisplacement;

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
