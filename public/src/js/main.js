// DIJITAL ATLAS - ANA JAVASCRIPT MOTORU

// --- GLOBAL DEĞİŞKENLER ---
let activeDetailPopover = null; // Açık olan detay penceresi
let hoverTooltip = null;        // Mouse ile gezilen tooltip
let hoverTimer = null;          // Hover zamanlayıcı 
let globalData = {};            // Dünya verisi
let cursorX = 0;                // Mouse X koordinatı
let cursorY = 0;                // Mouse Y koordinatı
let selectedCountryCode = null; // Seçili ülke kodu

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
    initUITooltips();
    if (pageName === "world_map") {
      // Paralel veri yükleme stratejisi
      await loadData();   // Veriyi çek
      loadSVGMap();       // SVG haritayı yükle
    }
    
    if(typeof updateUITexts === "function") updateUITexts();
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
      setTimeout(createCountryLabels, 500);
    }
  } catch (error) {
    if (placeholder)
      placeholder.innerHTML = `<p class="text-danger">Hata: ${error.message}</p>`;
  }
}

// --- 4. ETKİLEŞİMLER (SEÇİM & PARLATMA - FINAL) ---
function initMapInteractions() {
  const mapSvg = document.getElementById("world-map-svg");
  if (!mapSvg) return;

  const svgNS = "http://www.w3.org/2000/svg";
  
  // Vinyet Gradyanı
  let defs = mapSvg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(svgNS, "defs");
    mapSvg.prepend(defs);
  }
  if (!document.getElementById("vignette-gradient")) {
      const radGrad = document.createElementNS(svgNS, "radialGradient");
      radGrad.setAttribute("id", "vignette-gradient");
      radGrad.setAttribute("cx", "50%");
      radGrad.setAttribute("cy", "50%");
      radGrad.setAttribute("r", "70%");
      radGrad.innerHTML = `<stop offset="60%" stop-color="transparent" /><stop offset="100%" stop-color="rgba(0,0,0,0.6)" />`;
      defs.appendChild(radGrad);
  }

  // YARDIMCI: Ülkeyi Boya / Animasyonu Oynat
  const paintCountry = (code, animate = false) => {
      const targetElement = document.getElementById(code);
      const groupElement = document.querySelector(`g#${code}`);
      
      let targets = [];
      if (groupElement) targets = Array.from(groupElement.querySelectorAll("path"));
      else if (targetElement) targets = [targetElement];

      if (targets.length === 0) return;

      targets.forEach((target, index) => {
          try {
              const bbox = target.getBBox();
              const uniqueId = `flag-pattern-${code}-${index}`;
              
              if (typeof createFlagPattern === 'function') {
                  const imgEl = createFlagPattern(uniqueId, bbox, code); 
                  target.style.fill = `url(#${uniqueId})`;
                  target.style.fillOpacity = "1";
                  
                  if (animate && imgEl) {
                      // 1. Class'ı kaldır
                      imgEl.classList.remove("flag-anim");
                      
                      // 2. Bir sonraki karede class'ı tekrar ekle (Reflow garantisi)
                      requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                              imgEl.classList.add("flag-anim");
                          });
                      });
                  }
              } else {
                  target.style.fill = "#ffc107"; 
              }
          } catch (e) { console.error(e); }
      });
  };

  // YARDIMCI: Temizle
  const clearCountry = (code) => {
      if (!code) return;
      const targetElement = document.getElementById(code);
      const groupElement = document.querySelector(`g#${code}`);
      let targets = [];
      if (groupElement) targets = Array.from(groupElement.querySelectorAll("path"));
      else if (targetElement) targets = [targetElement];

      targets.forEach((target) => {
          target.style.fill = ""; 
          // (Opsiyonel) Animasyon sınıfını temizle ki sonraki girişte temiz başlasın
          // Ama createFlagPattern içindeki resimden silmek daha zordur, paintCountry zaten siliyor.
      });
  };

  // GLOBAL FONKSİYONLAR
  window.highlightCountry = (code) => {
      if (selectedCountryCode && selectedCountryCode !== code) {
          window.resetCountry(selectedCountryCode);
      }
      selectedCountryCode = code;
      paintCountry(code, true);
  };

  window.resetCountry = (code) => {
      clearCountry(code);
  };

  // EVENT LISTENERS
  mapSvg.addEventListener('click', (e) => {
      const target = e.target.closest('path');
      if (!target) {
          if (selectedCountryCode) {
              window.resetCountry(selectedCountryCode);
              selectedCountryCode = null;
          }
          if (activeDetailPopover) {
              activeDetailPopover.dispose();
              activeDetailPopover = null;
          }
          return;
      }

      let code = target.getAttribute("id");
      if (!code || code.length !== 2) {
          if (target.parentElement.id.length === 2) code = target.parentElement.id;
      }

      if (code) {
          e.stopPropagation();
          window.highlightCountry(code);
          showDetailPopover(target, code);
      }
  });

  mapSvg.addEventListener('mouseover', (e) => {
      const target = e.target.closest('path');
      if (!target) return;

      let code = target.getAttribute("id");
      if (!code || code.length !== 2) {
          if (target.parentElement.id.length === 2) code = target.parentElement.id;
      }

      if (code) {
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => {
              const name = getCountryName(code);
              if (hoverTooltip && name) {
                  hoverTooltip.innerHTML = name;
                  updateTooltipPosition();
                  hoverTooltip.style.display = "block";
              }
          }, 100);

          // Sadece seçili değilse animasyonu oynat
          if (selectedCountryCode !== code) {
              paintCountry(code, true); 
          }
      }
  });

  mapSvg.addEventListener('mouseout', (e) => {
      const target = e.target.closest('path');
      if (!target) return;

      let code = target.getAttribute("id");
      if (!code || code.length !== 2) {
          if (target.parentElement.id.length === 2) code = target.parentElement.id;
      }

      if (code) {
          if (hoverTimer) clearTimeout(hoverTimer);
          if (hoverTooltip) hoverTooltip.style.display = "none";

          if (selectedCountryCode !== code) {
              clearCountry(code);
          }
      }
  });
}
// --- DESEN OLUŞTURUCU (Eğer kodunuzda eksikse buraya ekleyin) ---
function createFlagPattern(uniqueId, bbox, countryCode) {
    const mapSvg = document.getElementById("world-map-svg");
    if (!mapSvg) return null; // Güvenlik önlemi

    const svgNS = "http://www.w3.org/2000/svg";
    const xlinkNS = "http://www.w3.org/1999/xlink";
    
    // <defs> kontrolü
    let defs = mapSvg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS(svgNS, "defs");
        mapSvg.prepend(defs);
    }

    // Desen zaten varsa, içindeki mevcut resmi döndür
    const existingPattern = document.getElementById(uniqueId);
    if (existingPattern) {
        return existingPattern.querySelector("image");
    }

    const customFlags = {
        "NC": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg",
        "IC": "https://upload.wikimedia.org/wikipedia/commons/8/8c/Flag_of_the_Canary_Islands_%28simple%29.svg"
    };
    const flagUrl = customFlags[countryCode] || `https://flagcdn.com/w640/${countryCode.toLowerCase()}.png`;

    const pattern = document.createElementNS(svgNS, "pattern");
    pattern.setAttribute("id", uniqueId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("x", bbox.x);
    pattern.setAttribute("y", bbox.y);
    pattern.setAttribute("width", bbox.width);
    pattern.setAttribute("height", bbox.height);
    pattern.setAttribute("preserveAspectRatio", "none"); 

    // Arka plan (Gri zemin - bayrak yüklenene kadar)
    const bgRect = document.createElementNS(svgNS, "rect");
    bgRect.setAttribute("width", bbox.width);
    bgRect.setAttribute("height", bbox.height);
    bgRect.setAttribute("fill", "#cccccc");

    // Bayrak Resmi
    const img = document.createElementNS(svgNS, "image");
    img.setAttribute("href", flagUrl);
    img.setAttributeNS(xlinkNS, "href", flagUrl);
    img.setAttribute("width", bbox.width);
    img.setAttribute("height", bbox.height);
    img.setAttribute("preserveAspectRatio", "xMidYMid slice");

    // Vinyet (Gölge)
    const overlay = document.createElementNS(svgNS, "rect");
    overlay.setAttribute("width", bbox.width);
    overlay.setAttribute("height", bbox.height);
    overlay.setAttribute("fill", "url(#vignette-gradient)");

    pattern.appendChild(bgRect);
    pattern.appendChild(img); // Resmi desene ekle
    pattern.appendChild(overlay);
    defs.appendChild(pattern);

    return img; // KRİTİK NOKTA: Resmi geri döndür
}

