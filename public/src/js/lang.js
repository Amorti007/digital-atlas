// DIJITAL ATLAS - DİL VE LOKALİZASYON MOTORU

// Global Dil Değişkeni
window.currentLang = "tr";

// Çeviri Sözlüğü
window.uiTranslations = {
    tr: {
        nav_brand: "Dijital Atlas",
        nav_home: "Ana Sayfa",
        nav_maps: "Haritalar",
        nav_world_map: "Dünya Haritası",
        nav_turkey_map: "Türkiye Haritası (Yakında)",
        nav_about: "Hakkında",
        map_header_title: "Dünya Nüfus ve İstatistik Atlası",
        map_header_desc: "Ülkelerin üzerine gelerek temel bilgilere, tıklayarak detaylı verilere ulaşabilirsiniz.",
        footer_copyright: "© 2025 Dijital Atlas Projesi. MIT Lisansı.",
        footer_map: "Harita:",
        footer_pop: "Nüfus:",
        footer_flags: "Bayraklar:",
        footer_icons: "İkonlar:",
        footer_ui: "Arayüz:",
        footer_support: "Projeye Destek Ol:",
        // Dinamik İçerik Etiketleri
        lbl_capital: "Başkent:",
        lbl_continent: "Kıta:",
        lbl_area: "Yüzölçümü:",
        lbl_gov: "Yönetim:",
        lbl_indep: "Bağımsızlık:",
        lbl_pop: "Nüfus:",
        lbl_life: "Ort. Ömür:",
        lbl_birth: "Doğum Oranı:",
        lbl_lang: "Dil:",
        lbl_gdp: "GSYİH:",
        lbl_gdp_per: "Kişi Başı:",
        lbl_inf: "Enflasyon:",
        lbl_unemp: "İşsizlik:",
        lbl_wage: "Asgari Ücret:",
        lbl_currency: "Para:",
        lbl_rank: "Güç Sıralaması:",
        lbl_active: "Aktif Personel:",
        lbl_reserve: "Yedek Personel:",
        lbl_total: "Toplam Personel:",
        lbl_budget: "Savunma Bütçesi:",
        lbl_intel: "İstihbarat:",
        // Bölüm Başlıkları
        header_geo: "Coğrafya & Politika",
        header_demo: "Demografi",
        header_eco: "Ekonomi",
        header_mil: "Askeri & Güvenlik",
    },
    en: {
        nav_brand: "Digital Atlas",
        nav_home: "Home",
        nav_maps: "Maps",
        nav_world_map: "World Map",
        nav_turkey_map: "Turkey Map (Soon)",
        nav_about: "About",
        map_header_title: "World Population & Statistics Atlas",
        map_header_desc: "Hover over countries for basics, click for detailed statistics.",
        footer_copyright: "© 2025 Digital Atlas Project. MIT License.",
        footer_map: "Map Data:",
        footer_pop: "Population:",
        footer_flags: "Flags:",
        footer_icons: "Icons:",
        footer_ui: "UI:",
        footer_support: "Support Project:",
        // Dynamic Content Labels
        lbl_capital: "Capital:",
        lbl_continent: "Continent:",
        lbl_area: "Area:",
        lbl_gov: "Government:",
        lbl_indep: "Independence:",
        lbl_pop: "Population:",
        lbl_life: "Life Exp:",
        lbl_birth: "Birth Rate:",
        lbl_lang: "Language:",
        lbl_gdp: "GDP:",
        lbl_gdp_per: "Per Capita:",
        lbl_inf: "Inflation:",
        lbl_unemp: "Unemployment:",
        lbl_wage: "Min. Wage:",
        lbl_currency: "Currency:",
        lbl_rank: "Power Rank:",
        lbl_active: "Active Personnel:",
        lbl_reserve: "Reserve Personnel:",
        lbl_total: "Total Personnel:",
        lbl_budget: "Defense Budget:",
        lbl_intel: "Intelligence:",
        // Section Headers
        header_geo: "Geography & Politics",
        header_demo: "Demographics",
        header_eco: "Economy",
        header_mil: "Military & Security",
    },
};

// Dil Değiştirme Fonksiyonu
function changeLanguage(lang) {
    window.currentLang = lang;
    updateUITexts(); // Arayüzdeki metinleri güncelle
    
    // Navbar'daki dil butonunun metnini güncelle
    const langBtn = document.getElementById('languageDropdown');
    if(langBtn) langBtn.innerText = lang.toUpperCase();

    // Eğer açık bir popover varsa kapat (İçeriği eski dilde kalacağı için)
    const openPopover = document.querySelector('.popover');
    if (openPopover) {
        openPopover.remove();
    }
}

// UI Metinlerini Güncelleyen Fonksiyon
function updateUITexts() {
    document.querySelectorAll("[data-lang]").forEach((el) => {
        const key = el.getAttribute("data-lang");
        if (uiTranslations[window.currentLang][key]) {
        el.innerText = uiTranslations[window.currentLang][key];
        }
    });
}

// Yardımcı Fonksiyon: Belirli bir anahtarın çevirisini getir
function getTrans(key) {
    return uiTranslations[window.currentLang][key] || key;
}