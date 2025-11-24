// DIJITAL ATLAS - ANA JAVASCRIPT MOTORU

// --- GLOBAL DEĞİŞKENLER ---
let activeDetailPopover = null; // Açık olan detay penceresi
let hoverTooltip = null;        // Mouse ile gezilen tooltip
let hoverTimer = null;          // Hover zamanlayıcı 
let globalData = {};            // Dünya verisi
let cursorX = 0;                // Mouse X koordinatı
let cursorY = 0;                // Mouse Y koordinatı

// --- 1. SAYFA YÜKLEME (SPA YÖNLENDİRME) ---
// Sayfa yenilenmeden içeriği yüklemesi için basit bir yönlendirme fonksiyonu
/* Bu fonksiyon, istenen HTML parçasını asenkron (Ana akıştan bağımsız) olarak çeker
DOM'a (Belge Nesne Modeli / Document Object Model) enjekte eder. */
async function loadPage(pageName) {
  const contentDiv = document.getElementById("app-content");
  try {
    const pageResponse = await fetch(`${pageName}.html`);
    if (!pageResponse.ok) throw new Error("Sayfa yüklenemedi");
    const html = await pageResponse.text();
    contentDiv.innerHTML = html;

    if (pageName === "world_map") {
      // Paralel veri yükleme stratejisi
      await loadData();   // Veriyi çek
      loadSVGMap();       // SVG haritayı yükle

    if(typeof updateUITexts === "function") updateUITexts();
    }
  } catch (error) {
    contentDiv.innerHTML = `<div class="alert alert-danger m-5">Hata: ${error.message}</div>`;
  }
}

// --- 2. VERİ ÇEKME (FETCH API) ---
async function loadData() {
  try {
    const response = await fetch("src/data/world.json");
    if (!response.ok) throw new Error("Veri bulunamadı");
    globalData = await response.json();
  } catch (error) {
    console.error(error);
    globalData = {};
  }
}

// --- 3. SVG YÜKLEME ---
/* "SVG dosyasını doğrudan 'inline HTML' olarak yüklüyoruz.
Bu sayede her bir ülkenin rengini CSS ile, tıklama olaylarını JS ile yönetebiliyoruz." */
async function loadSVGMap() {
  const placeholder = document.getElementById("svg-placeholder");
  try {
    const response = await fetch("src/assets/world.svg");
    if (!response.ok) throw new Error("Harita bulunamadı");
    const svgText = await response.text();

    // Spinner'ı kaldırıp yerine haritayı koyuyoruz
    if (placeholder) placeholder.outerHTML = svgText;

    const svgElement = document.querySelector("#map-container svg");
    if (svgElement) {
      svgElement.id = "world-map-svg";

      // Başlatıcılar
      createHoverTooltip();
      initMapInteractions();
      initPanZoom();
      initGlobalClicks();
      trackMouse();
    }
  } catch (error) {
    if (placeholder)
      placeholder.innerHTML = `<p class="text-danger">Hata: ${error.message}</p>`;
  }
}

// --- 4. ETKİLEŞİMLER (EVENT DELEGASYONLARI) ---
function initMapInteractions() {
  const mapSvg = document.getElementById("world-map-svg");
  if (!mapSvg) return;

  const paths = mapSvg.querySelectorAll("path");

  paths.forEach((path) => {
    // Bazı ülkeler grup (g) içinde olabilir, bunu kontrol ediyoruz
    const parentId = path.parentElement.getAttribute("id");
    const selfId = path.getAttribute("id");
    let countryCode = null;
    if (parentId && parentId.length === 2) {
        countryCode = parentId;
    } else {
        countryCode = selfId;
    }

    if (countryCode) {
      path.addEventListener("mouseenter", () => {
        if (hoverTimer) clearTimeout(hoverTimer);
        if (activeDetailPopover) return;    // Detay penceresi açıksa tooltip gösterme

        // Kullanıcı hızlıca mouse gezdirirken tooltip yanıp sönmesin diye 500ms (0.5s) gecikme
        hoverTimer = setTimeout(() => {
          const countryName =
            getCountryName(countryCode) ||
            path.getAttribute("name") ||
            countryCode;
          hoverTooltip.innerHTML = countryName;
          updateTooltipPosition();
          hoverTooltip.style.display = "block";
        }, 500);
      });

      path.addEventListener("mouseleave", () => {
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTooltip.style.display = "none";
      });

      path.addEventListener("click", (e) => {
        e.stopPropagation();
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTooltip.style.display = "none";
        showDetailPopover(path, countryCode);
      });
    }
  });
}

