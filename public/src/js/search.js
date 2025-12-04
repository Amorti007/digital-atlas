// ============================================================
// --- DIGITAL ATLAS - ARAMA, FİLTRELEME VE ARAÇLAR MOTORU ---
// ============================================================

// --- KARŞILAŞTIRMA LİSTESİ ---
let comparisonList = [];

// --- 1. ARAMA FONKSİYONU ---
function searchCountry() {
    const searchInput = document.getElementById("country-search");
    if (!searchInput) return;
    
    // Türkçe karakter duyarlı küçük harfe çevirme
    const query = searchInput.value.trim().toLocaleLowerCase('tr-TR');
    
    if (!query) {
        // Boşsa inputu salla (Görsel geri bildirim)
        searchInput.classList.add('is-invalid');
        setTimeout(() => searchInput.classList.remove('is-invalid'), 1000);
        return;
    }

    // globalData'ya erişim (main.js'den gelir)
    if (typeof globalData === 'undefined' || Object.keys(globalData).length === 0) {
        console.warn("Veri henüz yüklenmedi.");
        return;
    }

    let foundCode = null;
    const keys = Object.keys(globalData);
    
    for (const key of keys) {
        const data = globalData[key];
        const code = key.toLowerCase();
        
        const nameTr = (data.names?.tr || "").toLocaleLowerCase('tr-TR');
        const nameEn = (data.names?.en || "").toLowerCase();

        if (code === query || nameTr.includes(query) || nameEn.includes(query)) {
            foundCode = key;
            break;
        }
    }

    if (foundCode) {
        let path = document.getElementById(foundCode);
        if (!path) {
           const group = document.querySelector(`g#${foundCode}`);
           if (group) path = group.querySelector("path");
        }

        if (path) {
            // A. HARİTAYI SIFIRLA (Animasyonsuz)
            if (typeof resetMap === 'function') {
                const svgEl = document.getElementById("world-map-svg");
                if(svgEl) svgEl.style.transition = "none"; 
                resetMap();
                if(svgEl) void svgEl.offsetWidth; // Reflow
            }

            // B. ZOOM VE SEÇİM YAP
            setTimeout(() => {
                // main.js'deki zoomToCountry fonksiyonunu çağır
                if (typeof zoomToCountry === 'function') {
                    zoomToCountry(path, foundCode);
                }
                
                // main.js'deki highlightCountry fonksiyonunu çağır
                if (typeof window.highlightCountry === 'function') {
                    window.highlightCountry(foundCode);
                }
                
                // Menüyü kapat (Bootstrap)
                const toolsMenu = document.getElementById('toolsMenu');
                if (toolsMenu && typeof bootstrap !== 'undefined') {
                    bootstrap.Collapse.getOrCreateInstance(toolsMenu).hide();
                    const toolsBtn = document.getElementById('tools-btn');
                    if(toolsBtn) toolsBtn.setAttribute('aria-expanded', 'false');
                }
            }, 50);

            // Detay penceresini aç
            setTimeout(() => {
                if (typeof showDetailPopover === 'function') {
                    showDetailPopover(path, foundCode);
                }
            }, 1000);

            searchInput.value = "";
            searchInput.blur();
        } else {
             alert("Ülke verisi bulundu ("+foundCode+") ancak haritada çizimi eksik.");
        }
    } else {
        alert("Ülke bulunamadı! Lütfen geçerli bir isim veya kod girin.");
    }
}

// --- 2. SIFIRLA (RESET) FONKSİYONU ---
function resetSwitches() {
    // Arama Kutusunu Temizle
    const searchInput = document.getElementById("country-search");
    if(searchInput) searchInput.value = "";

    // Radyo Butonlarını Sıfırla
    const filterAll = document.getElementById("filterAll");
    if(filterAll) {
        filterAll.checked = true;
        applyMapFilter('all'); // Filtreyi de sıfırla
    }

    // Switchleri Varsayılan Ayara Döndür
    const defaults = ["showGeo", "showDemo", "showEco", "showMil"];
    const allSwitches = document.querySelectorAll('.form-check-input[type="checkbox"]');
    
    allSwitches.forEach(sw => {
        sw.checked = defaults.includes(sw.id);
    });

    // Haritayı sıfırla
    if (typeof resetMap === 'function') resetMap();
    if (typeof window.resetCountry === 'function' && typeof selectedCountryCode !== 'undefined') {
        window.resetCountry(selectedCountryCode);
    }
}

// --- 3. HARİTA FİLTRELEME MOTORU ---
function initFilterListeners() {
    const filters = document.querySelectorAll('input[name="mapFilter"]');
    filters.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyMapFilter(e.target.value);
        });
    });
}

function applyMapFilter(filterType) {
    const mapSvg = document.getElementById("world-map-svg");
    if (!mapSvg) return;
    const paths = mapSvg.querySelectorAll("path");
    
    paths.forEach(path => {
        let code = path.getAttribute("id");
        if (!code || code.length !== 2) {
             if (path.parentElement.id.length === 2) code = path.parentElement.id;
             else return;
        }

        const data = (typeof globalData !== 'undefined') ? globalData[code] : null;
        let isMatch = true;

        if (!data) {
            isMatch = false; 
        } else {
            switch (filterType) {
                case 'eu':
                    isMatch = (data.geography?.continent_en === "Europe");
                    break;
                case 'asia':
                    isMatch = (data.geography?.continent_en === "Asia");
                    break;
                case 'pop100':
                    isMatch = (data.demographics?.total_population > 100000000);
                    break;
                case 'gdp50k':
                    isMatch = (data.economy?.gdp_per_capita_usd > 50000);
                    break;
                case 'all':
                default:
                    isMatch = true;
                    break;
            }
        }

        if (isMatch) {
            path.style.opacity = "1";
            path.style.pointerEvents = "all";
        } else {
            path.style.opacity = "0.2";
            path.style.pointerEvents = "none";
        }
    });
}

// --- 4. KARŞILAŞTIRMA SİSTEMİ ---
window.addToComparison = function(code) {
    if (comparisonList.includes(code)) {
        alert("Bu ülke zaten listede!");
        return;
    }
    
    if (comparisonList.length >= 3) {
        alert("En fazla 3 ülke karşılaştırabilirsiniz.");
        return;
    }

    comparisonList.push(code);
    
    // Geri bildirim
    const name = (typeof getCountryName === 'function') ? getCountryName(code) : code;
    console.log(`Eklendi: ${name}`);
    
    showComparisonFloatingBar();
};

function showComparisonFloatingBar() {
    let bar = document.getElementById("compare-bar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "compare-bar";
        bar.className = "position-fixed bottom-0 start-50 translate-middle-x mb-4 p-3 bg-white shadow rounded-pill d-flex align-items-center gap-3 fade-in";
        bar.style.zIndex = "1050";
        document.body.appendChild(bar);
    }
    
    const count = comparisonList.length;
    if (count === 0) {
        bar.remove();
        return;
    }

    bar.innerHTML = `
        <span class="fw-bold text-primary">${count} Ülke Seçildi</span>
        <button class="btn btn-sm btn-dark rounded-pill" onclick="alert('Karşılaştırma Modu Yakında!')">Kıyasla</button>
        <button class="btn btn-sm btn-light border rounded-circle" onclick="comparisonList=[]; showComparisonFloatingBar();"><i class="fas fa-times"></i></button>
    `;
}

// Dinleyicileri Başlat
document.addEventListener("DOMContentLoaded", () => {
    initFilterListeners();
});

// Fonksiyonları Dışarı Aç (HTML'den erişim için)
window.searchCountry = searchCountry;
window.resetSwitches = resetSwitches;