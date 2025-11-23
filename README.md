# 🌍 Digital Atlas

**Digital Atlas** is a modern web application that allows users to interactively explore the world map and access detailed demographic, economic, and military information about countries.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Features

* **Interactive SVG Map:** Hover effects to display country names and clickable regions for details.
* **Dynamic Data Display:** Instant fetching of data (flags, capitals, population, GDP, etc.) from JSON files for the selected country.
* **Population Pyramid:** Dynamically generated, animated (CSS transition) age/gender distribution chart for every country.
* **Categorized Information:**
    * 🏛 Geography & Politics
    * 👥 Demographics (including Age Pyramid)
    * 💰 Economy
    * 🛡 Military & Security
* **Zoom & Pan:** Zooming and panning capabilities on the map for better navigation.
* **Responsive Design:** Mobile-friendly interface built with Bootstrap 5.

## 🛠 Technologies

This project was built using the following technologies:

* **HTML5 & CSS3** (Custom animations and grid structure)
* **JavaScript (ES6+)** (Fetch API, DOM Manipulation, Async Functions)
* **Bootstrap 5** (UI Components and Popover system)
* **SVG** (Vector Map Manipulation)
* **JSON** (Data Storage)

## 📂 Project Structure

```text
digital-atlas/
├── public/
│   ├── index.html          # Main entry page
│   ├── world_map.html      # Map component
│   ├── src/
│   │   ├── assets/         # world.svg and images
│   │   ├── css/            # main.css
│   │   ├── data/           # world.json (Country data)
│   │   └── js/             # main.js (Application engine)
├── README.md               # Project documentation
└── .gitignore              # Files to be ignored by Git