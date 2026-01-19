
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// --- CONFIGURATION ---
const MATERIALS = {
    'PLA': { density: 1.24, pricePerKg: 700 }, // g/cm3, TL
    'ABS': { density: 1.04, pricePerKg: 700 },
    'PETG': { density: 1.27, pricePerKg: 700 }
};

const LABOR_COST = 50; // Sabit Hizmet Bedeli (TL)

// --- STATE ---
let scene, camera, renderer, controls;
let currentMesh = null;
let debounceTimer = null;

// Global Model Data (Cura yerine Geometrik Hesaplama için)
let modelVolumeMm3 = 0;
let modelSurfaceAreaMm2 = 0;

// --- ELEMENTS ---
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    canvas: document.getElementById('three-canvas'),
    viewerContainer: document.getElementById('viewer-container'),
    materialSelect: document.getElementById('material-select'),
    infillSlider: document.getElementById('infill-slider'),
    infillValue: document.getElementById('infill-value'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    // Outputs
    dimLength: document.getElementById('dim-x'),
    dimWidth: document.getElementById('dim-y'),
    dimHeight: document.getElementById('dim-z'),
    volumeDisplay: document.getElementById('volume'),
    weightDisplay: document.getElementById('weight-display'),
    materialCostDisplay: document.getElementById('material-cost-display'),
    laborCostDisplay: document.getElementById('labor-cost-display'),
    totalPrice: document.getElementById('total-price'),
    loader: document.getElementById('loader'),
    changeModelBtn: document.getElementById('change-model-btn')
};

// --- INITIALIZATION ---
initThreeJS();
setupEventListeners();

function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background
    scene.fog = new THREE.Fog(0x000000, 200, 1000);

    // Camera
    const aspect = elements.viewerContainer.clientWidth / elements.viewerContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    camera.position.set(150, 150, 150);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: true });
    renderer.setSize(elements.viewerContainer.clientWidth, elements.viewerContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Grid (Zemin)
    const gridHelper = new THREE.GridHelper(400, 40, 0x333333, 0x444444); // Darker grid
    scene.add(gridHelper);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Resize Handle
    window.addEventListener('resize', () => {
        const w = elements.viewerContainer.clientWidth;
        const h = elements.viewerContainer.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
}

function setupEventListeners() {
    // File Upload
    elements.dropzone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => loadFile(e.target.files[0]));

    // Drag & Drop
    elements.dropzone.addEventListener('dragover', (e) => { e.preventDefault(); elements.dropzone.classList.add('dragover'); });
    elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('dragover'));
    elements.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
    });

    // Infill Slider
    elements.infillSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        elements.infillValue.textContent = val + '%';

        // Update presets
        elements.presetBtns.forEach(btn =>
            btn.classList.toggle('active', parseInt(btn.dataset.value) == val)
        );

        // Instant Calculation (Fast Debounce)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(calculateCost, 100); // 100ms
    });

    // Material Select
    elements.materialSelect.addEventListener('change', calculateCost);

    // Presets
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.infillSlider.value = btn.dataset.value;
            elements.infillSlider.dispatchEvent(new Event('input'));
        });
    });

    // Change Model Button
    if (elements.changeModelBtn) {
        elements.changeModelBtn.addEventListener('click', () => {
            elements.fileInput.click();
        });
    }
}

// --- LOGIC ---

function loadFile(file) {
    if (!file) return;

    showLoader(true, "Model Yükleniyor...");

    const reader = new FileReader();
    reader.onload = function (e) {
        const buffer = e.target.result;
        const loader = new STLLoader();
        const geometry = loader.parse(buffer);

        // 1. Center & Fix Position
        geometry.center();
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);

        // UI Update (Dimensions)
        elements.dimLength.textContent = size.x.toFixed(1);
        elements.dimHeight.textContent = size.y.toFixed(1);
        elements.dimWidth.textContent = size.z.toFixed(1);

        // 2. Pre-calculate Geometric Data for "Cura-like" Estimation
        modelVolumeMm3 = getGeometricVolume(geometry);
        modelSurfaceAreaMm2 = getGeometricSurfaceArea(geometry);

        const volumeCm3 = modelVolumeMm3 / 1000;
        elements.volumeDisplay.textContent = volumeCm3.toFixed(2) + ' cm³';

        // 3. Setup Mesh
        if (currentMesh) {
            scene.remove(currentMesh);
            currentMesh.geometry.dispose();
            currentMesh.material.dispose();
        }

        const material = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            roughness: 0.5,
            metalness: 0.1
        });

        currentMesh = new THREE.Mesh(geometry, material);
        currentMesh.castShadow = true;
        currentMesh.receiveShadow = true;

        // Place on floor (Y=0)
        currentMesh.position.y = size.y / 2;

        scene.add(currentMesh);
        fitCamera(size);

        // UI States
        elements.canvas.classList.add('visible');
        elements.dropzone.classList.add('hidden');
        if (elements.changeModelBtn) elements.changeModelBtn.classList.add('visible');

        // Initial Calculation
        calculateCost();
    };
    reader.readAsArrayBuffer(file);
}

