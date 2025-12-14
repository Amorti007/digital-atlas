// ============================================================
// --- DIGITAL ATLAS v1.2 - ARAMA, FİLTRELEME VE ARAÇLAR MOTORU ---
// ============================================================

let comparisonList = [];

// --- YARDIMCI: SKORLAMA VE SIRALAMA ALGORİTMASI (V1.2 YENİ) ---
// Bu fonksiyon arama sonuçlarını alaka düzeyine göre sıralar.
function getSortedMatches(query, dataObj) {
    if (!query || !dataObj) return [];

    const results = [];
    
    // 1. Aktif Dili Belirle (Varsayılan: tr)
    const currentLang = window.currentLang || 'tr';
    
    // 2. Sorguyu dile uygun küçült (TR için 'İ' -> 'i', EN için 'I' -> 'i' farkı)
    const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
    const q = query.toLocaleLowerCase(locale);

    Object.keys(dataObj).forEach(key => {
        const data = dataObj[key];
        const code = key.toLowerCase();
        
        // İsimleri Hazırla
        const nameTr = (data.names?.tr || "").toLocaleLowerCase('tr-TR');
        const nameEn = (data.names?.en || "").toLowerCase();

        // 3. AKTİF İSMİ SEÇ (Kritik Nokta)
        // Eğer dil TR ise, primaryName Türkçe olandır. Değilse İngilizce olandır.
        let primaryName, secondaryName;
        
        if (currentLang === 'tr') {
            primaryName = nameTr;   // Öncelikli İsim
            secondaryName = nameEn; // Yedek İsim
        } else {
            primaryName = nameEn;   // Öncelikli İsim
            secondaryName = nameTr; // Yedek İsim
        }

        let score = 0;

        // --- PUANLAMA KURALLARI ---

        // A. TAM EŞLEŞME (Zirve)
        // Aktif dildeki isim tam tutuyorsa (Örn: TR modunda "Almanya")
        if (primaryName === q) score += 2000;
        
        // KOD tam tutuyorsa (Örn: "AL") -> İsimden düşük ama yüksek puan
        if (code === q) score += 500;
        
        // Diğer dildeki isim tam tutuyorsa
        if (secondaryName === q) score += 400;


        // B. BAŞLANGIÇ EŞLEŞMESİ (Önemli)
        // Aktif dildeki isim bununla mı başlıyor? (Örn: TR modunda "Al" -> "Almanya")
        // Bu puan (1000), Kod puanından (500) yüksek olduğu için İsim kazanır.
        if (primaryName.startsWith(q)) score += 1000;

        // Kod bununla mı başlıyor? (Örn: "Al" -> "AL")
        if (code.startsWith(q)) score += 50;

        // Diğer dildeki isim bununla mı başlıyor? (Örn: EN modunda "Al" -> "Almanya" düşük puan alır)
        if (secondaryName.startsWith(q)) score += 10;


        // C. İÇERİK EŞLEŞMESİ (En düşük)
        if (primaryName.includes(q)) score += 5;
        else if (secondaryName.includes(q)) score += 2;
        
        
        if (score > 0) {
            results.push({ code: key, score: score, data: data });
        }
    });

    // Puanı yüksek olan en üste
    return results.sort((a, b) => b.score - a.score);
}

