// ==========================================
// DIJITAL ATLAS - ANA JAVASCRIPT DOSYASI (FINAL V2)
// ==========================================

// --- GLOBAL DEĞİŞKENLER ---
let activeDetailPopover = null; // Tıklama kutusu
let hoverTooltip = null;        // Uçan etiket
let hoverTimer = null;          // Sayaç
let globalData = {};            // Veriler

// Mouse Koordinatlarını Global Takip Et
let cursorX = 0;
let cursorY = 0;

// --- 1. SAYFA VE VERİ YÜKLEME ---
async function loadPage(pageName) {
    const contentDiv = document.getElementById('app-content');
    try {
        const pageResponse = await fetch(`${pageName}.html`);
        if (!pageResponse.ok) throw new Error('Sayfa yüklenemedi');
        const html = await pageResponse.text();
        contentDiv.innerHTML = html;

        if (pageName === 'world_map') {
            await loadData(); 
            loadSVGMap();
        }
    } catch (error) {
        contentDiv.innerHTML = `<div class="alert alert-danger m-5">Hata: ${error.message}</div>`;
    }
}

async function loadData() {
    try {
        const response = await fetch('data/population_data.json');
        if (!response.ok) throw new Error('Veri bulunamadı');
        globalData = await response.json();
    } catch (error) {
        console.error(error);
        globalData = {}; 
    }
}

// --- 2. SVG YÜKLEME ---
async function loadSVGMap() {
    const placeholder = document.getElementById('svg-placeholder');
    try {
        const response = await fetch('assets/world.svg'); 
        if (!response.ok) throw new Error('Harita bulunamadı');
        const svgText = await response.text();
        if(placeholder) placeholder.outerHTML = svgText; 
        
        const svgElement = document.querySelector('#map-container svg');
        if(svgElement) {
            svgElement.id = "world-map-svg";
            createHoverTooltip();
            initMapInteractions(); 
            initPanZoom(); 
            initGlobalClicks();
            trackMouse(); // Global mouse takibi başlat
        }
    } catch (error) {
        if(placeholder) placeholder.innerHTML = `<p class="text-danger">Hata: ${error.message}</p>`;
    }
}

// --- 3. MOUSE TAKİP SİSTEMİ (YENİ) ---
function trackMouse() {
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;

        // Eğer tooltip açıksa, mouse ile birlikte hareket ettir
        if (hoverTooltip && hoverTooltip.style.display === 'block') {
            updateTooltipPosition();
        }
    });
}

function updateTooltipPosition() {
    // Tooltip'i mouse'un ucuna taşı
    hoverTooltip.style.left = cursorX + 'px';
    hoverTooltip.style.top = cursorY + 'px';
}

function createHoverTooltip() {
    if (!document.getElementById('custom-hover-tooltip')) {
        hoverTooltip = document.createElement('div');
        hoverTooltip.id = 'custom-hover-tooltip';
        hoverTooltip.className = 'floating-tooltip';
        document.body.appendChild(hoverTooltip);
    } else {
        hoverTooltip = document.getElementById('custom-hover-tooltip');
    }
}

// --- 4. ETKİLEŞİMLER ---
function initMapInteractions() {
    const mapSvg = document.getElementById('world-map-svg');
    if(!mapSvg) return;

    const paths = mapSvg.querySelectorAll('path');
    
    paths.forEach(path => {
        const countryCode = path.getAttribute('id');
        
        // A. MOUSE GİRİŞİ
        path.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            if (activeDetailPopover) return; // Detay açıksa hover çıkmasın

            hoverTimer = setTimeout(() => {
                const countryName = getCountryName(countryCode) || path.getAttribute('name') || 'Bilinmiyor';
                
                // 1. İçeriği Doldur
                hoverTooltip.innerHTML = countryName;
                
                // 2. Pozisyonu GÜNCEL Mouse Konumuna Ayarla (Burası "saçma yer" sorununu çözer)
                updateTooltipPosition();
                
                // 3. Göster
                hoverTooltip.style.display = 'block';
            }, 1500);
        });

        // B. MOUSE ÇIKIŞI
        path.addEventListener('mouseleave', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTooltip.style.display = 'none';
        });

        // C. TIKLAMA
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTooltip.style.display = 'none';
            showDetailPopover(path, countryCode);
        });
    });
}

