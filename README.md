# 🌍 Digital Atlas

**Digital Atlas** is a modern, interactive web application designed to explore global demographic, economic, and military data through a dynamic SVG map interface. It features a custom-built **Multi-Language Engine**, a smart search algorithm, and a fully responsive design.

![Project Status](https://img.shields.io/badge/Status-Active-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.2.0-orange?style=flat-square)

## 📖 About The Project

Digital Atlas aims to simplify access to complex country data. Instead of browsing through boring tables, users can interact with a responsive world map to instantly retrieve live data visualizations, including a dynamic **Population Pyramid** and side-by-side country comparisons.

## 🚀 Key Features

* **🗺️ Interactive SVG Map:**
    * Vector-based map with hover effects and smart click interactions.
    * **Smart Dependency Logic:** Automatically links territories (e.g., French Guiana) to their parent countries (France).
    * Smart pan & zoom capabilities for better navigation on mobile and desktop.
* **🔍 Intelligent Search & Filters:**
    * **Scoring Algorithm:** Context-aware search that prioritizes results based on the active language (e.g., "Al" finds "Almanya" in TR mode, "Albania" in EN mode).
    * **Advanced Filtering:** Filter countries by region (including Eurasia logic for TR/RU) or statistical metrics (Pop > 100M).
* **⚖️ Comparison Mode:**
    * Select and compare up to **3 countries** side-by-side.
    * Visual comparison of economic, military, and demographic metrics.
* **🌐 Multi-Language Support (i18n):**
    * **Custom Language Engine:** A lightweight, pure JavaScript solution (`lang.js`) handles real-time translations without external libraries.
    * **Seamless Switching:** Instantly toggles between **Turkish (TR)** and **English (EN)** without refreshing the page.
* **👥 Live Population Pyramid:**
    * **Custom Algorithm:** Converts raw demographic data into an animated CSS-based bar chart.
    * Visualizes age and gender distribution dynamically for every country.
* **📱 Fully Responsive:**
    * Built with **Bootstrap 5**, ensuring a seamless experience on tablets and phones.
    * Dark/Light mode toggle for user accessibility.

## 🛠 Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Python 3.13.3, Flask |
| **Framework** | Bootstrap 5.3 (UI & Popovers) |
| **Data & Assets** | JSON, SVG, FontAwesome, FlagCDN |
| **Localization** | Custom JS Engine (`lang.js`) |
| **Algorithms** | Weighted Search Scoring, SVG Grouping Logic |

## 📂 Project Structure

```text
digital-atlas/
├── public/
│   ├── index.html          # Main entry point (Navbar & Layout)
│   ├── world_map.html      # Dynamic map component loaded via fetch
│   ├── about.html          # About page fragment (Mission & Team)
│   ├── src/
│   │   ├── assets/         # Optimized world.svg and static images
│   │   ├── css/            # main.css (Custom styling & variables)
│   │   ├── data/           # world.json (Comprehensive country database)
│   │   └── js/
│   │       ├── main.js     # Core application logic & SVG interactions
│   │       ├── search.js   # Search engine, filters & comparison logic
│   │       └── lang.js     # Localization engine & Translation dictionary
├── README.md               # Documentation
└── package.json            # Dependency management
```

## 🤝 Credits & Attributions

This project makes use of the following open-source resources:

* **Map Data:** [SimpleMaps](https://simplemaps.com/resources/svg-maps) (SVG World Map)
* **Demographics:** [PopulationPyramid.net](https://populationpyramid.net) (Data source)
* **Flags:** [FlagCDN](https://flagcdn.com) (Flag API)
* **Icons:** [FontAwesome](https://fontawesome.com)
* **UI Framework:** [Bootstrap](https://getbootstrap.com/)

---

<p align="center">
  Made with ❤️ by the Digital Atlas Team
</p>