// --- 5. DETAYLI İÇERİK OLUŞTURUCU ---
function generateDetailContent(code, pathElement) {
    // Dil ayarlarını al
    const currentLang = window.currentLang || 'tr';
    const sfx = "_" + currentLang;
    const t = (key) => window.uiTranslations?.[currentLang]?.[key] || key;

    const data = globalData[code];
    const defaultName = pathElement.getAttribute("name") || code;
    
    if (!data)
        return `<strong>${defaultName}</strong><br><span class="text-muted small">${currentLang === 'tr' ? 'Veri girilmemiş.' : 'No data available.'}</span>`;

    // FlagCDN kullanarak bayrak URL'si oluşturma
    let flagUrl = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

    //Sayı formatlayıcılar
    const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
    const formatNum = (n) => (n ? new Intl.NumberFormat(locale).format(n) : "-");    
    const formatCompact = (n) => (n ? new Intl.NumberFormat(locale, { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 }).format(n) : "-");
    const currencyStandard = (n) => (n ? `$${formatNum(n)}` : "-");
    const currencyCompact = (n) => (n ? `$${formatCompact(n)}` : "-");

    // Veri parçalarını al (Veri yoksa "-" koyarak "null" görünmesini engelliyoruz.)
    const nameTr = data.names?.[currentLang] || defaultName;
    const nameEn = data.names?.en || "";
    const desc = data.general_info?.['description' + sfx] || "";
    const capital = data.geography?.['capital' + sfx] || "-";
    const continent = data.geography?.['continent' + sfx] || "-";
    const area = data.geography?.area_sq_km
        ? formatNum(data.geography.area_sq_km) + " km²"
        : "-";
    const gov = data.politics?.['government' + sfx] || "-";
    const indep = data.politics?.independence_date || "-";
    const gdp = data.economy?.gdp_usd ? currencyCompact(data.economy.gdp_usd) : "-";
    const gdpPer = data.economy?.gdp_per_capita_usd
        ? currencyStandard(data.economy.gdp_per_capita_usd)
        : "-";
    const inflation = data.economy?.inflation_rate
        ? `%${data.economy.inflation_rate}`
        : "-";
    const unemploy = data.economy?.unemployment_rate
        ? `%${data.economy.unemployment_rate}`
        : "-";
    const minWage = data.economy?.minimum_wage_usd
        ? currencyStandard(data.economy.minimum_wage_usd)
        : "-";
    const money = data.economy?.currency || "-";
    const population = data.demographics?.total_population
        ? formatNum(data.demographics.total_population)
        : "-";
    const lifeExp = data.demographics?.life_expectancy || "-";
    const lang = data.demographics?.most_spoken_language || "-";
    const birthRate = data.demographics?.birth_rate || "-";
    const fireRank = data.military?.global_firepower_rank || "-";
    const activeMil = data.military?.active_personnel
        ? formatNum(data.military.active_personnel)
        : "-";
    const reserveMil = data.military?.reserve_personnel
        ? formatNum(data.military.reserve_personnel)
        : "-";
    const totalMil = data.military?.total_personnel
        ? formatNum(data.military.total_personnel)
        : "-";
    const defBudget = data.military?.defense_budget_usd
        ? currencyCompact(data.military.defense_budget_usd)
        : "-";
    const intel = data.general_info?.intelligence_agency || "-";

    // Nüfus piramidi grafiğini oluşturma
    const pyramidHtml = generatePyramidChart(
        data.demographics?.population_pyramid);
    
    return `
        <div class="text-center mb-3">
            <img src="${flagUrl}" width="100" class="img-thumbnail mb-2 shadow-sm">
            <h5 class="fw-bold mb-0 text-dark">${nameTr}</h5>
            <small class="text-muted d-block">${nameEn}</small>
            <p class="small mt-2 mb-0 fst-italic text-secondary px-2 border-top pt-2" style="font-size: 0.8rem;">"${desc}"</p>
        </div>

        <div class="info-box">
            <h6 class="border-bottom pb-1 text-success fw-bold small"><i class="fas fa-globe-americas me-2"></i>${t('header_geo')}</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>${t('lbl_capital')}</strong> ${capital}</li>
                <li><strong>${t('lbl_continent')}</strong> ${continent}</li>
                <li><strong>${t('lbl_area')}</strong> ${area}</li>
                <li><strong>${t('lbl_gov')}</strong> ${gov}</li>
                <li><strong>${t('lbl_indep')}</strong> ${indep}</li>
            </ul>
        </div>

        <div class="info-box">
            <h6 class="border-bottom pb-1 text-primary fw-bold small"><i class="fas fa-users me-2"></i>${t('header_demo')}</h6>
            <ul class="list-unstyled small mb-2">
                <li><strong>${t('lbl_pop')}</strong> ${population}</li>
                <li><strong>${t('lbl_life')}</strong> ${lifeExp} ${currentLang === 'tr' ? 'Yıl' : 'Years'}</li>
                <li><strong>${t('lbl_birth')}</strong> ${birthRate} %</li>
                <li><strong>${t('lbl_lang')}</strong> ${lang}</li>
            </ul>
            
            <div class="mt-2 pt-2 border-top">
                <div class="d-flex justify-content-between small text-muted mb-1" style="font-size:0.6rem">
                    <span><i class="fas fa-male text-primary"></i> ${currentLang === 'tr' ? 'Erkek' : 'Male'}</span>
                    <span>${currentLang === 'tr' ? 'Yaş' : 'Age'}</span>
                    <span>${currentLang === 'tr' ? 'Kadın' : 'Female'} <i class="fas fa-female text-danger"></i></span>
                </div>
                ${pyramidHtml}
            </div>
        </div>

        <div class="info-box">
            <h6 class="border-bottom pb-1 text-warning fw-bold small"><i class="fas fa-coins me-2"></i>${t('header_eco')}</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>${t('lbl_gdp')}</strong> ${gdp}</li>
                <li><strong>${t('lbl_gdp_per')}</strong> ${gdpPer}</li>
                <li><strong>${t('lbl_inf')}</strong> ${inflation}</li>
                <li><strong>${t('lbl_unemp')}</strong> ${unemploy}</li>
                <li><strong>${t('lbl_wage')}</strong> ${minWage}</li>
                <li><strong>${t('lbl_currency')}</strong> ${money}</li>
            </ul>
        </div>

        <div class="info-box mb-0">
            <h6 class="border-bottom pb-1 text-danger fw-bold small"><i class="fas fa-shield-alt me-2"></i>${t('header_mil')}</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>${t('lbl_rank')}</strong> #${fireRank}</li>
                <li><strong>${t('lbl_active')}</strong> ${activeMil}</li>
                <li><strong>${t('lbl_reserve')}</strong> ${reserveMil}</li>
                <li><strong>${t('lbl_total')}</strong> ${totalMil}</li>
                <li><strong>${t('lbl_budget')}</strong> ${defBudget}</li>
                <li><strong>${t('lbl_intel')}</strong> ${intel}</li>
            </ul>
        </div>
    `;
}