// --- DİĞER YARDIMCILAR (Aynı) ---
function getCountryName(code) {
    if (globalData[code] && globalData[code].names) {
        return globalData[code].names.tr;
    }
    return null;
}

function generateDetailContent(code, pathElement) {
    const data = globalData[code];
    const defaultName = pathElement.getAttribute('name') || code;

    if (!data) return `<strong>${defaultName}</strong><br><span class="text-muted small">Veri yok.</span>`;

    const flagUrl = data.general_info?.flag_url || `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
    const formatNum = (n) => new Intl.NumberFormat('tr-TR').format(n);

    return `
        <div class="text-center mb-2">
            <img src="${flagUrl}" width="60" style="border:1px solid #ccc;">
            <h6 class="fw-bold mb-0 mt-1">${data.names.tr}</h6>
        </div>
        <ul class="list-unstyled small mb-0">
            <li><strong>Başkent:</strong> ${data.geography?.capital_tr || '-'}</li>
            <li><strong>Nüfus:</strong> ${data.demographics?.total_population ? formatNum(data.demographics.total_population) : '-'}</li>
            <li><strong>GSYİH:</strong> $${data.economy?.gdp_usd ? formatNum(data.economy.gdp_usd) : '-'}</li>
        </ul>
    `;
}

function showDetailPopover(element, code) {
    if (activeDetailPopover) {
        activeDetailPopover.dispose();
        activeDetailPopover = null;
    }
    const content = generateDetailContent(code, element);
    const popover = new bootstrap.Popover(element, {
        trigger: 'manual',
        container: '#map-container',
        html: true,
        content: content,
        placement: 'auto'
    });
    popover.show();
    activeDetailPopover = popover;
}

function initGlobalClicks() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.addEventListener('click', () => {
        if (activeDetailPopover) {
            activeDetailPopover.dispose();
            activeDetailPopover = null;
        }
    });
}

// --- 5. ZOOM & PAN (AYNI) ---
let currentScale = 1;
let currentTranslateX = 0;
let currentTranslateY = 0;
let isDragging = false;
let startX, startY;

function updateTransform() {
    const mapSvg = document.getElementById('world-map-svg');
    if(mapSvg) mapSvg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}

function initPanZoom() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.addEventListener('mousedown', (e) => {
        if(e.button !== 0) return;
        isDragging = true;
        startX = e.clientX - currentTranslateX;
        startY = e.clientY - currentTranslateY;
        mapContainer.style.cursor = 'grabbing';
        document.getElementById('world-map-svg').classList.add('no-transition');
    });
    mapContainer.addEventListener('mouseup', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
        document.getElementById('world-map-svg').classList.remove('no-transition');
    });
    mapContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        mapContainer.style.cursor = 'grab';
        const svg = document.getElementById('world-map-svg');
        if(svg) svg.classList.remove('no-transition');
    });
    mapContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        let newX = e.clientX - startX;
        let newY = e.clientY - startY;
        const limitX = 500 * currentScale;
        const limitY = 300 * currentScale;
        currentTranslateX = Math.max(-limitX, Math.min(newX, limitX));
        currentTranslateY = Math.max(-limitY, Math.min(newY, limitY));
        updateTransform();
    });
}

function zoomMap(factor) {
    currentScale = Math.max(0.5, Math.min(currentScale * factor, 5)); 
    updateTransform();
}

function resetMap() {
    currentScale = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;
    updateTransform();
}

function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    if (html.getAttribute('data-theme') === 'light') {
        html.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
    } else {
        html.setAttribute('data-theme', 'light');
        icon.className = 'fas fa-moon';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadPage('world_map');
});