// --- 1. ARAMA FONKSİYONU (GÜNCELLENDİ) ---
function searchCountry() {
    // Dil desteği
    const t = (key) => window.uiTranslations?.[window.currentLang]?.[key] || key;
    
    const searchInput = document.getElementById("country-search");
    const errorMsg = document.getElementById("search-error-msg");
    if (!searchInput) return;
    
    const query = searchInput.value.trim(); // toLocaleLowerCase burada değil, algoritma içinde yapılıyor
    
    // Hataları temizle
    searchInput.classList.remove('is-invalid');
    if(errorMsg) errorMsg.style.display = 'none';

    if (!query) return;
    if (typeof window.globalData === 'undefined') return;

    // --- YENİ MANTIK: PUANLI ARAMA ---
    const sortedResults = getSortedMatches(query, window.globalData);
    let foundCode = null;

    if (sortedResults.length > 0) {
        foundCode = sortedResults[0].code; // En yüksek puanlı sonucu al
    }

    if (foundCode) {
        // Haritada bul (Grup veya Path)
        // Main.js'deki yeni mantığa uygun olarak önce ID'yi arıyoruz
        let target = document.getElementById(foundCode);
        if (!target) {
           const group = document.querySelector(`g#${foundCode}`);
           if (group) target = group.querySelector("path"); // Grubun ilk parçasına odaklan
        }

        if (target) {
            // Başarılı: İşlemleri yap
            if (typeof resetMap === 'function') {
                const svgEl = document.getElementById("world-map-svg");
                if(svgEl) svgEl.style.transition = "none"; 
                resetMap();
                if(svgEl) void svgEl.offsetWidth; 
            }

            setTimeout(() => {
                // Zoom ve Highlight fonksiyonlarını çağır
                if (typeof zoomToCountry === 'function') zoomToCountry(target, foundCode);
                if (typeof window.highlightCountry === 'function') window.highlightCountry(foundCode);
                
                // Mobilde menüyü kapat
                const toolsMenu = document.getElementById('toolsMenu');
                if (toolsMenu && typeof bootstrap !== 'undefined') {
                    const bsCollapse = bootstrap.Collapse.getInstance(toolsMenu);
                    if (bsCollapse) bsCollapse.hide();
                }
            }, 50);

            setTimeout(() => {
                if (typeof showDetailPopover === 'function') showDetailPopover(target, foundCode);
            }, 1000);

            searchInput.value = "";
            searchInput.blur();
            
            const suggestionsBox = document.getElementById("search-suggestions");
            if(suggestionsBox) suggestionsBox.style.display = 'none';

        } else {
             // HATA: Veri var ama harita yok
             showSearchError(t('err_map_data_missing') || "Harita verisi eksik.");
        }
    } else {
        // HATA: Ülke bulunamadı
        showSearchError(`"${searchInput.value}" ${t('err_country_not_found') || "bulunamadı."}`);
    }
}

// --- 2. SIFIRLA (RESET) ---
function resetSwitches() {
    const searchInput = document.getElementById("country-search");
    if(searchInput) searchInput.value = "";

    const filterAll = document.getElementById("filterAll");
    if(filterAll) {
        filterAll.checked = true;
        applyMapFilter('all'); 
    }

    // Varsayılan açık olanlar
    const defaults = ["showGeo", "showDemo", "showEco", "showMil"];
    const allSwitches = document.querySelectorAll('.form-check-input[type="checkbox"]');
    
    allSwitches.forEach(sw => {
        sw.checked = defaults.includes(sw.id);
    });

    if (typeof resetMap === 'function') resetMap();
    
    // Parametresiz çağırarak seçili olanı sıfırla
    if (typeof window.resetCountry === 'function') {
        window.resetCountry();
    }
    
    // Açık popover varsa güncelle
    if(typeof window.refreshActivePopover === 'function') window.refreshActivePopover();
}

// --- 3. FİLTRELEME & KATMANLAR MOTORU (GÜNCELLENDİ) ---
function initFilterListeners() {
    // A. Radio Butonları (Bölge Filtreleme)
    const filters = document.querySelectorAll('input[name="mapFilter"]');
    filters.forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyMapFilter(e.target.value);
        });
    });

    // B. Switch Butonları (Veri Katmanları - Canlı Güncelleme)
    const switches = document.querySelectorAll('.form-check-input[type="checkbox"]');
    switches.forEach(sw => {
        sw.addEventListener('change', () => {
            if(typeof window.refreshActivePopover === 'function') {
                window.refreshActivePopover();
            }
        });
    });
}