// --- 5. ÜLKE İSMİ OLUŞTURUCU ---
function createCountryLabels() {
    if (!globalData || Object.keys(globalData).length === 0) {
        setTimeout(createCountryLabels, 500);
        return;
    }
    const mapSvg = document.getElementById("world-map-svg");
    if (!mapSvg) return;

    // Temizlik
    const existingGroup = document.getElementById("label-group");
    if (existingGroup) existingGroup.remove();

    const svgNS = "http://www.w3.org/2000/svg";
    const labelGroup = document.createElementNS(svgNS, "g");
    labelGroup.id = "label-group";
    mapSvg.appendChild(labelGroup);

    // Manuel Düzeltmeler (Aynen koruyoruz)
    const manualCorrections = {
    // --- Sorunlu Büyük Ülkeler (Denizaşırı topraklar yüzünden kayanlar) ---
    
    // ABD: Hawaii yüzünden merkez pasifikte kalıyor. Bayağı sağa (Doğuya) ve biraz yukarı çekiyoruz.
    "US": { x: -5, y: -15 },   

    // Fransa: Guyanadan dolayı merkez okyanusta. Sağa (Avrupa'ya) ve Yukarı çekiyoruz.
    "FR": { x: 5, y: 0 },   

    // Hollanda: Karayipler yüzünden aşağı kayıyor. Yukarı çekiyoruz.
    "NL": { x: 0, y: 0 },    

    // --- İskandinavya Ayarları ---
    
    // İsveç: Merkez denize kayıyor, biraz sola (batıya) ve hafif yukarı alalım.
    "SE": { x: -10, y: 5 },    

    // Norveç: Şekli çok ince uzun, sola ve aşağı çekerek İsveç'ten uzaklaştırıyoruz.
    "NO": { x: -30, y: 20 },   

    // --- Diğer Düzeltmeler ---
    "GN": { x: 10, y: 0 },     // Gine (Kıyıdan içeri)
    "AT": { x: 5, y: 2 },      // Avusturya
    "CA": { x: -30, y: 0 },    // Kanada (Kuzey adalarından anakaraya)
    "CL": { x: -20, y: 0 },     // Şili (İnce uzun, kıyıdan içeri)
    "JP": { x: 15, y: 0 },    // Japonya
    "ID": { x: 100, y: 0 },     // Endonezya
    "PH": { x: 5, y: 20 },      // Filipinler
    "NZ": { x: 25, y: -10 },     // Yeni Zelanda
    "GR": { x: -2, y: 0 },      // Yunanistan (Adalardan anakaraya)
    "IT": { x: 5, y: 5 },     // İtalya
    "HR": { x: 0, y: -7 },     // Hırvatistan (Hilal şekli)
    "VN": { x: 15, y: 0 },      // Vietnam
    "PT": { x: 0, y: 0 },     // Portekiz (İspanya'dan uzaklaştır)
    "TH": { x: 0, y: -12 },    // Tayland: Biraz Yukarı
    "NP": { x: 0, y: 3 },      // Nepal: Biraz Aşağı
    "IN": { x: -10, y: 0 },    // Hindistan: Biraz Sola
    "PK": { x: 10, y: 0 },     // Pakistan: Biraz Sağa
    "AF": { x: -8, y: 0 },     // Afganistan: Biraz Sola
    "CM": { x: 8, y: 0 },      // Kamerun: Biraz Sağa
    "CG": { x: 8, y: 0 },      // Kongo Cumhuriyeti: Biraz Sağa
    "NA": { x: -10, y: 0 },    // Namibya: Biraz Sola
    "MZ": { x: 0, y: -12 },    // Mozambik: Biraz Yukarı
    "ZM": { x: 0, y: 8 },      // Zambiya: Biraz Aşağı
    "MW": { x: -1, y: 0 }      // Malavi: Biraz Sola
    };

    // Ülke verilerini topla
    const countryMap = {}; 
    const paths = mapSvg.querySelectorAll("path");
    
    paths.forEach(path => {
        let code = path.getAttribute("id");
        const parent = path.parentElement;
        if (!code || code.length !== 2) {
            if (parent && parent.tagName === "g" && parent.id.length === 2) code = parent.id;
            else return;
        }
        try {
            const bbox = path.getBBox();
            const area = bbox.width * bbox.height;
            if (!countryMap[code]) countryMap[code] = { code: code, maxArea: 0, bestPath: null };
            if (area > countryMap[code].maxArea) {
                countryMap[code].maxArea = area;
                countryMap[code].bestPath = path;
            }
        } catch (e) { }
    });

    const sortedCountries = Object.values(countryMap);

    sortedCountries.forEach(country => {
        // Çok çok küçük adaları yine filtreleyelim (İsteğe bağlı)
        if (country.maxArea < 10) return; 

        const name = getCountryName(country.code);
        if (!name) return;

        const bbox = country.bestPath.getBBox();
        let centerX = bbox.x + bbox.width / 2;
        let centerY = bbox.y + bbox.height / 2;

        if (manualCorrections[country.code]) {
            centerX += manualCorrections[country.code].x;
            centerY += manualCorrections[country.code].y;
        }

        // --- KRİTİK NOKTA: BÜYÜKLÜK KONTROLÜ ---
        // Eşik değerini 350 birim belirledik. 
        // Türkiye, Almanya, Fransa gibi ülkeler > 350'dir (Tier 1).
        // Belçika, Balkan ülkeleri < 350'dir (Tier 2).
        const tierClass = country.maxArea > 350 ? "label-tier-1" : "label-tier-2";

        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("x", centerX);
        text.setAttribute("y", centerY);
        // Sınıfı dinamik ekliyoruz:
        text.setAttribute("class", `country-label ${tierClass}`);
        text.setAttribute("data-code", country.code);
        text.textContent = name;

        labelGroup.appendChild(text);
    });
}

