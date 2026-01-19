/**
 * 3D Print Cost Calculator
 * STL dosyalarını yükleyip baskı maliyetini hesaplayan uygulama
 */

// Material Data 
const MATERIALS = {
    PLA: { density: 1.24, pricePerKg: 700 },
    ABS: { density: 1.04, pricePerKg: 700 },
    PETG: { density: 1.27, pricePerKg: 700 }
};

//  DOM Elements 
const elements = {
    viewerContainer: document.getElementById('viewer-container'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    canvas: document.getElementById('three-canvas'),
    dimensionsCard: document.getElementById('dimensions-card'),
    dimX: document.getElementById('dim-x'),
    dimY: document.getElementById('dim-y'),
    dimZ: document.getElementById('dim-z'),
    volume: document.getElementById('volume'),
    materialSelect: document.getElementById('material-select'),
    infillSlider: document.getElementById('infill-slider'),
    infillValue: document.getElementById('infill-value'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    qualityBtns: document.querySelectorAll('.quality-btn'),
    laborCostValue: document.getElementById('labor-cost-value'),
    weightDisplay: document.getElementById('weight-display'),
    materialCostDisplay: document.getElementById('material-cost-display'),
    laborCostDisplay: document.getElementById('labor-cost-display'),
    totalPrice: document.getElementById('total-price'),
    loader: document.getElementById('loader'),
    // Print settings (hidden, controlled by quality profile)
    wallCount: document.getElementById('wall-count'),
    layerHeight: document.getElementById('layer-height'),
    lineWidth: document.getElementById('line-width'),
    topLayers: document.getElementById('top-layers'),
    bottomLayers: document.getElementById('bottom-layers')
};

// Quality Profile Presets
const QUALITY_PROFILES = {
    low: {
        name: 'Düşük',
        layerHeight: 0.28,
        wallCount: 2,
        lineWidth: 0.5,
        topLayers: 3,
        bottomLayers: 3,
        laborCost: 20
    },
    standard: {
        name: 'Standart',
        layerHeight: 0.20,
        wallCount: 3,
        lineWidth: 0.4,
        topLayers: 4,
        bottomLayers: 4,
        laborCost: 40
    },
    dynamic: {
        name: 'Dinamik',
        layerHeight: 0.16,
        wallCount: 4,
        lineWidth: 0.4,
        topLayers: 5,
        bottomLayers: 5,
        laborCost: 60
    },
    super: {
        name: 'Super',
        layerHeight: 0.12,
        wallCount: 5,
        lineWidth: 0.4,
        topLayers: 6,
        bottomLayers: 6,
        laborCost: 100
    }
};

let currentQuality = 'standard';

// Three.js Setup 
let scene, camera, renderer, controls, currentMesh;
let modelVolume = 0;
let modelSurfaceArea = 0;
let modelDimensions = { x: 0, y: 0, z: 0 };

function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12121a);

    // Camera
    const aspect = elements.viewerContainer.clientWidth / elements.viewerContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    camera.position.set(100, 100, 200);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: elements.canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(elements.viewerContainer.clientWidth, elements.viewerContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    fillLight.position.set(-100, 50, -100);
    scene.add(fillLight);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x6366f1, 0x2a2a3a);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 1000;

    // Animation loop
    animate();

    // Resize handler
    window.addEventListener('resize', onWindowResize);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const width = elements.viewerContainer.clientWidth;
    const height = elements.viewerContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// ===== STL Loading =====
function loadSTL(file) {
    showLoader(true);

    const reader = new FileReader();
    reader.onload = function (event) {
        const contents = event.target.result;

        const loader = new THREE.STLLoader();
        const geometry = loader.parse(contents);

        // Remove existing mesh
        if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
        }

        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            metalness: 0.1,
            roughness: 0.6,
            flatShading: false
        });

        // Create mesh
        currentMesh = new THREE.Mesh(geometry, material);
        currentMesh.castShadow = true;
        currentMesh.receiveShadow = true;

        // Center the model
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        currentMesh.position.sub(center);

        // Calculate dimensions
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        // Update UI with dimensions
        updateDimensions(size.x, size.y, size.z);

        // Calculate volume
        modelVolume = calculateVolume(geometry);
        elements.volume.textContent = (modelVolume / 1000).toFixed(2) + ' cm³';

        // Calculate surface area for shell estimation
        modelSurfaceArea = calculateSurfaceArea(geometry);

        // Store dimensions
        modelDimensions = { x: size.x, y: size.y, z: size.z };

        // Position model on grid
        currentMesh.position.y = size.y / 2;

        scene.add(currentMesh);

        // Fit camera to model
        fitCameraToObject(currentMesh);

        // Show canvas, hide dropzone
        elements.canvas.classList.add('visible');
        elements.dropzone.classList.add('hidden');
        elements.dimensionsCard.classList.add('active');

        // Show change model button
        document.getElementById('change-model-btn').classList.add('visible');

        // Calculate cost
        calculateCost();

        showLoader(false);
    };

    reader.readAsArrayBuffer(file);
}