function applyMapFilter(filterType) {
    const mapSvg = document.getElementById("world-map-svg");
    if (!mapSvg) return;
    
    // Tüm pathleri al ama sadece geçerli ID'si olanları işle
    const paths = mapSvg.querySelectorAll("path");
    const globalData = window.globalData || {};

    paths.forEach(path => {
        // ID Tespiti (Main.js mantığıyla uyumlu)
        let code = path.getAttribute("id");
        if (!code || code.length !== 2) {
             if (path.parentElement.id && path.parentElement.id.length === 2) {
                 code = path.parentElement.id;
             } else {
                 return; // ID yoksa atla
             }
        }

        const data = globalData[code];
        let isMatch = true;

        if (!data) {
            isMatch = false; 
        } else {
            const continent = data.geography?.continent_en;

            // --- YENİ: AVRASYA FİX ---
            // TR, RU, AZ, GE, KZ -> Hem Asya hem Avrupa'da görünsün
            const isEurasia = (code === 'TR' || code === 'RU');

            // Filtre Mantığı (Genişletildi)
            switch (filterType) {
                case 'eu':
                    isMatch = (continent === "Europe" || isEurasia);
                    break;
                case 'asia':
                    isMatch = (continent === "Asia" || isEurasia);
                    break;
                case 'na':
                    isMatch = (continent === "North America");
                    break;
                case 'sa':
                    isMatch = (continent === "South America");
                    break;
                case 'africa':
                    isMatch = (continent === "Africa");
                    break;
                case 'oceania':
                    isMatch = (continent === "Oceania");
                    break;
                case 'pop100':
                    isMatch = (data.demographics?.total_population > 100000000);
                    break;
                case 'area1m': // İsim değişikliği (HTML ile uyumlu olsun diye area1m yaptım)
                    isMatch = (data.geography?.area_sq_km > 1000000);
                    break;
                case 'all':
                default:
                    isMatch = true;
                    break;
            }
        }

        // Görsel Uygulama (CSS Class ile)
        if (isMatch) {
            path.classList.remove('dimmed');
        } else {
            path.classList.add('dimmed');
        }
    });
}