// --- 6. PİRAMİT GRAFİĞİ OLUŞTURUCU ---
/* Burası projenin en karmaşık algoritmik kısmı. Ham veriyi alıp, 
en yüksek değeri buluyor (Normalization) ve her yaş grubu için
yüzdelik genişlikleri hesaplayarak CSS barlarına dönüştürüyor. */
function generatePyramidChart(pyramidData) {
  if (!pyramidData || !Array.isArray(pyramidData) || pyramidData.length === 0) {
    return '<div class="text-center text-muted small py-2">Veri Yok</div>';
  }

  // 1. Adım: Normalizasyon için maksimum değeri bul
  let maxVal = 0;
  pyramidData.forEach((g) => {
    const m = g.M || 0;
    const f = g.F || 0;
    if (m > maxVal) maxVal = m;
    if (f > maxVal) maxVal = f;
  });

  if (maxVal === 0)
    return '<div class="text-center text-muted small">Veri Hatası</div>';

  // 2. Adım: Veriyi ters çevir (Yaşlılar üstte görünsün)
  const sortedData = [...pyramidData].reverse();

  // 3. Adım: Genişlik yüzdesini hesapla
  let html = '<div class="pyramid-container">';
  sortedData.forEach((group) => {
    const wM = (group.M / maxVal) * 100;
    const wF = (group.F / maxVal) * 100;

  // 4. Adım: Hesaplanan değerlerle HTML oluştur
  html += `
            <div class="pyramid-row">
                <div class="pyramid-bar-m">
                    <div class="bar-fill bar-m" 
                        style="width: 0%; transition: width 2.0s ease-out;" 
                        data-width="${wM}%" 
                        title="Erkek: ${new Intl.NumberFormat().format(
                          group.M
                        )}"></div>
                </div>
                <div class="pyramid-label">${group.Age}</div>
                <div class="pyramid-bar-f">
                    <div class="bar-fill bar-f" 
                        style="width: 0%; transition: width 2.0s ease-out;" 
                        data-width="${wF}%" 
                        title="Kadın: ${new Intl.NumberFormat().format(
                          group.F
                        )}"></div>
                </div>
            </div>
        `;
  });
  html += "</div>";
  return html;
}

