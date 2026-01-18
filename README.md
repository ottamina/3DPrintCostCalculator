# 🖨️ 3D Print Cost Calculator

A modern, browser-based 3D print cost calculator that uses **Cura-like algorithms** to accurately estimate filament weight and printing costs. Simply drag & drop your STL file and get instant cost predictions!

![3D Print Cost Calculator](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Made with](https://img.shields.io/badge/made%20with-Three.js-black)

## ✨ Features

- 🎯 **Accurate Cura-like Calculations** - Uses shell-based algorithm accounting for walls, top/bottom layers
- 📁 **Drag & Drop STL Upload** - Simply drag your STL file or click to browse
- 🎨 **Interactive 3D Viewer** - Rotate, zoom, and inspect your model in real-time
- 🌙 **Dark/Light Theme** - Beautiful UI with theme switching
- ⚙️ **Customizable Print Settings**:
  - Wall count
  - Layer height
  - Line width
  - Top/Bottom layers
  - Infill percentage
- 💰 **Multiple Materials** - PLA, ABS, PETG with customizable prices
- 📱 **Responsive Design** - Works on desktop and mobile

## 🧮 How It Calculates

Unlike simple calculators that just multiply `Volume × Density × Infill%`, this calculator uses a **shell-based algorithm** similar to Cura:

```
Shell Volume = (Surface Area × Wall Thickness) + (XY Area × Top/Bottom Thickness)
Interior Volume = Total Volume - Shell Volume
Material Volume = Shell Volume × 100% + Interior Volume × Infill%
Weight = Material Volume × Material Density
```

This provides much more accurate estimates because:
- **Walls are always 100% solid** (not affected by infill)
- **Top/Bottom layers are 100% solid**
- **Only the interior uses infill percentage**

## 🚀 Getting Started

### Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/ottamina/3DPrintCostCalculator.git
   ```
2. Open `index.html` in your browser
3. Drag & drop an STL file
4. Adjust settings and see the cost!

### No Installation Required
This is a pure client-side application. Just open `index.html` in any modern browser!

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **Three.js** | 3D rendering and STL parsing |
| **JavaScript (ES6+)** | Application logic |
| **HTML5 & CSS3** | Modern UI with animations |
| **STL Parser** | Binary/ASCII STL file support |

## 📐 Volume & Surface Area Calculation

### Signed Tetrahedron Method (Volume)
The volume is calculated using the signed tetrahedron method:
```javascript
V = Σ (p1 · (p2 × p3)) / 6
```
This works correctly even for complex models with holes and cavities.

### Triangle Area Sum (Surface Area)
Surface area is calculated by summing all triangle areas:
```javascript
A = Σ 0.5 × |AB × AC|
```

## 📦 Project Structure

```
3DPrintCostCalculator/
├── index.html      # Main HTML file
├── styles.css      # Styling with dark/light themes
├── app.js          # Application logic & calculations
└── README.md       # This file
```

## ⚙️ Default Settings

| Setting | Default Value |
|---------|---------------|
| Material | PLA |
| Infill | 20% |
| Wall Count | 4 |
| Layer Height | 0.2 mm |
| Line Width | 0.4 mm |
| Top Layers | 4 |
| Bottom Layers | 4 |
| Labor Cost | 50 ₺ |

## 🎨 Screenshots

### Dark Theme
Experience a sleek, modern dark interface perfect for extended use.

### Light Theme  
Switch to light theme for better visibility in bright environments.

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
