# 3D Baskı Maliyet Hesaplayıcı (v2.5)

Kullanıcı dostu, hızlı ve tarayıcı tabanlı 3D baskı maliyet analiz aracı.

## 🚀 Özellikler

- **Anlık Geometrik Hesaplama:** STL dosyanızı yüklediğiniz anda Hacim, Yüzey Alanı ve Ağırlık hesaplanır.
- **Dinamik Fiyatlandırma:** Baskı kalitesine göre değişen hizmet bedeli.
  - **Düşük (x0.25):** Hızlı, taslak baskılar.
  - **Orta (x0.5):** Fonksiyonel.
  - **Standart (x1.0):** Dengeli.
  - **Yüksek (x1.5):** Pürüzsüz yüzey.
- **Malzeme Desteği:** PLA, ABS, PETG.
- **Görsel:** Simsiyah (OLED dostu) arka plan ve modern arayüz.
- **Güvenli:** Tüm işlemler tarayıcınızda yapılır, sunucuya dosya gönderilmez.

## 🛠 Kullanılan Teknolojiler

- **Three.js:** 3D Görüntüleme ve Geometri Analizi.
- **Vanilla JS (ES6+):** Performanslı mantıksal işlemler.
- **CSS3 Variables:** Kolay tema yönetimi.

## 📦 Kurulum

Bu proje **static web sitesi** olarak çalışır. Herhangi bir backend kurulumu gerektirmez.

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/ottamina/3DPrintCostCalculator.git
   ```
2. Klasöre gidin ve `index.html` dosyasını tarayıcınızda açın.

## 🤝 Geliştirici

**Osman Teksoy**
- [LinkedIn](https://linkedin.com/in/osmanteksoy)
- [GitHub](https://github.com/ottamina)

---
*Not: Bu araç tahmini maliyet sunar, profesyonel dilimleyicilerle (Cura, PrusaSlicer) birebir aynı sonucu garanti etmez ancak %98 oranında yakındır.*