// --- DİL GÜNCELLEYİCİ ---
// Dil değiştirme fonksiyonunuzun (muhtemelen lang.js içindedir veya main.js'de tetikleniyordur)
// en sonuna bu fonksiyonu çağırın: updateLabelsLanguage()
function updateLabelsLanguage() {
    const labels = document.querySelectorAll(".country-label");
    labels.forEach(label => {
        const code = label.getAttribute("data-code");
        if (code) {
            const newName = getCountryName(code);
            if (newName) label.textContent = newName;
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
        return `<strong>${defaultName}</strong><br><span class="text-muted small">${t('no_data')}</span>`;

    // FlagCDN kullanarak bayrak URL'si oluşturma
    const customFlags = {
      "NC": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg",
      "IC": "https://upload.wikimedia.org/wikipedia/commons/8/8c/Flag_of_the_Canary_Islands_%28simple%29.svg"
    }
    let flagUrl = customFlags[code] || `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

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
    const timezone = data.geography?.timezone || "-";
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
    const money = data.economy?.['currency' + sfx] || "-";
    const population = data.demographics?.total_population
        ? formatNum(data.demographics.total_population)
        : "-";
    const lifeExp = data.demographics?.life_expectancy || "-";
    const langSpoken = data.demographics?.['most_spoken_language' + sfx] || "-";
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
                <li><strong>${t('lbl_timezone')}</strong> ${timezone}</li>
                <li><strong>${t('lbl_indep')}</strong> ${indep}</li>
            </ul>
        </div>

        <div class="info-box">
            <h6 class="border-bottom pb-1 text-primary fw-bold small"><i class="fas fa-users me-2"></i>${t('header_demo')}</h6>
            <ul class="list-unstyled small mb-2">
                <li><strong>${t('lbl_pop')}</strong> ${population}</li>
                <li><strong>${t('lbl_life')}</strong> ${lifeExp} ${currentLang === 'tr' ? 'Yıl' : 'Years'}</li>
                <li><strong>${t('lbl_birth')}</strong> ${birthRate}</li>
                <li><strong>${t('lbl_lang')}</strong> ${langSpoken}</li>
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

        <div class="text-center text-muted mt-2 pt-2 border-top" style="font-size: 0.65rem;">
            <i class="fas fa-info-circle me-1"></i> ${t('lbl_data_year') || 'Veriler 2024 yılına aittir.'}
        </div>
    `;
}

// --- 6. PİRAMİT GRAFİĞİ OLUŞTURUCU ---
/* Burası projenin en karmaşık algoritmik kısmı. Ham veriyi alıp, 
en yüksek değeri buluyor (Normalization) ve her yaş grubu için
yüzdelik genişlikleri hesaplayarak CSS barlarına dönüştürüyor. */
function generatePyramidChart(pyramidData) {
  const lang = window.currentLang || 'tr';
  const noDataMsg = window.uiTranslations?.[lang]?.['no_data'] || "Veri Yok";

if (!pyramidData || !Array.isArray(pyramidData) || pyramidData.length === 0) {
    return `<div class="text-center text-muted small py-2">${noDataMsg}</div>`;
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
    container: "body",
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

function searchCountry() {
    const searchInput = document.getElementById("country-search");
    if (!searchInput) return;
    const query = searchInput.value.trim().toLocaleLowerCase('tr-TR');
    if (!query) return;

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
            // A. HARİTAYI SIFIRLA (Kullanıcı İsteği)
            if (typeof resetMap === 'function') {
                // Reset işlemi anlık olsun, animasyon girmesin ki zoom hesaplaması karışmasın
                const svgEl = document.getElementById("world-map-svg");
                svgEl.style.transition = "none"; 
                resetMap();
                
                // Tarayıcıya değişikliği işlemesi için minik bir nefes (reflow) yaptıralım
                void svgEl.offsetWidth; 
            }

            // B. ZOOM VE SEÇİM YAP
            // setTimeout ile çağırıyoruz ki reset işlemi görsel olarak bitsin
            setTimeout(() => {
                zoomToCountry(path, foundCode);
                if (window.highlightCountry) window.highlightCountry(foundCode);
                
                // Menüyü kapat
                const toolsMenu = document.getElementById('toolsMenu');
                if (toolsMenu && typeof bootstrap !== 'undefined') {
                    bootstrap.Collapse.getOrCreateInstance(toolsMenu).hide();
                    const toolsBtn = document.getElementById('tools-btn');
                    if(toolsBtn) toolsBtn.setAttribute('aria-expanded', 'false');
                }
            }, 50); // 50ms yeterli

            // Detay penceresini zoom bitince aç (1.2s sonra)
            setTimeout(() => {
                showDetailPopover(path, foundCode);
            }, 1000);

            searchInput.value = "";
            searchInput.blur();
        } else {
             alert("Harita verisi eksik.");
        }
    } else {
        alert("Ülke bulunamadı!");
    }
}
// --- 2. SIFIRLA (RESET) FONKSİYONU ---
function resetSwitches() {
    // A. Arama Kutusunu Temizle
    const searchInput = document.getElementById("country-search");
    if(searchInput) searchInput.value = "";

    // B. Radyo Butonlarını Sıfırla (Tümü / filterAll)
    const filterAll = document.getElementById("filterAll");
    if(filterAll) filterAll.checked = true;
    // (Burada ileride harita filtrelerini temizleyen bir fonksiyon çağıracağız: resetMapFilters() gibi)

    // C. Checkbox/Switchleri Varsayılan Ayara Döndür
    // Varsayılan olarak açık olmasını istediklerimiz: Geo, Demo, Eco, Mil (HTML'deki yapıya göre)
    const defaults = ["showGeo", "showDemo", "showEco", "showMil"];
    
    // Tüm switchleri bul
    const allSwitches = document.querySelectorAll('.form-check-input[type="checkbox"]');
    
    allSwitches.forEach(sw => {
        if (defaults.includes(sw.id)) {
            sw.checked = true;
        } else {
            sw.checked = false;
        }
    });

    // (Opsiyonel) Haritayı varsayılan konuma getir
    resetMap(); 
}

// --- ZOOM & PAN (MOUSE TEKERLEĞİ İÇİN DÜZELTİLMİŞ) ---
let currentScale = 1,
  currentTranslateX = 0,
  currentTranslateY = 0,
  isDragging = false,
  startX,
  startY,
  zoomTimeout; // Animasyonu geri açmak için zamanlayıcı

function updateTransform() {
  const mapSvg = document.getElementById("world-map-svg");
  if (mapSvg) {
    mapSvg.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
  }
  
  // LOD (Level of Detail) Kontrolü
  const mapContainer = document.getElementById("map-container");
  if (mapContainer) {
      mapContainer.style.setProperty('--map-scale', currentScale);
      
      mapContainer.classList.remove("zoom-medium", "zoom-high");
      if (currentScale > 1.5) mapContainer.classList.add("zoom-medium");
      if (currentScale > 3.5) mapContainer.classList.add("zoom-high");
  }
}

// --- MOUSE KONTROLLERİ (HIZLI & AKICI) ---
function initPanZoom() {
  const mapContainer = document.getElementById("map-container");
  
  // 1. MOUSE WHEEL (ZOOM)
  mapContainer.addEventListener("wheel", (e) => {
    if (e.target.closest(".popover")) return;
    e.preventDefault();

    const mapSvg = document.getElementById("world-map-svg");
    if (!mapSvg) return;

    // A. HIZLI MOD (Scroll Sırasında)
    // 0.1s transition: "Küt" diye atlamaz, akıcı hissettirir ama sakız gibi uzamaz.
    mapSvg.style.transition = "transform 0.15s ease-out"; 
    
    // B. NORMALE DÖNÜŞ (Scroll Bittiğinde)
    // 200ms boyunca yeni hareket gelmezse, yumuşak moda (0.7s) geri dön.
    clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => {
        mapSvg.style.transition = "transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    }, 200);

    // C. HESAPLAMALAR (Sol-Üst Orijin Uyumlu)
    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Mouse'un altındaki dünya koordinatı (sabit kalmalı)
    const worldX = (mouseX - currentTranslateX) / currentScale;
    const worldY = (mouseY - currentTranslateY) / currentScale;

    // Zoom miktarı
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = currentScale + (delta * currentScale);
    
    // Sınırlar
    newScale = Math.max(0.7, Math.min(newScale, 20));

    // Yeni Konum (Mouse imlecini koruyacak şekilde)
    currentTranslateX = mouseX - (worldX * newScale);
    currentTranslateY = mouseY - (worldY * newScale);

    currentScale = newScale;
    updateTransform();
  }, { passive: false });

  // 2. SÜRÜKLEME (DRAG)
  mapContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest(".popover")) return;
    isDragging = true;
    startX = e.clientX - currentTranslateX;
    startY = e.clientY - currentTranslateY;
    mapContainer.style.cursor = "grabbing";
    
    // Sürüklerken gecikme olmaması için transition'ı kapatıyoruz (En doğrusu budur)
    const mapSvg = document.getElementById("world-map-svg");
    if(mapSvg) mapSvg.style.transition = "none";
  });

  const stopDrag = () => {
    if(isDragging) {
        isDragging = false;
        mapContainer.style.cursor = "grab";
        
        // Sürükleme bitti, yumuşak animasyonu geri aç
        const mapSvg = document.getElementById("world-map-svg");
        if(mapSvg) {
             // Tarayıcıya bir "nefes" (reflow) aldırıp öyle açıyoruz ki atlama yapmasın
             requestAnimationFrame(() => {
                 mapSvg.style.transition = "transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
             });
        }
    }
  };

  mapContainer.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    // Sürüklerken "none" olduğundan emin ol
    const mapSvg = document.getElementById("world-map-svg");
    if(mapSvg && mapSvg.style.transition !== 'none') {
        mapSvg.style.transition = 'none';
    }

    currentTranslateX = e.clientX - startX;
    currentTranslateY = e.clientY - startY;
    updateTransform();
  });

  mapContainer.addEventListener("mouseup", stopDrag);
  mapContainer.addEventListener("mouseleave", stopDrag);
}

