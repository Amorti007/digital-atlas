// ==========================================
// DIJITAL ATLAS - ANA JAVASCRIPT DOSYASI (FINAL V3)
// ==========================================

// --- GLOBAL DEĞİŞKENLER ---
let activeDetailPopover = null; // Tıklama kutusu
let hoverTooltip = null;        // Uçan etiket
let hoverTimer = null;          // Sayaç
let globalData = {};            // Veriler
let cursorX = 0;
let cursorY = 0;

// --- 1. SAYFA YÜKLEME MOTORU ---
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

// --- 2. VERİ ÇEKME (YOL GÜNCELLENDİ) ---
async function loadData() {
    try {
        // İSTEĞİN ÜZERİNE GÜNCELLENEN SATIR:
        // public klasöründen bir yukarı çık (../), src'ye gir, data'ya gir.
        const response = await fetch('../src/data/world.json');
        
        if (!response.ok) throw new Error('Veri dosyası bulunamadı (src/data/world.json)');
        
        globalData = await response.json();
        console.log("Veri başarıyla yüklendi:", Object.keys(globalData).length, "ülke");
    } catch (error) {
        console.error("Veri yükleme hatası:", error);
        globalData = {}; 
    }
}

// --- 3. SVG HARİTA YÖNETİMİ ---
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
            trackMouse();
        }
    } catch (error) {
        if(placeholder) placeholder.innerHTML = `<p class="text-danger">Hata: ${error.message}</p>`;
    }
}

// --- 4. ETKİLEŞİMLER ---
function initMapInteractions() {
    const mapSvg = document.getElementById('world-map-svg');
    if(!mapSvg) return;

    const paths = mapSvg.querySelectorAll('path');
    
    paths.forEach(path => {
        const countryCode = path.getAttribute('id');
        
        // A. MOUSE GİRİŞİ (HOVER)
        path.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            if (activeDetailPopover) return;

            hoverTimer = setTimeout(() => {
                const countryName = getCountryName(countryCode) || path.getAttribute('name') || 'Bilinmiyor';
                
                hoverTooltip.innerHTML = countryName;
                updateTooltipPosition();
                hoverTooltip.style.display = 'block';
            }, 1500); 
        });

        // B. MOUSE ÇIKIŞI
        path.addEventListener('mouseleave', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTooltip.style.display = 'none';
        });

        // C. TIKLAMA (DETAY)
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hoverTimer) clearTimeout(hoverTimer);
            hoverTooltip.style.display = 'none';
            showDetailPopover(path, countryCode);
        });
    });
}

