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
    weightDisplay: document.getElementById('weight-display'),
    materialCostDisplay: document.getElementById('material-cost-display'),
    laborCostDisplay: document.getElementById('labor-cost-display'),
    totalPrice: document.getElementById('total-price'),
    loader: document.getElementById('loader')
};

// 3. İşçilik Hesabı (SABİT 50 TL)
// calculateLaborCost fonksiyonu kaldırıldı, recalculateMatrix içinde sabit değer kullanılıyor.


// Three.js Setup 
let scene, camera, renderer, controls, currentMesh;
let modelVolume = 0;
let modelSurfaceArea = 0;
let modelDimensions = { x: 0, y: 0, z: 0 };
let rawStlBuffer = null; // Ham STL verisi (Slicing için gerekli)

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
        rawStlBuffer = contents; // Slicing için sakla

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

// ===== Logic & Calculations =====

/**
 * Ana hesaplama fonksiyonu (Orchestrator)
 * Ağırlığı ve işçiliği ayrı ayrı hesaplayıp UI'ı günceller.
 */
async function recalculateMatrix() {
    if (modelVolume === 0) {
        updateUIDisplay(0, 0, 0, 0);
        return;
    }

    showLoader(true);
    elements.totalPrice.textContent = 'Hesaplanıyor...';

    try {
        // 1. Ağırlık Hesabı (Kaliteden Bağımsız - Standart Ayarlar)
        // Önce Cura WASM dene, olmazsa Geometrik Tahmin yap
        let weight = 0;
        try {
            weight = await getWeightFromCura();
        } catch (e) {
            console.warn("Cura hatası, tahmini hesaplamaya geçiliyor:", e);
            weight = getWeightFromEstimation();
        }

        // 2. Malzeme Maliyeti
        const material = MATERIALS[elements.materialSelect.value];
        const pricePerGram = material.pricePerKg / 1000;
        const materialCost = weight * pricePerGram;

        // 3. İşçilik Hesabı (SABİT)
        const laborCost = 50;

        // 4. Toplam
        const totalCost = materialCost + laborCost;

        updateUIDisplay(weight, materialCost, laborCost, totalCost);

    } catch (error) {
        console.error("Hesaplama hatası:", error);
        elements.totalPrice.textContent = 'Hata!';
    } finally {
        showLoader(false);
    }
}

/**
 * Yöntem A: Cura WASM ile Ağırlık Hesabı
 * Her zaman standart ayarlarla (0.2mm, 3 duvar) çalışır.
 */
async function getWeightFromCura() {
    if (!rawStlBuffer) throw new Error("STL verisi yok");

    // Kütüphaneyi yükle
    const { CuraWASM } = await import('https://esm.sh/cura-wasm');

    // Slicer oluştur
    const slicer = new CuraWASM({
        definition: 'ultimaker_s5',
    });

    await slicer.loadModel(rawStlBuffer, 'model.stl');

    // SABİT STANDART AYARLAR (Masaüstü Cura Standartlarına Ayarlandı)
    const settings = {
        layer_height: 0.20,
        wall_line_count: 2,     // 3 -> 2 (Standart)
        top_layers: 4,
        bottom_layers: 4,
        infill_sparse_density: parseInt(elements.infillSlider.value),
        infill_line_distance: 0,
        infill_pattern: 'grid', // Infill pattern eklendi
        material_density: MATERIALS[elements.materialSelect.value].density,
        speed_print: 60,
    };

    console.log("Slicing with settings:", settings);

    const { metadata } = await slicer.slice(settings);

    // Convert to Grams
    if (metadata.filament_weight) {
        return metadata.filament_weight;
    } else if (metadata.filament_amount) {
        const material = MATERIALS[elements.materialSelect.value];
        const volumeCm3 = metadata.filament_amount / 1000;
        return volumeCm3 * material.density;
    } else {
        throw new Error("Metadata okunamadı");
    }
}

/**
 * Yöntem B: Geometrik Tahmin ile Ağırlık Hesabı (Fallback)
 * Her zaman standart ayarlarla (0.2mm, 3 duvar) çalışır.
 */
function getWeightFromEstimation() {
    const infill = parseInt(elements.infillSlider.value) / 100;
    const material = MATERIALS[elements.materialSelect.value];

    // SABİT STANDART AYARLAR
    const nozzleSize = 0.4;
    const fixedWallCount = 2;
    const fixedLayerHeight = 0.20;
    const fixedTopLayers = 4;
    const fixedBottomLayers = 4;

    // Kabuk Hacmi Hesabı
    const wallThick = fixedWallCount * nozzleSize;
    const topThick = fixedTopLayers * fixedLayerHeight;
    const bottomThick = fixedBottomLayers * fixedLayerHeight;
    const avgShellThick = (wallThick + topThick + bottomThick) / 2;

    let shellVolume = modelSurfaceArea * avgShellThick;
    if (shellVolume > modelVolume) shellVolume = modelVolume;

    // Malzeme Hacmi
    const interiorVolume = Math.max(0, modelVolume - shellVolume);
    const materialVolume = shellVolume + (interiorVolume * infill); // Kabuk %100, İç %Infill

    const volumeCm3 = materialVolume / 1000;
    return volumeCm3 * material.density;
}

// UI Yardımcısı
function updateUIDisplay(weight, materialCost, laborCost, totalCost) {
    elements.weightDisplay.textContent = weight.toFixed(2) + ' g';
    elements.materialCostDisplay.textContent = materialCost.toFixed(2) + ' ₺';
    elements.laborCostDisplay.textContent = laborCost.toFixed(2) + ' ₺';
    elements.totalPrice.textContent = totalCost.toFixed(2) + ' ₺';
}

// İşçilik fonksiyonu kaldırıldı (Sabit 50 TL)

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
elements.materialSelect.addEventListener('change', recalculateMatrix);

// Infill slider (Debounce eklendi)
let debounceTimer;
elements.infillSlider.addEventListener('input', (e) => {
    elements.infillValue.textContent = e.target.value + '%';

    // Update active preset button
    elements.presetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === parseInt(e.target.value));
    });

    // Hesaplamayı gecikmeli başlat (Performans için)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        recalculateMatrix();
    }, 800);
});

// Preset buttons
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = parseInt(btn.dataset.value);
        elements.infillSlider.value = value;
        elements.infillValue.textContent = value + '%';

        elements.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        recalculateMatrix();
    });
});

// Quality profile buttons listener removed


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

    // Apply initial quality profile removed

});