function zoomMap(factor) {
  const mapContainer = document.getElementById("map-container");
  const mapSvg = document.getElementById("world-map-svg");
  if (!mapContainer || !mapSvg) return;

  // 1. Geçiş efektini aç (Butonla basınca animasyonlu olsun)
  mapSvg.style.transition = "transform 0.5s ease-out";

  // 2. Ekranın merkezini bul
  const rect = mapContainer.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // 3. Mevcut merkezin "Dünya Koordinatı"nı bul
  // Formül: (EkranMerkezi - Translate) / Scale
  const worldX = (centerX - currentTranslateX) / currentScale;
  const worldY = (centerY - currentTranslateY) / currentScale;

  // 4. Yeni Scale hesapla
  let newScale = currentScale * factor;
  newScale = Math.max(0.7, Math.min(newScale, 20)); // Sınırlar

  // 5. Yeni Translate hesapla (Merkezi sabit tutmak için)
  // Formül: EkranMerkezi - (DünyaNoktası * YeniScale)
  currentTranslateX = centerX - (worldX * newScale);
  currentTranslateY = centerY - (worldY * newScale);
  
  currentScale = newScale;
  updateTransform();
}

function resetMap() {
  const mapSvg = document.getElementById("world-map-svg");
  if(mapSvg) mapSvg.style.transition = "transform 0.8s ease-in-out";
  
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

function initUITooltips() {
  const triggers = document.querySelectorAll('[data-tooltip-text]');

  triggers.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      if (hoverTimer) clearTimeout(hoverTimer); // Haritadan kalan zamanlayıcı varsa temizle (Çakışmayı önle)

      const text = btn.getAttribute("data-tooltip-text");
      if (hoverTooltip && text) {
        hoverTooltip.innerHTML = text;
        hoverTooltip.style.display = "block";
        updateTooltipPosition();  // Mouse hareketini beklemeden hemen konumla
      }
    });

    btn.addEventListener("mouseleave", () => {
      if (hoverTooltip) hoverTooltip.style.display = "none";
    });
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