// --- 7. DETAY POPOVER GÖSTERİCİ ---
function showDetailPopover(element, code) {
  // Önceki popover varsa kapat (Singleton tasarım kalıbı yaklaşımı)
  if (activeDetailPopover) {
    activeDetailPopover.dispose();
    activeDetailPopover = null;
  }

  const content = generateDetailContent(code, element);

  // Bootstrap Popover başlatıcı
  const popover = new bootstrap.Popover(element, {
    trigger: "manual",
    container: "#map-container",
    html: true,
    sanitize: false,
    content: content,
    placement: "auto",
  });

  element.addEventListener(
    "shown.bs.popover",
    function () {
      const popoverId = element.getAttribute("aria-describedby");
      const popoverEl = document.getElementById(popoverId);

      if (popoverEl) {
        // Çubuk animasyonlarını başlat (width: 0 -> width: calculated)
        const bars = popoverEl.querySelectorAll(".bar-fill");

        bars.forEach((bar) => {
          const targetWidth = bar.getAttribute("data-width");
          bar.style.width = targetWidth;
        });
      }
    },
{
      once: true,
    }
  );

  popover.show();
  activeDetailPopover = popover;
}

// --- ZOOM & PAN ---
let currentScale = 1,
  currentTranslateX = 0,
  currentTranslateY = 0,
  isDragging = false,
  startX,
  startY;

function updateTransform() {
  const mapSvg = document.getElementById("world-map-svg");
  if (mapSvg)
    mapSvg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}

function initPanZoom() {
  const mapContainer = document.getElementById("map-container");

  // Mouse wheel ile zoom
  mapContainer.addEventListener("wheel", (e) => {
    if (e.target.closest(".popover")) return;
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    // Limitli zoom aralığı
    currentScale = Math.max(0.5, Math.min(currentScale + delta, 5));
    updateTransform();
  });

  // Sürükleme mantığı
  mapContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest(".popover")) return;
    isDragging = true;
    startX = e.clientX - currentTranslateX;
    startY = e.clientY - currentTranslateY;
    mapContainer.style.cursor = "grabbing";
    document.getElementById("world-map-svg").classList.add("no-transition");
  });
  mapContainer.addEventListener("mouseup", () => {
    isDragging = false;
    mapContainer.style.cursor = "grab";
    document.getElementById("world-map-svg").classList.remove("no-transition");
  });
  mapContainer.addEventListener("mouseleave", () => {
    isDragging = false;
    mapContainer.style.cursor = "grab";
    const svg = document.getElementById("world-map-svg");
    if (svg) svg.classList.remove("no-transition");
  });
  mapContainer.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    let newX = e.clientX - startX,
      newY = e.clientY - startY;
    const limitX = 500 * currentScale,
      limitY = 300 * currentScale;
    currentTranslateX = Math.max(-limitX, Math.min(newX, limitX));
    currentTranslateY = Math.max(-limitY, Math.min(newY, limitY));
    updateTransform();
  });
}

function zoomMap(factor) {
  // Zoom butonları ile kontrol
  currentScale = Math.max(0.5, Math.min(currentScale * factor, 5));
  updateTransform();
}

function resetMap() {
  // Haritayı varsayılan konuma ve zoom değerine sıfırla
  currentScale = 1;
  currentTranslateX = 0;
  currentTranslateY = 0;
  updateTransform();
}

// --- YARDIMCILAR ---
function createHoverTooltip() {
  if (!document.getElementById("custom-hover-tooltip")) {
    hoverTooltip = document.createElement("div");
    hoverTooltip.id = "custom-hover-tooltip";
    hoverTooltip.className = "floating-tooltip";
    document.body.appendChild(hoverTooltip);
  } else {
    hoverTooltip = document.getElementById("custom-hover-tooltip");
  }
}

function trackMouse() {
  document.addEventListener("mousemove", (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    if (hoverTooltip && hoverTooltip.style.display === "block") {
      updateTooltipPosition();
    }
  });
}

function updateTooltipPosition() {
  hoverTooltip.style.left = cursorX + 15 + "px";
  hoverTooltip.style.top = cursorY + 15 + "px";
}

function initGlobalClicks() {
  document.getElementById("map-container").addEventListener("click", (e) => {
    if (e.target.closest(".popover")) return;
    if (activeDetailPopover) {
      activeDetailPopover.dispose();
      activeDetailPopover = null;
    }
  });
}

function getCountryName(code) {
  const lang = window.currentLang || "tr";
  
  if (globalData[code] && globalData[code].names)
    return globalData[code].names[lang];
  return null;
}

function toggleTheme() {
  const html = document.documentElement,
    icon = document.getElementById("theme-icon");
  if (html.getAttribute("data-theme") === "light") {
    html.setAttribute("data-theme", "dark");
    icon.className = "fas fa-sun";
  } else {
    html.setAttribute("data-theme", "light");
    icon.className = "fas fa-moon";
  }
}

// --- SAYFA YÜKLEME BAŞLANGICI ---
document.addEventListener("DOMContentLoaded", () => {
  loadPage("world_map");
});