function calculateCost() {
    // Veri yoksa çık
    if (modelVolumeMm3 === 0) return;

    showLoader(true);

    try {
        const infill = parseInt(elements.infillSlider.value) / 100;
        const material = MATERIALS[elements.materialSelect.value];
        const laborCost = LABOR_COST;

        // --- Geometrik Tahmin Algoritması (Cura Alternatifi) ---
        // Kabuk Kalınlığı: 0.8mm (2 Duvar)
        const shellThickness = 0.8;

        // Kabuk Hacmi (Yaklaşık): Yüzey Alanı * Kalınlık
        const shellVolumeMm3 = modelSurfaceAreaMm2 * shellThickness;

        // İç Hacim (Infill uygulanacak alan)
        let interiorVolumeMm3 = modelVolumeMm3 - shellVolumeMm3;
        if (interiorVolumeMm3 < 0) interiorVolumeMm3 = 0; // İnce modeller için koruma

        // Toplam Dolu Hacim
        const filledVolumeMm3 = shellVolumeMm3 + (interiorVolumeMm3 * infill);

        // Ağırlık Hesabı (mm3 -> cm3 -> g)
        const volumeCm3 = filledVolumeMm3 / 1000;
        const weight = volumeCm3 * material.density;

        // Fiyat
        const materialCost = weight * (material.pricePerKg / 1000);
        const totalCost = materialCost + laborCost;

        // UI Update
        elements.weightDisplay.textContent = Math.round(weight) + ' g';
        elements.materialCostDisplay.textContent = materialCost.toFixed(2) + ' ₺';
        elements.laborCostDisplay.textContent = laborCost + ' ₺';
        elements.totalPrice.textContent = Math.ceil(totalCost) + ' ₺';

    } catch (e) {
        console.error("Hesaplama hatası:", e);
        elements.totalPrice.textContent = "Hata!";
    } finally {
        showLoader(false);
    }
}

// --- HELPERS ---

function showLoader(show, text = "Yükleniyor...") {
    if (elements.loader) {
        elements.loader.style.display = show ? 'block' : 'none';
    }
    // Fiyat metnini bozmaya gerek yok, loader animasyonu yeterli
}

function getGeometricVolume(geometry) {
    const pos = geometry.attributes.position;
    if (!pos) return 0;

    let sum = 0;
    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();

    for (let i = 0; i < pos.count; i += 3) {
        p1.fromBufferAttribute(pos, i);
        p2.fromBufferAttribute(pos, i + 1);
        p3.fromBufferAttribute(pos, i + 2);
        sum += p1.dot(p2.cross(p3));
    }
    return Math.abs(sum / 6.0); // mm3
}

function getGeometricSurfaceArea(geometry) {
    const pos = geometry.attributes.position;
    if (!pos) return 0;

    let area = 0;
    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3();

    for (let i = 0; i < pos.count; i += 3) {
        p1.fromBufferAttribute(pos, i);
        p2.fromBufferAttribute(pos, i + 1);
        p3.fromBufferAttribute(pos, i + 2);

        ab.subVectors(p2, p1);
        ac.subVectors(p3, p1);
        area += ab.cross(ac).length() / 2;
    }
    return area; // mm2
}

function fitCamera(size) {
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);

    const dist = maxDim * 2.0;
    camera.position.set(dist, dist, dist);
    camera.lookAt(0, size.y / 2, 0);
    controls.target.set(0, size.y / 2, 0);
    controls.update();
}