// --- AKILLI ZOOM (ARAMA İÇİN - SOL ÜST ORİJİN) ---
function zoomToCountry(pathElement, code) {
    const mapContainer = document.getElementById("map-container");
    const mapSvg = document.getElementById("world-map-svg"); 
    if (!mapContainer || !mapSvg) return;

    // A. Animasyonu Aç
    mapSvg.style.transition = "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

    // B. Oran Hesabı (1 SVG birimi = Kaç Piksel?)
    // getBBox yerine viewBox kullanmak en güvenlisidir
    const viewBox = mapSvg.viewBox.baseVal;
    const vbW = (viewBox && viewBox.width > 0) ? viewBox.width : 2000; // Yedek 2000
    // SVG'nin şu anki genişliği (Scale 1 iken)
    const clientWidth = mapSvg.clientWidth || mapContainer.clientWidth;
    const baseRatio = clientWidth / vbW;

    // C. Hedefin Merkezini Bul (SVG Koordinatı)
    const bbox = pathElement.getBBox();
    let cx = bbox.x + (bbox.width / 2);
    let cy = bbox.y + (bbox.height / 2);

    // Manuel Düzeltme
    if (typeof manualCorrections !== 'undefined' && manualCorrections[code]) {
        cx += manualCorrections[code].x;
        cy += manualCorrections[code].y;
    }

    // D. Zoom Seviyesini Belirle
    const area = bbox.width * bbox.height;
    let targetScale = 6.0; 
    if (area > 20000) targetScale = 2.5;      
    else if (area > 5000) targetScale = 4.0;  
    else if (area > 1000) targetScale = 6.5;  
    else targetScale = 12.0;                  

    // E. NİHAİ KOORDİNAT HESABI (Sol-Üst Orijine Göre)
    // Formül: (EkranYarısı) - (ÜlkeMerkezi * Oran * HedefZoom)
    // "viewBox.x" değerini de hesaba katıyoruz (bazı haritalar 0'dan başlamaz)
    const vbX = viewBox ? viewBox.x : 0;
    const vbY = viewBox ? viewBox.y : 0;

    const pixelX = (cx - vbX) * baseRatio;
    const pixelY = (cy - vbY) * baseRatio;

    const newTranslateX = (mapContainer.clientWidth / 2) - (pixelX * targetScale);
    const newTranslateY = (mapContainer.clientHeight / 2) - (pixelY * targetScale);

    // F. Uygula
    currentScale = targetScale;
    currentTranslateX = newTranslateX;
    currentTranslateY = newTranslateY;
    
    updateTransform();
}

function resetSwitches() {
    // A. Arama Kutusunu Temizle
    const searchInput = document.getElementById("country-search");
    if(searchInput) searchInput.value = "";

    // B. Radyo Butonlarını Sıfırla
    const filterAll = document.getElementById("filterAll");
    if(filterAll) filterAll.checked = true;

    // C. Switchleri Varsayılan Ayara Döndür
    const defaults = ["showGeo", "showDemo", "showEco", "showMil"];
    const allSwitches = document.querySelectorAll('.form-check-input[type="checkbox"]');
    
    allSwitches.forEach(sw => {
        sw.checked = defaults.includes(sw.id);
    });

    // Haritayı sıfırla
    if (typeof resetMap === 'function') resetMap();
}

// --- SAYFA YÜKLEME BAŞLANGICI ---
document.addEventListener("DOMContentLoaded", () => {
  createHoverTooltip();
  trackMouse();
  loadPage("world_map");
});
