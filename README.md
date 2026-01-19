# 🖨️ 3D Print Cost Calculator

A modern, browser-based 3D print cost calculator that uses **Cura WASM Engine** for highly accurate real-time slicing and cost prediction. Simply drag & drop your STL file and get precise results!

![3D Print Cost Calculator](https://img.shields.io/badge/version-1.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Made with](https://img.shields.io/badge/made%20with-Three.js-black)
![Powered by](https://img.shields.io/badge/powered%20by-Cura%20WASM-orange)

## ✨ Features

- 🎯 **Real-Time Slicing** - Uses actual **Cura Engine** (via WASM) for accurate weight calculation
- ⚖️ **Consistent Weight** - Weight calculation uses standardized settings (0.2mm, 3 walls) regardless of quality profile
- 🔄 **Smart Fallback** - If slicing fails, automatically falls back to advanced geometric estimation
- 📁 **Drag & Drop STL Upload** - Simply drag your STL file or click to browse
- 🎨 **Interactive 3D Viewer** - Rotate, zoom, and inspect your model in real-time
- 🌙 **Dark/Light Theme** - Beautiful UI with theme switching
- 🎚️ **4 Quality Profiles** - Affects **Labor Cost** only (via Layer Height)
- 💰 **Detailed Cost Breakdown** - Material weight + Dynamic Labor Cost

## 🎚️ Quality Profiles

Quality profiles adjust the Layer Height which directly impacts the print time and Labor Cost. 
**Note:** Weight calculation is standardized (based on Standard profile) so changing quality does not affect the material usage, only the labor cost.

| Profile | Layer Height | Labor Cost |
|---------|--------------|------------|
| **Düşük** | 0.28 mm | 20 ₺ |
| **Standart** | 0.20 mm | 28 ₺ |
| **Dinamik** | 0.16 mm | 35 ₺ |
| **Super** | 0.12 mm | 47 ₺ |

## 🚀 How It Works

1. **Cura Engine Integration:** The app loads `cura-wasm` via CDN.
2. **Slicing:** When you upload a model, it's actually sliced in the browser background worker.
3. **Estimation:** The exact filament usage (mm) is calculated from the generated GCODE metadata.
4. **Accuracy:** This accounts for walls, infill patterns, top/bottom layers, and supports just like desktop Cura!

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **Cura WASM** | Real-time browser-based slicing |
| **Three.js** | 3D visualizer |
| **JavaScript (ES6+)** | Logic & Workers |
| **HTML5 & CSS3** | Modern Interface |

## 📦 Project Structure

```
3DPrintCostCalculator/
├── index.html      # Main entry
├── app.js          # Logic (Three.js + Cura WASM integration)
├── styles.css      # Styling
└── README.md       # Docs
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