// --- DETAY İÇERİK OLUŞTURUCU ---
function generateDetailContent(code, pathElement) {
    const data = globalData[code];
    const defaultName = pathElement.getAttribute('name') || code;

    if (!data) return `<strong>${defaultName}</strong><br><span class="text-muted small">Veri yok.</span>`;

    const flagUrl = data.general_info?.flag_url || `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
    const formatNum = (n) => new Intl.NumberFormat('tr-TR').format(n);
    const currency = (n) => n ? `$${formatNum(n)}` : '-';

    const pyramidHtml = generatePyramidBar(data.demographics?.population_pyramid);

    return `
        <div class="text-center mb-2">
            <img src="${flagUrl}" width="60" style="border:1px solid #ccc; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h6 class="fw-bold mb-0 mt-2">${data.names.tr || defaultName}</h6>
            <small class="text-muted">${data.names.en || ''}</small>
        </div>
        <hr class="my-2">
        
        <ul class="list-unstyled small mb-2">
            <li class="mb-1"><i class="fas fa-landmark text-muted me-1"></i> <strong>Başkent:</strong> ${data.geography?.capital_tr || '-'}</li>
            <li class="mb-1"><i class="fas fa-users text-muted me-1"></i> <strong>Nüfus:</strong> ${data.demographics?.total_population ? formatNum(data.demographics.total_population) : '-'}</li>
            <li class="mb-1"><i class="fas fa-coins text-muted me-1"></i> <strong>GSYİH:</strong> ${currency(data.economy?.gdp_usd)}</li>
        </ul>

        <div class="mt-3">
            <p class="small fw-bold mb-1"><i class="fas fa-chart-pie me-1"></i> Yaş Dağılımı</p>
            ${pyramidHtml}
            <div class="d-flex justify-content-between mt-1" style="font-size: 0.7rem; color: #666;">
                <span><i class="fas fa-square text-success"></i> 0-14</span>
                <span><i class="fas fa-square text-warning"></i> 15-64</span>
                <span><i class="fas fa-square text-danger"></i> 65+</span>
            </div>
        </div>
    `;
}

// Yardımcı: Piramit
function generatePyramidBar(pyramidData) {
    if (!pyramidData || !Array.isArray(pyramidData)) return '<span class="small text-muted">Veri yok</span>';

    let young = 0, mid = 0, old = 0, total = 0;

    pyramidData.forEach(group => {
        const ageRange = group.Age; 
        const count = (group.M || 0) + (group.F || 0);
        const startAge = parseInt(ageRange.split(/[-+]/)[0]);

        if (startAge < 15) young += count;
        else if (startAge < 65) mid += count;
        else old += count;
        
        total += count;
    });

    if (total === 0) return '<span class="small text-muted">Hesaplanamadı</span>';

    const pYoung = Math.round((young / total) * 100);
    const pMid = Math.round((mid / total) * 100);
    const pOld = 100 - pYoung - pMid;

    return `
        <div class="progress" style="height: 10px;">
            <div class="progress-bar bg-success" role="progressbar" style="width: ${pYoung}%"></div>
            <div class="progress-bar bg-warning" role="progressbar" style="width: ${pMid}%"></div>
            <div class="progress-bar bg-danger" role="progressbar" style="width: ${pOld}%"></div>
        </div>
    `;
}

// --- YARDIMCILAR & MOUSE TAKİP ---
function getCountryName(code) {
    if (globalData[code] && globalData[code].names) return globalData[code].names.tr;
    return null;
}

function showDetailPopover(element, code) {
    if (activeDetailPopover) { activeDetailPopover.dispose(); activeDetailPopover = null; }
    
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
    document.getElementById('map-container').addEventListener('click', () => {
        if (activeDetailPopover) { activeDetailPopover.dispose(); activeDetailPopover = null; }
    });
}

function trackMouse() {
    document.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
        if (hoverTooltip && hoverTooltip.style.display === 'block') {
            updateTooltipPosition();
        }
    });
}

function updateTooltipPosition() {
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

// --- ZOOM & PAN ---
let currentScale = 1, currentTranslateX = 0, currentTranslateY = 0, isDragging = false, startX, startY;

function updateTransform() {
    const mapSvg = document.getElementById('world-map-svg');
    if(mapSvg) mapSvg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}

function initPanZoom() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.addEventListener('mousedown', (e) => {
        if(e.button !== 0) return;
        isDragging = true; startX = e.clientX - currentTranslateX; startY = e.clientY - currentTranslateY;
        mapContainer.style.cursor = 'grabbing';
        document.getElementById('world-map-svg').classList.add('no-transition');
    });
    mapContainer.addEventListener('mouseup', () => {
        isDragging = false; mapContainer.style.cursor = 'grab';
        document.getElementById('world-map-svg').classList.remove('no-transition');
    });
    mapContainer.addEventListener('mouseleave', () => {
        isDragging = false; mapContainer.style.cursor = 'grab';
        const svg = document.getElementById('world-map-svg');
        if(svg) svg.classList.remove('no-transition');
    });
    mapContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        let newX = e.clientX - startX, newY = e.clientY - startY;
        const limitX = 500 * currentScale, limitY = 300 * currentScale;
        currentTranslateX = Math.max(-limitX, Math.min(newX, limitX));
        currentTranslateY = Math.max(-limitY, Math.min(newY, limitY));
        updateTransform();
    });
}

function zoomMap(factor) { currentScale = Math.max(0.5, Math.min(currentScale * factor, 5)); updateTransform(); }
function resetMap() { currentScale = 1; currentTranslateX = 0; currentTranslateY = 0; updateTransform(); }
function toggleTheme() {
    const html = document.documentElement, icon = document.getElementById('theme-icon');
    if (html.getAttribute('data-theme') === 'light') { html.setAttribute('data-theme', 'dark'); icon.className = 'fas fa-sun'; }
    else { html.setAttribute('data-theme', 'light'); icon.className = 'fas fa-moon'; }
}

document.addEventListener("DOMContentLoaded", () => { loadPage('world_map'); });