function fitCameraToObject(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;

    camera.position.set(cameraDistance * 0.5, cameraDistance * 0.5, cameraDistance * 0.8);
    controls.target.set(0, size.y / 2, 0);
    controls.update();
}

// ===== Volume Calculation (Signed Tetrahedron Method) =====
function calculateVolume(geometry) {
    let volume = 0;
    const positions = geometry.attributes.position.array;

    // Iterate through each triangle
    for (let i = 0; i < positions.length; i += 9) {
        // Get vertices
        const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

        // Calculate signed volume of tetrahedron
        volume += signedVolumeOfTriangle(v1, v2, v3);
    }

    return Math.abs(volume);
}

function signedVolumeOfTriangle(p1, p2, p3) {
    return p1.dot(p2.clone().cross(p3)) / 6.0;
}

// ===== Surface Area Calculation =====
function calculateSurfaceArea(geometry) {
    let area = 0;
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 9) {
        const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
        const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

        // Triangle area = 0.5 * |AB x AC|
        const ab = v2.clone().sub(v1);
        const ac = v3.clone().sub(v1);
        area += ab.cross(ac).length() * 0.5;
    }

    return area;
}

// ===== Dimensions Update =====
function updateDimensions(x, y, z) {
    elements.dimX.textContent = x.toFixed(2) + ' mm';
    elements.dimY.textContent = y.toFixed(2) + ' mm';
    elements.dimZ.textContent = z.toFixed(2) + ' mm';
}

// ===== Cost Calculation (Cura-like algorithm) =====
// Cura uses: Material Volume = Shell Volume + (Interior Volume × Infill)
// Shell Volume = Surface Area × Wall Thickness (approximated)
// Interior Volume = Total Volume - Shell Volume
function calculateCost() {
    if (modelVolume === 0) {
        elements.weightDisplay.textContent = '-- g';
        elements.materialCostDisplay.textContent = '-- ₺';
        elements.totalPrice.textContent = '-- ₺';
        return;
    }

    // Get selected material
    const materialType = elements.materialSelect.value;
    const material = MATERIALS[materialType];

    // Get infill percentage
    const infill = parseInt(elements.infillSlider.value) / 100;

    // Get print settings from current quality profile
    const profile = QUALITY_PROFILES[currentQuality];
    const wallCount = profile.wallCount;
    const layerHeight = profile.layerHeight;
    const lineWidth = profile.lineWidth;
    const topLayers = profile.topLayers;
    const bottomLayers = profile.bottomLayers;
    const laborCost = profile.laborCost;

    // Calculate shell thicknesses in mm
    const wallThickness = wallCount * lineWidth;
    const topBottomThickness = (topLayers + bottomLayers) * layerHeight;

    // Cura-like shell volume calculation:
    // Shell volume = Surface Area × Average Shell Thickness
    // We use wall thickness as primary, adjusted for top/bottom
    const avgShellThickness = (wallThickness * 2 + topBottomThickness) / 3;

    // Shell volume from surface area (mm³)
    // Surface area is already calculated during model load
    let shellVolume = modelSurfaceArea * avgShellThickness;

    // Clamp shell volume to not exceed total volume (for small/thin models)
    shellVolume = Math.min(shellVolume, modelVolume * 0.95);

    // Interior volume is what remains after shell
    const interiorVolume = Math.max(0, modelVolume - shellVolume);

    // Total material volume: full shell + infill portion of interior
    const materialVolume = shellVolume + (interiorVolume * infill);

    // Convert mm³ to cm³ and calculate weight in grams
    const volumeCm3 = materialVolume / 1000;
    const weight = volumeCm3 * material.density;

    // Calculate material cost
    const pricePerGram = material.pricePerKg / 1000;
    const materialCost = weight * pricePerGram;

    // Calculate total
    const totalCost = materialCost + laborCost;

    // Update UI
    elements.weightDisplay.textContent = weight.toFixed(2) + ' g';
    elements.materialCostDisplay.textContent = materialCost.toFixed(2) + ' ₺';
    elements.laborCostDisplay.textContent = laborCost.toFixed(2) + ' ₺';
    elements.totalPrice.textContent = totalCost.toFixed(2) + ' ₺';
}

