// DIJITAL ATLAS - ANA JAVASCRIPT MOTORU

// --- GLOBAL DEĞİŞKENLER ---
window.globalData = {};         // Dünya verisi
let activeDetailPopover = null; // Açık olan detay penceresi
let hoverTooltip = null;        // Mouse ile gezilen tooltip
let hoverTimer = null;          // Hover zamanlayıcı 
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
    
    // 1. Tooltipleri Başlat
    initUITooltips();

    // 2. Eğer Harita Sayfasıysa Motorları Başlat
    if (pageName === "world_map") {
      // Arama ve Filtreleri Başlat (HTML artık var!)
      if (typeof initSearchSuggestions === 'function') initSearchSuggestions();
      if (typeof initFilterListeners === 'function') initFilterListeners();

      // Veriyi ve Haritayı Yükle
      initCollapseIcons();
      
      await loadData(); 
      loadSVGMap();       
    }
    
    // 3. Dil Çevirilerini Uygula
    if(typeof updateUITexts === "function") updateUITexts();

  } catch (error) {
    contentDiv.innerHTML = `<div class="alert alert-danger m-5">Hata: ${error.message}</div>`;
    console.error(error);
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

// --- 4. ETKİLEŞİMLER (DOM HIYERARŞİSİ ÇÖZÜMÜ) ---
function initMapInteractions() {
  const mapSvg = document.getElementById("world-map-svg");
  if (!mapSvg) return;

  const svgNS = "http://www.w3.org/2000/svg";
  
  // 1. HARİCİ BAĞIMLILIKLAR (SVG'de Gruplanmamış Olanlar İçin)
  // Eğer SVG'de Grönland, Danimarka grubunun DIŞINDAYSA burası devreye girer.
  const externalDependencies = {
      "GL": "DK", "FO": "DK", // Danimarka
      "AW": "NL", "CW": "NL", "SX": "NL", "BQ": "NL", // Hollanda
      "PR": "US", "GU": "US", "VI": "US", "AS": "US", "MP": "US" // ABD
  };

  // 2. KODU BULMA MANTIĞI (En Önemli Kısım)
  const getCountryCodeFromTarget = (target) => {
      // A. Önce Ebeveyn GRUP ID'sine bak (En Güçlü Otorite)
      // Sizin SVG'de Fransa <g id="FR"> içinde toplanmış.
      // GF'ye tıklasanız bile babası FR olduğu için FR döner.
      if (target.parentElement && target.parentElement.tagName === 'g') {
          const parentId = target.parentElement.id;
          if (parentId && parentId.length === 2) {
              return parentId; // Doğrudan "FR" döndürür, "GF"yi ezer.
          }
      }

      // B. Grup yoksa, Path ID'sine bak
      const ownId = target.getAttribute("id");
      if (ownId && ownId.length >= 2) {
          // Harici listede var mı kontrol et (Örn: GL -> DK)
          return externalDependencies[ownId] || ownId;
      }

      return null;
  };

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

  // YARDIMCI: Ülkeyi Boya (Grup ID'sine göre)
  const paintCountry = (code, animate = false) => {
      // 1. Önce GRUP elementini bul (<g id="FR">)
      const groupElement = document.querySelector(`g#${code}`);
      
      // 2. Yoksa tekil path'e bak (<path id="TR">)
      const targetElement = document.getElementById(code);
      
      let targets = [];

      if (groupElement) {
          // Grubun içindeki TÜM path'leri al (GF, MQ ve ID'si olmayan ana kara dahil)
          targets = Array.from(groupElement.querySelectorAll("path"));
      } else if (targetElement) {
          targets = [targetElement];
      }

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
                      imgEl.classList.remove("flag-anim");
                      requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                              imgEl.classList.add("flag-anim");
                          });
                      });
                  }
              } else { 
                  target.style.fill = "#ffc107"; 
              }
          } catch (e) {}
      });
  };

  // YARDIMCI: Temizle
  const clearCountry = (code) => {
      if (!code) return;

      const groupElement = document.querySelector(`g#${code}`);
      const targetElement = document.getElementById(code);
      
      let targets = [];
      if (groupElement) targets = Array.from(groupElement.querySelectorAll("path"));
      else if (targetElement) targets = [targetElement];

      targets.forEach((target) => {
          target.style.fill = ""; 
          target.style.fillOpacity = "";
          target.classList.remove("flag-anim");
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
      const codeToReset = code || selectedCountryCode;
      if (codeToReset) {
          clearCountry(codeToReset);
          if (codeToReset === selectedCountryCode) {
              selectedCountryCode = null;
          }
      }
  };

  // --- EVENT HANDLER (TEK NOKTADAN YÖNETİM) ---
  const handleInteraction = (e, type) => {
      const target = e.target.closest('path');
      
      // Boşa tıklandıysa
      if (!target) {
          if (type === 'click') {
              if (selectedCountryCode) window.resetCountry(selectedCountryCode);
              if (activeDetailPopover) {
                  activeDetailPopover.dispose();
                  activeDetailPopover = null;
              }
          }
          return;
      }

      // KODU TESPİT ET (Grup Öncelikli)
      const code = getCountryCodeFromTarget(target);

      if (code) {
          if (type === 'click') {
              e.stopPropagation();
              window.highlightCountry(code); // FR boyanır
              showDetailPopover(target, code); // FR verisi gösterilir
          } else if (type === 'mouseover') {
              if (hoverTimer) clearTimeout(hoverTimer);
              hoverTimer = setTimeout(() => {
                  const name = getCountryName(code);
                  if (hoverTooltip && name) {
                      hoverTooltip.innerHTML = name;
                      updateTooltipPosition();
                      hoverTooltip.style.display = "block";
                  }
              }, 100);
              if (selectedCountryCode !== code) paintCountry(code, true);
          } else if (type === 'mouseout') {
              if (hoverTimer) clearTimeout(hoverTimer);
              if (hoverTooltip) hoverTooltip.style.display = "none";
              if (selectedCountryCode !== code) clearCountry(code);
          }
      }
  };

  // Event Listener'ları Bağla
  mapSvg.addEventListener('click', (e) => handleInteraction(e, 'click'));
  mapSvg.addEventListener('mouseover', (e) => handleInteraction(e, 'mouseover'));
  mapSvg.addEventListener('mouseout', (e) => handleInteraction(e, 'mouseout'));
}

// --- DESEN OLUŞTURUCU (Overlay + Resim Dönüşü) ---
function createFlagPattern(uniqueId, bbox, countryCode) {
    const mapSvg = document.getElementById("world-map-svg");
    if (!mapSvg) return null;

    const svgNS = "http://www.w3.org/2000/svg";
    const xlinkNS = "http://www.w3.org/1999/xlink";
    
    let defs = mapSvg.querySelector("defs");
    if (!defs) {
        defs = document.createElementNS(svgNS, "defs");
        mapSvg.prepend(defs);
    }

    // Desen zaten varsa, içindeki resmi döndür
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

    // 1. Katman: Gri Zemin
    const bgRect = document.createElementNS(svgNS, "rect");
    bgRect.setAttribute("width", bbox.width);
    bgRect.setAttribute("height", bbox.height);
    bgRect.setAttribute("fill", "#cccccc");

    // 2. Katman: Bayrak Resmi
    const img = document.createElementNS(svgNS, "image");
    img.setAttribute("href", flagUrl);
    img.setAttributeNS(xlinkNS, "href", flagUrl);
    img.setAttribute("width", bbox.width);
    img.setAttribute("height", bbox.height);
    img.setAttribute("preserveAspectRatio", "xMidYMid slice");

    // 3. Katman: Koyu Overlay (GERİ GELDİ)
    const overlayRect = document.createElementNS(svgNS, "rect");
    overlayRect.setAttribute("width", bbox.width);
    overlayRect.setAttribute("height", bbox.height);
    overlayRect.setAttribute("fill", "rgba(0,0,0,0.3)"); // %30 Karartma

    // 4. Katman: Vinyet
    const vigRect = document.createElementNS(svgNS, "rect");
    vigRect.setAttribute("width", bbox.width);
    vigRect.setAttribute("height", bbox.height);
    vigRect.setAttribute("fill", "url(#vignette-gradient)");

    pattern.appendChild(bgRect);
    pattern.appendChild(img);
    pattern.appendChild(overlayRect);
    pattern.appendChild(vigRect);
    defs.appendChild(pattern);

    return img;
}

// --- ETKİLEŞİMLER (Bütünleşik Desen + Animasyon Reset Fix) ---
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

  // YARDIMCI: Ülkeyi Boya
  const paintCountry = (code, animate = false) => {
      const targetElement = document.getElementById(code);
      const groupElement = document.querySelector(`g#${code}`);
      
      let targets = [];
      if (groupElement) targets = Array.from(groupElement.querySelectorAll("path"));
      else if (targetElement) targets = [targetElement];

      if (targets.length === 0) return;

      // PARÇALI ÜLKELER (Ayrı ayrı desen: Fransa, Hollanda, ABD)
      const disjointedCountries = ["FR", "NL", "US"];
      const isDisjointed = disjointedCountries.includes(code);

      if (isDisjointed) {
          targets.forEach((target, index) => {
              try {
                  const bbox = target.getBBox();
                  const uniqueId = `flag-pattern-${code}-part${index}`;
                  
                  if (typeof createFlagPattern === 'function') {
                      const imgEl = createFlagPattern(uniqueId, bbox, code); 
                      target.style.fill = `url(#${uniqueId})`;
                      target.style.fillOpacity = "1";
                      
                      // Animasyon Reset (setTimeout ile GARANTİ)
                      if (animate && imgEl) {
                          imgEl.classList.remove("flag-anim");
                          setTimeout(() => {
                              imgEl.classList.add("flag-anim");
                          }, 20); // 20ms gecikme tarayıcının değişikliği görmesini sağlar
                      }
                  } else { target.style.fill = "#ffc107"; }
              } catch (e) {}
          });

      } else {
          // BÜTÜNLEŞİK ÜLKELER (Tek desen: Rusya, Kanada, Japonya vb.)
          // Tüm parçaları kapsayan tek bir BBox hesapla
          let globalBBox = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
          
          targets.forEach(path => {
              try {
                  const b = path.getBBox();
                  if (b.x < globalBBox.x) globalBBox.x = b.x;
                  if (b.y < globalBBox.y) globalBBox.y = b.y;
                  if (b.x + b.width > globalBBox.x2) globalBBox.x2 = b.x + b.width;
                  if (b.y + b.height > globalBBox.y2) globalBBox.y2 = b.y + b.height;
              } catch(e){}
          });

          const finalBBox = {
              x: globalBBox.x,
              y: globalBBox.y,
              width: globalBBox.x2 - globalBBox.x,
              height: globalBBox.y2 - globalBBox.y
          };

          const uniqueId = `flag-pattern-${code}-global`;
          let imgEl = null;

          if (typeof createFlagPattern === 'function') {
              imgEl = createFlagPattern(uniqueId, finalBBox, code);
          }

          targets.forEach(target => {
              if(imgEl) {
                  target.style.fill = `url(#${uniqueId})`;
                  target.style.fillOpacity = "1";
              } else {
                  target.style.fill = "#ffc107";
              }
          });

          // Animasyon Reset (setTimeout ile GARANTİ)
          if (animate && imgEl) {
              imgEl.classList.remove("flag-anim");
              setTimeout(() => {
                  imgEl.classList.add("flag-anim");
              }, 20);
          }
      }
  };

  const clearCountry = (code) => {
      if (!code) return;
      const targetElement = document.getElementById(code);
      const groupElement = document.querySelector(`g#${code}`);
      let targets = [];
      if (groupElement) targets = Array.from(groupElement.querySelectorAll("path"));
      else if (targetElement) targets = [targetElement];

      targets.forEach((target) => {
          target.style.fill = ""; 
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
// --- 5. DETAYLI İÇERİK OLUŞTURUCU (TAM VERİ SETİ + FİLTRELER + KARŞILAŞTIRMA) ---
function generateDetailContent(code, pathElement) {
    // 1. DİL VE VERİ AYARLARI
    const currentLang = window.currentLang || 'tr';
    const sfx = "_" + currentLang;
    const t = (key) => window.uiTranslations?.[currentLang]?.[key] || key;

    // Veriyi güvenli al
    const data = (window.globalData && window.globalData[code]) ? window.globalData[code] : null;
    const defaultName = pathElement.getAttribute("name") || code;
    
    if (!data) return `<strong>${defaultName}</strong><br><span class="text-muted small">${t('no_data')}</span>`;

    // 2. FORMATLAYICILAR
    const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US';
    const formatNum = (n) => (n ? new Intl.NumberFormat(locale).format(n) : "-");    
    const formatCompact = (n) => (n ? new Intl.NumberFormat(locale, { notation: "compact", compactDisplay: "long", maximumFractionDigits: 1 }).format(n) : "-");
    const currencyStandard = (n) => (n ? `$${formatNum(n)}` : "-");
    const currencyCompact = (n) => (n ? `$${formatCompact(n)}` : "-");
    const fmt = (n, suffix="") => n ? formatNum(n) + suffix : "-"; // Yardımcı kısa format

    // 3. BAYRAK
    const customFlags = {
      "NC": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg",
      "IC": "https://upload.wikimedia.org/wikipedia/commons/8/8c/Flag_of_the_Canary_Islands_%28simple%29.svg"
    };
    let flagUrl = customFlags[code] || `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

    // 4. MEVCUT VERİLERİ HAZIRLA (Sizin kodunuzdaki değişkenler)
    const nameTr = data.names?.[currentLang] || defaultName;
    const nameEn = data.names?.en || "";
    const desc = data.general_info?.['description' + sfx] || "";
    const capital = data.geography?.['capital' + sfx] || "-";
    const continent = data.geography?.['continent' + sfx] || "-";
    const area = data.geography?.area_sq_km ? formatNum(data.geography.area_sq_km) + " km²" : "-";
    const timezone = data.geography?.timezone || "-";
    const gov = data.politics?.['government' + sfx] || "-";
    const indep = data.politics?.independence_date || "-";
    const gdp = data.economy?.gdp_usd ? currencyCompact(data.economy.gdp_usd) : "-";
    const gdpPer = data.economy?.gdp_per_capita_usd ? currencyStandard(data.economy.gdp_per_capita_usd) : "-";
    const inflation = data.economy?.inflation_rate ? `%${data.economy.inflation_rate}` : "-";
    const unemploy = data.economy?.unemployment_rate ? `%${data.economy.unemployment_rate}` : "-";
    const minWage = data.economy?.minimum_wage_usd ? currencyStandard(data.economy.minimum_wage_usd) : "-";
    const money = data.economy?.['currency' + sfx] || "-";
    const population = data.demographics?.total_population ? formatNum(data.demographics.total_population) : "-";
    const lifeExp = data.demographics?.life_expectancy || "-";
    const langSpoken = data.demographics?.['most_spoken_language' + sfx] || "-";
    const birthRate = data.demographics?.birth_rate || "-";
    const fireRank = data.military?.global_firepower_rank || "-";
    const activeMil = data.military?.active_personnel ? formatNum(data.military.active_personnel) : "-";
    const reserveMil = data.military?.reserve_personnel ? formatNum(data.military.reserve_personnel) : "-";
    const totalMil = data.military?.total_personnel ? formatNum(data.military.total_personnel) : "-";
    const defBudget = data.military?.defense_budget_usd ? currencyCompact(data.military.defense_budget_usd) : "-";
    const intel = data.general_info?.intelligence_agency || "-";

    // 5. YENİ VERİLER (Socio, Energy, Tech)
    const literacy = data.demographics?.literacy_rate ? `%${data.demographics.literacy_rate}` : "-";
    const employment = data.economy?.employment_rate ? `%${data.economy.employment_rate}` : "-";
    const co2 = data.energy_environment?.co2_emissions_mt ? formatNum(data.energy_environment.co2_emissions_mt) + " Mt" : "-";
    const renewable = data.energy_environment?.renewable_energy_percent ? `%${data.energy_environment.renewable_energy_percent}` : "-";
    const internet = data.technology?.internet_users_percent ? `%${data.technology.internet_users_percent}` : "-";
    const mobile = data.technology?.mobile_subscriptions_per_100 ? data.technology.mobile_subscriptions_per_100 + " / 100" : "-";

    // 6. GÖRÜNÜRLÜK KONTROLÜ (Switchler)
    const showGeo = document.getElementById("showGeo")?.checked ?? true;
    const showDemo = document.getElementById("showDemo")?.checked ?? true;
    const showEco = document.getElementById("showEco")?.checked ?? true;
    const showMil = document.getElementById("showMil")?.checked ?? true;
    const showSocio = document.getElementById("showSocioeconomics")?.checked ?? false;
    const showEnv = document.getElementById("showEnvironment")?.checked ?? false;
    const showTech = document.getElementById("showTechnology")?.checked ?? false;

    // --- HTML İNŞASI ---
    
    // BAŞLIK (Header + Compare Button)
    let html = `
        <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
            <div class="text-start">
                <div class="d-flex align-items-center">
                    <img src="${flagUrl}" width="40" class="img-thumbnail me-2 shadow-sm">
                    <h5 class="fw-bold mb-0 text-dark">${nameTr}</h5>
                </div>
                <small class="text-muted d-block mt-1">${nameEn}</small>
                <p class="small mt-1 mb-0 fst-italic text-secondary" style="font-size: 0.75rem; line-height: 1.2;">"${desc}"</p>
            </div>
            
            <button class="btn btn-success rounded-circle shadow-sm ms-2 d-flex align-items-center justify-content-center border-0" 
                    onclick="if(window.addToComparison) window.addToComparison('${code}')" 
                    title="${currentLang==='tr'?'Karşılaştırmaya Ekle':'Add to Compare'}"
                    style="width: 32px; height: 32px; flex-shrink: 0; background-color: #28a745;">
                <i class="fas fa-plus text-white" style="font-size: 0.8rem;"></i>
            </button>
        </div>
    `;

    // A. COĞRAFYA (showGeo)
    if (showGeo) {
        html += `
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
        </div>`;
    }

    // B. DEMOGRAFİ (showDemo)
    if (showDemo) {
        // Piramit HTML'i
        const pyramidHtml = generatePyramidChart(data.demographics?.population_pyramid);
        html += `
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
        </div>`;
    }

    // C. EKONOMİ (showEco)
    if (showEco) {
        html += `
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
        </div>`;
    }

    // D. ASKERİ (showMil)
    if (showMil) {
        html += `
        <div class="info-box mb-2">
            <h6 class="border-bottom pb-1 text-danger fw-bold small"><i class="fas fa-shield-alt me-2"></i>${t('header_mil')}</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>${t('lbl_rank')}</strong> #${fireRank}</li>
                <li><strong>${t('lbl_active')}</strong> ${activeMil}</li>
                <li><strong>${t('lbl_reserve')}</strong> ${reserveMil}</li>
                <li><strong>${t('lbl_total')}</strong> ${totalMil}</li>
                <li><strong>${t('lbl_budget')}</strong> ${defBudget}</li>
                <li><strong>${t('lbl_intel')}</strong> ${intel}</li>
            </ul>
        </div>`;
    }

    // --- YENİ EKLENEN KATEGORİLER ---

    // E. SOSYO-EKONOMİK (showSocio)
    if (showSocio) {
        html += `
        <div class="info-box mb-2">
            <h6 class="text-info fw-bold small border-bottom pb-1"><i class="fas fa-briefcase me-2"></i>Sosyo-Ekonomik</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>İstihdam Oranı:</strong> ${employment}</li>
                <li><strong>Okuryazarlık:</strong> ${literacy}</li>
                <li><strong>Asgari Ücret:</strong> ${minWage}</li> 
            </ul>
        </div>`;
    }

    // F. ENERJİ & ÇEVRE (showEnv)
    if (showEnv) {
        html += `
        <div class="info-box mb-2">
            <h6 class="text-success fw-bold small border-bottom pb-1"><i class="fas fa-leaf me-2"></i>Enerji & Çevre</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>CO2 Emisyonu:</strong> ${co2}</li>
                <li><strong>Yenilenebilir Enerji:</strong> ${renewable}</li>
            </ul>
        </div>`;
    }

    // G. TEKNOLOJİ (showTech)
    if (showTech) {
        html += `
        <div class="info-box mb-2">
            <h6 class="text-secondary fw-bold small border-bottom pb-1"><i class="fas fa-wifi me-2"></i>Teknoloji</h6>
            <ul class="list-unstyled small mb-0">
                <li><strong>İnternet Kull.:</strong> ${internet}</li>
                <li><strong>Mobil Hat:</strong> ${mobile}</li>
            </ul>
        </div>`;
    }

    // FOOTER (Veri Yılı)
    html += `
        <div class="text-center text-muted mt-2 pt-2 border-top" style="font-size: 0.65rem;">
            <i class="fas fa-info-circle me-1"></i> ${t('lbl_data_year') || 'Veriler 2024 yılına aittir.'}
        </div>
    `;

    return html;
}

window.refreshActivePopover = function() {
    // 1. Açık bir popover ve seçili ülke var mı?
    if (!activeDetailPopover || !selectedCountryCode) return;

    // 2. Hedef elementi bul
    let element = document.getElementById(selectedCountryCode);
    if (!element) {
        const group = document.querySelector(`g#${selectedCountryCode}`);
        if(group) element = group.querySelector("path");
    }
    if (!element) return;

    // 3. İçeriği yeni switch ayarlarına göre oluştur
    const newContent = generateDetailContent(selectedCountryCode, element);

    // 4. Popover gövdesini bul ve içeriği değiştir
    const popoverBody = document.querySelector('.popover-body');
    if (popoverBody) {
        popoverBody.innerHTML = newContent;

        // --- KRİTİK: Piramit Animasyonunu Tekrar Tetikle ---
        const bars = popoverBody.querySelectorAll(".bar-fill");
        if (bars.length > 0) {
            setTimeout(() => {
                bars.forEach((bar) => {
                    const targetWidth = bar.getAttribute("data-width");
                    if(targetWidth) bar.style.width = targetWidth;
                });
            }, 50);
        }
    }
};

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

function initCollapseIcons() {
    // 1. Üst Araç Çubuğu (Aşağı Açılır)
    const toolsMenu = document.getElementById('toolsMenu');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (toolsMenu && toggleIcon) {
        // Bootstrap eventlerini dinle
        toolsMenu.addEventListener('show.bs.collapse', () => {
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-up');
        });
        toolsMenu.addEventListener('hide.bs.collapse', () => {
            toggleIcon.classList.remove('fa-chevron-up');
            toggleIcon.classList.add('fa-chevron-down');
        });
    }

    // 2. Alt Karşılaştırma Tepsisi (Yukarı Açılır)
    // Not: Bu elementler dinamik olarak görünür/gizlenir ama DOM'da vardır.
    const compareTray = document.getElementById('compareTray');
    const compareIcon = document.getElementById('compareIcon');

    if (compareTray && compareIcon) {
        // Tepsi açıldığında (Yukarı çıktığında) -> İkon Aşağı baksın (Kapatmak için)
        compareTray.addEventListener('show.bs.collapse', () => {
            compareIcon.classList.remove('fa-chevron-up');
            compareIcon.classList.add('fa-chevron-down');
        });
        // Tepsi kapandığında (Aşağı indiğinde) -> İkon Yukarı baksın (Açmak için)
        compareTray.addEventListener('hide.bs.collapse', () => {
            compareIcon.classList.remove('fa-chevron-down');
            compareIcon.classList.add('fa-chevron-up');
        });
    }
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
