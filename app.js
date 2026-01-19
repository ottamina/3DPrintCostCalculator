
import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls?deps=three@0.160.0';
import { STLLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/STLLoader?deps=three@0.160.0';

// --- CONFIGURATION ---
const MATERIALS = {
    'PLA': { density: 1.24, pricePerKg: 700 }, // g/cm3, TL
    'ABS': { density: 1.04, pricePerKg: 700 },
    'PETG': { density: 1.27, pricePerKg: 700 }
};

const LABOR_COST = 50; // Sabit İşçilik (TL)

// --- STATE ---
let scene, camera, renderer, controls;
let currentMesh = null;
let rawStlBuffer = null; // Cura için binary data
let debounceTimer = null;

// --- ELEMENTS ---
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    canvas: document.getElementById('model-viewer'),
    viewerContainer: document.getElementById('viewer-container'),
    materialSelect: document.getElementById('material-select'),
    infillSlider: document.getElementById('infill-slider'),
    infillValue: document.getElementById('infill-value'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    // Outputs
    dimLength: document.getElementById('dim-length'),
    dimWidth: document.getElementById('dim-width'),
    dimHeight: document.getElementById('dim-height'),
    volumeDisplay: document.getElementById('volume-display'),
    weightDisplay: document.getElementById('weight-display'),
    materialCostDisplay: document.getElementById('material-cost'),
    laborCostDisplay: document.getElementById('labor-cost'),
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
    scene.background = new THREE.Color(0xf5f5f7); // Light gray
    scene.fog = new THREE.Fog(0xf5f5f7, 200, 1000);

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
    const gridHelper = new THREE.GridHelper(400, 40, 0xcccccc, 0xe5e5e5);
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

        // Debounced Calculation
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(calculateCost, 300); // 300ms gecikme
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
        rawStlBuffer = e.target.result; // Keep for Cura

        const loader = new STLLoader();
        const geometry = loader.parse(rawStlBuffer);

        // 1. Center Geometry & Fix Position
        geometry.center(); // Geometriyi (0,0,0)'a ortala
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);

        // UI Update
        elements.dimLength.textContent = size.x.toFixed(1);
        elements.dimHeight.textContent = size.y.toFixed(1);
        elements.dimWidth.textContent = size.z.toFixed(1);

        const volumeCm3 = getGeometricVolume(geometry) / 1000;
        elements.volumeDisplay.textContent = volumeCm3.toFixed(2) + ' cm³';

        // 2. Setup Mesh
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

        // Zemin hizalama ( Alt nokta 0'a, yani Y pozitif alana)
        // geometry.center() sonrası Y min = -size.y/2.
        // Onu 0 yapmak için mesh'i size.y/2 kadar kaldır.
        currentMesh.position.y = size.y / 2;

        scene.add(currentMesh);

        // Camera Fit
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

async function calculateCost() {
    if (!rawStlBuffer) return;

    showLoader(true, "Hesaplanıyor...");

    try {
        // --- 1. Ağırlık Hesabı (Cura WASM) ---
        // Dinamik import ile yükle (sadece gerektiğinde)
        const { CuraWASM } = await import('https://esm.sh/cura-wasm');

        const slicer = new CuraWASM({ definition: 'ultimaker_s5' });
        await slicer.loadModel(rawStlBuffer, 'model.stl');

        const settings = {
            // Tuned Settings (Clean & Linear)
            layer_height: 0.20,
            wall_line_count: 2,
            top_layers: 4,
            bottom_layers: 4,
            infill_sparse_density: parseInt(elements.infillSlider.value),
            infill_pattern: 'grid',      // Stabil model
            gradual_infill_steps: 0,     // Lineerlik için
            minimum_infill_area: 0,
            support_enable: false,       // Destek yok
            support_infill_rate: 0,
            infill_overlap: 5,
            material_density: MATERIALS[elements.materialSelect.value].density,
            speed_print: 60
        };

        const { metadata } = await slicer.slice(settings);

        let weight = metadata.filament_weight;
        if (!weight && metadata.filament_amount) {
            // Fallback: mm3 -> gram
            const rho = MATERIALS[elements.materialSelect.value].density;
            weight = (metadata.filament_amount / 1000) * rho;
        }

        // --- 2. Fiyat Hesabı ---
        const materialData = MATERIALS[elements.materialSelect.value];
        const materialCost = weight * (materialData.pricePerKg / 1000);
        const total = materialCost + LABOR_COST;

        // --- 3. UI Update ---
        elements.weightDisplay.textContent = Math.round(weight) + ' g';
        elements.materialCostDisplay.textContent = materialCost.toFixed(2) + ' ₺';
        elements.laborCostDisplay.textContent = LABOR_COST + ' ₺';
        elements.totalPrice.textContent = Math.ceil(total) + ' ₺';

    } catch (err) {
        console.error("Hesaplama Hatası:", err);
        elements.totalPrice.textContent = "Hata!";
    } finally {
        showLoader(false);
    }
}

// --- HELPERS ---

function showLoader(show, text = "Yükleniyor...") {
    if (elements.loader) {
        elements.loader.style.display = show ? 'block' : 'none';
        // Text update opsiyonel
    }
    if (elements.totalPrice && show) elements.totalPrice.textContent = text;
}

function getGeometricVolume(geometry) {
    // Basit hacim hesabı (Three.js için Tetrahedon yöntemi)
    let position = geometry.attributes.position;
    let faces = position.count / 3;
    let sum = 0;
    let p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();

    for (let i = 0; i < faces; i++) {
        p1.fromBufferAttribute(position, i * 3 + 0);
        p2.fromBufferAttribute(position, i * 3 + 1);
        p3.fromBufferAttribute(position, i * 3 + 2);
        sum += p1.dot(p2.cross(p3));
    }
    return Math.abs(sum / 6.0);
}

function fitCamera(size) {
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2)); // Biraz yaklaştır

    // İzometrik bakış
    const dist = maxDim * 2.5;
    camera.position.set(dist, dist, dist);
    camera.lookAt(0, size.y / 2, 0); // Modelin ortasına bak
    controls.target.set(0, size.y / 2, 0);
    controls.update();
}