// --- 4. ARAMA ÖNERİLERİ (AUTOCOMPLETE - GÜNCELLENDİ) ---
function initSearchSuggestions() {
    const input = document.getElementById("country-search");
    const suggestionsBox = document.getElementById("search-suggestions");

    if (!input || !suggestionsBox) return;

    input.addEventListener("input", function() {
        const query = this.value.trim(); // Raw query alıyoruz

        // 1. Yazmaya başlayınca hata mesajını ve kırmızılığı KALDIR
        const errorMsg = document.getElementById("search-error-msg");
        if(errorMsg) errorMsg.style.display = 'none';
        this.classList.remove('is-invalid');

        // Önerileri sıfırla
        suggestionsBox.innerHTML = "";
        suggestionsBox.style.display = "none";

        if (query.length < 2) return;
        if (typeof window.globalData === 'undefined') return;

        // --- YENİ MANTIK: PUANLI ÖNERİLER ---
        const sortedResults = getSortedMatches(query, window.globalData);
        const topMatches = sortedResults.slice(0, 5); // İlk 5 sonucu göster

        if (topMatches.length > 0) {
            topMatches.forEach(item => {
                const code = item.code;
                const data = item.data;
                // Mevcut dile göre isim, yoksa İngilizce
                const name = data.names?.[window.currentLang || 'tr'] || data.names?.en;
                
                const customFlags = { "NC": "", "IC": "" };
                const flagUrl = customFlags[code] || `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

                const link = document.createElement("a");
                link.className = "list-group-item list-group-item-action suggestion-item";
                link.innerHTML = `
                    <img src="${flagUrl}" width="24" class="me-2 rounded shadow-sm" alt="${code}">
                    <span>${name}</span>
                    <small class="ms-auto opacity-50" style="font-size:0.7em">${code}</small>
                `;

                link.addEventListener("click", function() {
                    input.value = name; 
                    suggestionsBox.style.display = "none";
                    searchCountry(); 
                });

                suggestionsBox.appendChild(link);
            });
            suggestionsBox.style.display = "block";
        }
    });

    // Dışarı tıklama
    document.addEventListener("click", function(e) {
        if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = "none";
        }
    });
    
    // Input odaklanma
    input.addEventListener("focus", function() {
        if (this.value.length >= 2 && suggestionsBox.childElementCount > 0) {
            suggestionsBox.style.display = "block";
        }
    });
}

// --- 5. KARŞILAŞTIRMA SİSTEMİ (AYNEN KORUNDU) ---
window.addToComparison = function(code) {
    const t = (key) => window.uiTranslations?.[window.currentLang]?.[key] || key;

    // 1. Zaten Listede mi?
    if (comparisonList.includes(code)) {
        showNotification(t('toast_already_in_list') || "Bu ülke zaten listede!", "warning");
        return;
    }
    
    // 2. Limit Dolu mu?
    if (comparisonList.length >= 3) {
        showNotification(t('toast_max_limit') || "En fazla 3 ülke karşılaştırabilirsiniz.", "danger");
        return;
    }

    // 3. Ekle
    comparisonList.push(code);
    updateComparisonTray();
};

window.removeFromComparison = function(code) {
    comparisonList = comparisonList.filter(c => c !== code);
    updateComparisonTray();
};

window.updateComparisonTray = function() {
    const container = document.getElementById("compare-ui-container");
    const list = document.getElementById("comparison-list");
    
    if (!container || !list) return;

    if (comparisonList.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = "";

    // Dil Desteği
    const currentLang = window.currentLang || 'tr';
    const t = (key) => window.uiTranslations?.[currentLang]?.[key] || key;

    comparisonList.forEach(code => {
        let name = code;
        if(window.globalData && window.globalData[code]) {
            name = window.globalData[code].names?.[currentLang] || code;
        }
        const flagUrl = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

        const card = document.createElement("div");
        card.className = "compare-card fade-in";
        card.innerHTML = `
            <button class="btn-remove-card" onclick="removeFromComparison('${code}')" title="${t('btn_remove')}">
                <i class="fas fa-times"></i>
            </button>
            <img src="${flagUrl}" alt="${code}">
            <span>${name}</span>
        `;
        list.appendChild(card);
    });

    if (comparisonList.length >= 2) {
        const btnCompare = document.createElement("button");
        btnCompare.className = "btn btn-sm btn-primary shadow-sm ms-2 rounded-3 fw-bold";
        // Yerelleştirilmiş Buton Metni
        btnCompare.innerHTML = `<i class="fas fa-balance-scale me-1"></i>${t('tray_btn_compare')}`;
        btnCompare.onclick = openComparisonModal; 
        list.appendChild(btnCompare);
    }
}

function showNotification(msg, type = 'danger') {
    const toastEl = document.getElementById('notificationToast');
    const msgEl = document.getElementById('notificationMsg');
    const iconEl = document.getElementById('toast-icon');
    
    if (!toastEl || !msgEl) return;

    // A. Renk ve İkon Ayarla
    toastEl.className = `toast align-items-center text-bg-${type} border-0 shadow-lg rounded-4`;
    
    // İkon Seçimi
    if (type === 'danger') iconEl.className = "fas fa-exclamation-circle me-2 fs-5";
    else if (type === 'warning') iconEl.className = "fas fa-exclamation-triangle me-2 fs-5";
    else if (type === 'success') iconEl.className = "fas fa-check-circle me-2 fs-5";

    // B. Mesajı Yaz
    msgEl.innerText = msg;

    // C. Göster (Bootstrap Toast)
    if (typeof bootstrap !== 'undefined') {
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
        toast.show();
    }
}

// --- KARŞILAŞTIRMA MODALI (AYNEN KORUNDU) ---
function openComparisonModal() {
    const tableContainer = document.getElementById("comparison-table-container");
    if (!tableContainer || comparisonList.length < 2) return;

    const currentLang = window.currentLang || 'tr';
    const sfx = "_" + currentLang;
    const t = (key) => window.uiTranslations?.[currentLang]?.[key] || key;
    const globalData = window.globalData;

    // 1. METRİK TANIMLARI
    const metrics = [
        { id: 'capital', label: t('lbl_capital'), path: `geography.capital${sfx}`, type: 'text', cat: 'geo' },
        { id: 'cont', label: t('lbl_continent'), path: `geography.continent${sfx}`, type: 'text', cat: 'geo' },
        { id: 'area', label: t('lbl_area'), path: 'geography.area_sq_km', type: 'area', good: 'max', cat: 'geo' },
        { id: 'gov', label: t('lbl_gov'), path: `politics.government${sfx}`, type: 'text', cat: 'geo' },
        { id: 'zone', label: t('lbl_timezone'), path: 'geography.timezone', type: 'text', cat: 'geo' },
        
        { id: 'pop', label: t('lbl_pop'), path: 'demographics.total_population', type: 'num', good: 'max', cat: 'demo' },
        { id: 'life', label: t('lbl_life'), path: 'demographics.life_expectancy', type: 'num', good: 'max', cat: 'demo' },
        { id: 'birth', label: t('lbl_birth'), path: 'demographics.birth_rate', type: 'num', good: 'max', cat: 'demo' },
        { id: 'lang', label: t('lbl_lang'), path: `demographics.most_spoken_language${sfx}`, type: 'text', cat: 'demo' },
        
        { id: 'gdp', label: t('lbl_gdp'), path: 'economy.gdp_usd', type: 'currency', good: 'max', cat: 'eco' },
        { id: 'gdp_per', label: t('lbl_gdp_per'), path: 'economy.gdp_per_capita_usd', type: 'currency', good: 'max', cat: 'eco' },
        { id: 'inf', label: t('lbl_inf'), path: 'economy.inflation_rate', type: 'percent', good: 'min', cat: 'eco' },
        { id: 'unemp', label: t('lbl_unemp'), path: 'economy.unemployment_rate', type: 'percent', good: 'min', cat: 'eco' },
        { id: 'wage', label: t('lbl_wage'), path: 'economy.minimum_wage_usd', type: 'currency', good: 'max', cat: 'eco' },
        { id: 'curr', label: t('lbl_currency'), path: `economy.currency${sfx}`, type: 'text', cat: 'eco' },
        
        { id: 'rank', label: t('lbl_rank'), path: 'military.global_firepower_rank', type: 'rank', good: 'min', cat: 'mil' },
        { id: 'active', label: t('lbl_active'), path: 'military.active_personnel', type: 'num', good: 'max', cat: 'mil' },
        { id: 'reserve', label: t('lbl_reserve'), path: 'military.reserve_personnel', type: 'num', good: 'max', cat: 'mil' },
        { id: 'total', label: t('lbl_total'), path: 'military.total_personnel', type: 'num', good: 'max', cat: 'mil' },
        { id: 'budget', label: t('lbl_budget'), path: 'military.defense_budget_usd', type: 'currency', good: 'max', cat: 'mil' },

        // Yeni Kategoriler
        { id: 'emp', label: t('lbl_employment'), path: 'economy.employment_rate', type: 'percent', cat: 'socio' },
        { id: 'lit', label: t('lbl_literacy'), path: 'demographics.literacy_rate', type: 'percent', cat: 'socio' },

        { id: 'co2', label: t('lbl_co2'), path: 'energy_environment.co2_emissions_mt', type: 'num', cat: 'env' },
        { id: 'renew', label: t('lbl_renew'), path: 'energy_environment.renewable_energy_percent', type: 'percent', cat: 'env' },

        { id: 'net', label: t('lbl_internet'), path: 'technology.internet_users_percent', type: 'percent', cat: 'tech' },
        { id: 'mob', label: t('lbl_mobile'), path: 'technology.mobile_subscriptions_per_100', type: 'num', cat: 'tech' }
    ];

    // 2. SWITCH HTML
    const categories = [
        { id: 'geo', label: t('cat_geo'), disabled: false },
        { id: 'demo', label: t('cat_demo'), disabled: false },
        { id: 'eco', label: t('cat_eco'), disabled: false },
        { id: 'mil', label: t('cat_mil'), disabled: false },
        { id: 'socio', label: t('cat_socio'), disabled: true },
        { id: 'env', label: t('cat_env'), disabled: true },
        { id: 'tech', label: t('cat_tech'), disabled: true }
    ];

    let controlsHTML = `<div id="comparison-controls" class="d-flex flex-wrap gap-3 p-3 justify-content-center sticky-top" style="top:0; z-index:1020;">`;
    categories.forEach(cat => {
        const disabledAttr = cat.disabled ? 'disabled' : '';
        const checkedAttr = cat.disabled ? '' : 'checked';
        controlsHTML += `
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="modalSwitch-${cat.id}" ${checkedAttr} ${disabledAttr} onchange="toggleModalRows('${cat.id}')" style="cursor:pointer; accent-color: var(--ana-renk);">
                <label class="form-check-label small fw-bold ${cat.disabled ? 'opacity-50' : ''}" for="modalSwitch-${cat.id}">${cat.label}</label>
            </div>
        `;
    });
    controlsHTML += `</div>`;

    // 3. TABLO BAŞLIĞI
    let tableHTML = `
        <table class="table table-striped table-hover mb-0 text-center align-middle">
            <thead class="sticky-top" style="top: 58px; z-index: 1010;">
                <tr>
                    <th class="text-start ps-4 small text-uppercase opacity-75" style="width: 25%;">Metrik</th>
                    ${comparisonList.map(code => {
                        const name = globalData[code]?.names?.[currentLang] || code;
                        const flag = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
                        return `
                            <th style="min-width: 120px; padding: 10px;">
                                <img src="${flag}" width="28" class="d-block mx-auto mb-1 shadow-sm rounded">
                                <span class="small fw-bold">${name}</span>
                            </th>
                        `;
                    }).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    // 4. TABLO GÖVDESİ
    metrics.forEach(metric => {
        const rowValues = comparisonList.map(code => getNestedValue(globalData[code], metric.path));

        let winnerVal = null;
        if (metric.type !== 'text') {
            const validValues = rowValues.map(v => (v === undefined || v === null) ? null : Number(v)).filter(v => v !== null);
            if (validValues.length > 0) {
                if (metric.good === 'max') winnerVal = Math.max(...validValues);
                else if (metric.good === 'min') winnerVal = Math.min(...validValues);
            }
        }

        const isHidden = ['socio', 'env', 'tech'].includes(metric.cat) ? 'display:none;' : '';

        tableHTML += `<tr class="row-${metric.cat}" style="${isHidden}">
                        <td class="text-start ps-4 fw-bold small opacity-75">${metric.label}</td>`;
        
        comparisonList.forEach((code, index) => {
            let rawValue = rowValues[index];
            let displayValue = "-";
            let cellClass = "";

            if (rawValue !== undefined && rawValue !== null) {
                const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
                if (metric.type === 'text') displayValue = rawValue;
                else if (metric.type === 'num') displayValue = new Intl.NumberFormat(locale).format(rawValue);
                else if (metric.type === 'area') displayValue = new Intl.NumberFormat(locale).format(rawValue) + " km²";
                else if (metric.type === 'currency') displayValue = "$" + new Intl.NumberFormat(locale, { notation: "compact" }).format(rawValue);
                else if (metric.type === 'percent') displayValue = "%" + rawValue;
                else if (metric.type === 'rank') displayValue = "#" + rawValue;

                if (metric.type !== 'text' && winnerVal !== null && Number(rawValue) === winnerVal) {
                    cellClass = "val-winner";
                }
            }
            tableHTML += `<td class="${cellClass}">${displayValue}</td>`;
        });
        
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    tableContainer.innerHTML = controlsHTML + tableHTML;

    const modalEl = document.getElementById('comparisonModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

window.toggleModalRows = function(catId) {
    const isChecked = document.getElementById(`modalSwitch-${catId}`).checked;
    const rows = document.querySelectorAll(`.row-${catId}`);
    rows.forEach(row => {
        row.style.display = isChecked ? 'table-row' : 'none';
    });
};

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Yardımcı Hata Gösterici (searchCountry içinde kullanılıyor)
function showSearchError(msg) {
    const searchInput = document.getElementById("country-search");
    const errorMsg = document.getElementById("search-error-msg");
    const suggestionsBox = document.getElementById("search-suggestions");
    
    // 1. Önerileri GİZLE
    if(suggestionsBox) suggestionsBox.style.display = 'none';

    if(searchInput) {
        searchInput.classList.add('is-invalid');
        searchInput.focus();
    }
    
    if(errorMsg) {
        errorMsg.innerText = msg;
        errorMsg.style.display = 'block';
        
        setTimeout(() => {
            errorMsg.style.display = 'none';
            if(searchInput) searchInput.classList.remove('is-invalid');
        }, 3000);
    }
}

// Fonksiyonları Dışarı Aç
window.searchCountry = searchCountry;
window.resetSwitches = resetSwitches;
window.initSearchSuggestions = initSearchSuggestions;
window.initFilterListeners = initFilterListeners;
window.addToComparison = addToComparison;
window.removeFromComparison = removeFromComparison;
window.openComparisonModal = openComparisonModal;
window.updateComparisonTray = updateComparisonTray;