// ===== Loader =====
function showLoader(show) {
    if (show) {
        elements.loader.classList.add('visible');
    } else {
        elements.loader.classList.remove('visible');
    }
}

// ===== Event Listeners =====

// Drag and drop
elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
});

elements.dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
});

elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith('.stl')) {
        loadSTL(files[0]);
    }
});

// Click to upload
elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
});

// Change model button
const changeModelBtn = document.getElementById('change-model-btn');
changeModelBtn.addEventListener('click', () => {
    elements.fileInput.click();
});

elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        loadSTL(e.target.files[0]);
    }
});

// Material select
elements.materialSelect.addEventListener('change', calculateCost);

// Infill slider
elements.infillSlider.addEventListener('input', (e) => {
    elements.infillValue.textContent = e.target.value + '%';

    // Update active preset button
    elements.presetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === parseInt(e.target.value));
    });

    calculateCost();
});

// Preset buttons
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = parseInt(btn.dataset.value);
        elements.infillSlider.value = value;
        elements.infillValue.textContent = value + '%';

        elements.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        calculateCost();
    });
});

// Quality profile buttons
function applyQualityProfile(quality) {
    const profile = QUALITY_PROFILES[quality];
    if (!profile) return;

    currentQuality = quality;

    // Update hidden inputs
    elements.layerHeight.value = profile.layerHeight;
    elements.wallCount.value = profile.wallCount;
    elements.lineWidth.value = profile.lineWidth;
    elements.topLayers.value = profile.topLayers;
    elements.bottomLayers.value = profile.bottomLayers;
    elements.laborCostValue.value = profile.laborCost;

    // Update labor cost display in price breakdown
    elements.laborCostDisplay.textContent = profile.laborCost + ' ₺';

    // Update active button
    elements.qualityBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.quality === quality);
    });

    calculateCost();
}

elements.qualityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        applyQualityProfile(btn.dataset.quality);
    });
});

// ===== Theme Toggle =====
const themeToggle = document.getElementById('theme-toggle');

function updateTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update Three.js scene background
    if (scene) {
        const bgColor = theme === 'light' ? 0xe2e8f0 : 0x12121a;
        scene.background = new THREE.Color(bgColor);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
}

// Theme toggle button click
themeToggle.addEventListener('click', toggleTheme);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    updateTheme(savedTheme);

    initThreeJS();

    // Apply saved theme to Three.js after init
    const bgColor = savedTheme === 'light' ? 0xe2e8f0 : 0x12121a;
    if (scene) {
        scene.background = new THREE.Color(bgColor);
    }

    // Apply initial quality profile
    applyQualityProfile('standard');
});
