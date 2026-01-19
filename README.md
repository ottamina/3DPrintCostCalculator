# 🖨️ 3D Print Cost Calculator

A modern, browser-based 3D print cost calculator that uses **Cura-like approach** to estimate filament weight and printing costs. Simply drag & drop your STL file and get instant cost predictions!

![3D Print Cost Calculator](https://img.shields.io/badge/version-1.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Made with](https://img.shields.io/badge/made%20with-Three.js-black)

## ✨ Features

- 🎯 **Simple Cura-like Calculations** - Weight = Volume × Infill × Density
- 📁 **Drag & Drop STL Upload** - Simply drag your STL file or click to browse
- 🎨 **Interactive 3D Viewer** - Rotate, zoom, and inspect your model in real-time
- 🌙 **Dark/Light Theme** - Beautiful UI with theme switching
- 🎚️ **4 Quality Profiles** - Low, Standard, Dynamic, Super with dynamic labor cost
- 💰 **Multiple Materials** - PLA, ABS, PETG with customizable prices
- 📱 **Responsive Design** - Works on desktop and mobile

## 🎚️ Quality Profiles

Four quality profiles with automatically calculated labor costs:

| Profile | Layer Height | Labor Cost |
|---------|--------------|------------|
| **Düşük** | 0.28 mm | 20 ₺ |
| **Standart** | 0.20 mm | 28 ₺ |
| **Dinamik** | 0.16 mm | 35 ₺ |
| **Super** | 0.12 mm | 47 ₺ |

> **Note:** Labor cost is dynamically calculated based on layer height. Finer layers = more layers = higher labor cost.

## 🧮 How It Calculates

Simple and accurate weight calculation using the Cura approach:

```
Weight = (Volume / 1000) × Infill% × Material Density
```

| Variable | Description |
|----------|-------------|
| **Volume** | Model volume in mm³ (calculated using signed tetrahedron method) |
| **Infill** | Fill percentage (5% - 100%) |
| **Density** | Material density (PLA: 1.24, ABS: 1.04, PETG: 1.27 g/cm³) |

Labor cost is calculated dynamically:
```
Labor Cost = Base Cost × (0.28 / Layer Height)
```

## 🚀 Getting Started

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/ottamina/3DPrintCostCalculator.git
   ```
2. Open `index.html` in your browser
3. Drag & drop an STL file
4. Select a quality profile and see the cost!

### No Installation Required
This is a pure client-side application. Just open `index.html` in any modern browser!

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **Three.js** | 3D rendering and STL parsing |
| **JavaScript (ES6+)** | Application logic |
| **HTML5 & CSS3** | Modern UI with animations |
| **STL Parser** | Binary/ASCII STL file support |

## 📐 Volume Calculation

### Signed Tetrahedron Method
The volume is calculated using the signed tetrahedron method:
```javascript
V = Σ (p1 · (p2 × p3)) / 6
```
This works correctly even for complex models with holes and cavities.

## 📦 Project Structure

```
3DPrintCostCalculator/
├── index.html      # Main HTML file
├── styles.css      # Styling with dark/light themes
├── app.js          # Application logic & calculations
└── README.md       # This file
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Osman Teksoy**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/osmanteksoy/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ottamina)

---

⭐ If you find this project useful, please consider giving it a star!
