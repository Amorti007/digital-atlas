// DIJITAL ATLAS - DİL VE LOKALİZASYON MOTORU

/* Bu dosya, Dijital Atlas projesinin çok dilli desteğini yönetir.
Dil yönetimini ana JavaScript dosyasından ayırarak ilgi alanlarının ayrımı (SoC) prensibini benimsedik.
Bu sayede 'main.js' sadece iş mantığına odaklanırken, bu dosya sadece çeviri işlevini yönetiyor. */

// Global Dil Değişkeni
window.currentLang = "tr";

// Çeviri Sözlüğü
/* Çevirileri sözlük formatında tutarak yönetimi kolaylaştırdık.
Ayrıca O(1) zaman karmaşıklığında veri erişimi sağladık. */
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
        btn_sponsor: "Sponsor Ol",
        btn_patreon: "Destekle",
        no_data: "Veri bulunamadı.",
        // Dinamik İçerik Etiketleri
        lbl_capital: "Başkent:",
        lbl_continent: "Kıta:",
        lbl_area: "Yüzölçümü:",
        lbl_gov: "Yönetim:",
        lbl_timezone: "Saat Dilimi:",
        lbl_indep: "Bağımsızlık:",
        lbl_pop: "Nüfus:",
        lbl_life: "Ort. Ömür:",
        lbl_birth: "Doğurganlık Oranı:",
        lbl_lang: "Dil:",
        lbl_gdp: "GSYİH:",
        lbl_gdp_per: "Kişi Başı:",
        lbl_inf: "Enflasyon:",
        lbl_unemp: "İşsizlik:",
        lbl_wage: "Asgari Ücret:",
        lbl_currency: "Para Birimi:",
        lbl_rank: "Güç Sıralaması:",
        lbl_active: "Aktif Personel:",
        lbl_reserve: "Yedek Personel:",
        lbl_total: "Toplam Personel:",
        lbl_budget: "Savunma Bütçesi:",
        lbl_intel: "İstihbarat:",
        lbl_data_year: "Veriler 2024 yılına aittir.",
        // Bölüm Başlıkları
        header_geo: "Coğrafya & Politika",
        header_demo: "Demografi",
        header_eco: "Ekonomi",
        header_mil: "Askeri & Güvenlik",
        // Karşılaştırma Modalı
        tray_header_title: "KARŞILAŞTIR",
        modal_compare_title: "Karşılaştırma Tablosu",
        modal_btn_close: "Kapat",
        // Switch Kategorileri (Kısa)
        cat_geo: "Coğrafya",
        cat_demo: "Nüfus",
        cat_eco: "Ekonomi",
        cat_mil: "Askeri",
        cat_socio: "Sosyoekonomik",
        cat_env: "Enerji & Çevre",
        cat_tech: "Teknoloji & Altyapı",
        // Yeni Veri Etiketleri
        lbl_employment: "İstihdam Oranı",
        lbl_literacy: "Okuryazarlık",
        lbl_co2: "CO2 Emisyonu",
        lbl_renew: "Yenilenebilir En.",
        lbl_internet: "İnternet Kull.",
        lbl_mobile: "Mobil Hat",
        // Karşılaştırma Tepsisi
        tray_selected: "Ülke Seçildi",
        tray_btn_compare: "Kıyasla",
        btn_add_compare: "Karşılaştır",
        btn_remove: "Kaldır",
        // Hakkında Sayfası İçeriği
        about_title: "Proje Hakkında",
        about_desc: "Dünya verilerini parmaklarınızın ucuna getiren interaktif keşif aracı.",
        about_mission_title: "Misyonumuz",
        about_mission_text: "Karmaşık demografik, ekonomik ve askeri verileri; statik tablolardan kurtarıp, herkesin anlayabileceği görsel ve etkileşimli bir deneyime dönüştürmek.",
        about_tech_title: "Teknolojik Altyapı",
        about_tech_text: "Bu proje, modern web teknolojileri kullanılarak performans ve kullanıcı deneyimi odaklı geliştirilmiştir.",
        about_team_title: "Geliştirici Ekip",
        about_team_text: "Veri görselleştirme tutkusuyla bir araya gelen öğrenci topluluğu.",
        about_credits_title: "Kaynaklar & Atıflar",
        about_li_map: "Harita Altyapısı (SimpleMaps)",
        about_li_data: "Demografik Veriler (PopulationPyramid)",
        about_li_flags: "Bayrak API (FlagCDN)",
        about_li_ui: "Arayüz Kütüphanesi (Bootstrap 5)",
        // Araç Çubuğu
        tool_search_label: "Ülke Ara",
        tool_search_ph: "TR, Almanya...",
        tool_search_btn: "Bul",
        tool_filter_label: "Bölge Filtrele",
        tool_filter_all: "Tümü",
        tool_filter_eu: "Avrupa",
        tool_filter_asia: "Asya",
        tool_filter_na: "Kuzey Amerika",
        tool_filter_sa: "Güney Amerika",
        tool_filter_af: "Afrika",
        tool_filter_oc: "Okyanusya",
        tool_filter_pop: "Nüfus > 100M",
        tool_filter_area: "Alan > 1M km²",
        tool_layers_label: "Gösterilecek Veriler",
        tool_layer_geo: "Coğrafya",
        tool_layer_demo: "Nüfus",
        tool_layer_eco: "Ekonomi",
        tool_layer_mil: "Askeri",
        tool_layer_socio: "Sosyoekonomik",
        tool_layer_env: "Enerji & Çevre",
        tool_layer_tech: "Teknoloji & Altyapı",
        // Hata Mesajları
        toast_already_in_list: "Bu ülke zaten listede!",
        toast_max_limit: "En fazla 3 ülke karşılaştırabilirsiniz.",
        err_map_data_missing: "Harita verisi eksik.",
        err_country_not_found: "bulunamadı.",
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
        btn_sponsor: "Sponsor",
        btn_patreon: "Support",
        no_data: "No data.",
        // Dynamic Content Labels
        lbl_capital: "Capital:",
        lbl_continent: "Continent:",
        lbl_area: "Area:",
        lbl_timezone: "Timezone:",
        lbl_gov: "Government:",
        lbl_indep: "Independence:",
        lbl_pop: "Population:",
        lbl_life: "Life Exp:",
        lbl_birth: "Fertility Rate:",
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
        lbl_data_year: "Data is from 2024.",
        // Section Headers
        header_geo: "Geography & Politics",
        header_demo: "Demographics",
        header_eco: "Economy",
        header_mil: "Military & Security",
        // Comparison Modal
        tray_header_title: "COMPARE",
        modal_compare_title: "Comparison Table",
        modal_btn_close: "Close",
        // Switch Categories (Short)
        cat_geo: "Geography",
        cat_demo: "Demographics",
        cat_eco: "Economy",
        cat_mil: "Military",
        cat_socio: "Socio-Economic",
        cat_env: "Energy & Env.",
        cat_tech: "Tech & Infra",
        // New Data Labels
        lbl_employment: "Employment Rate",
        lbl_literacy: "Literacy Rate",
        lbl_co2: "CO2 Emissions",
        lbl_renew: "Renewable Energy",
        lbl_internet: "Internet Usage",
        lbl_mobile: "Mobile Subs.",
        // Comparison Tray
        tray_selected: "Countries Selected",
        tray_btn_compare: "Compare",
        btn_add_compare: "Compare",
        btn_remove: "Remove",
        // About Page Content
        about_title: "About the Project",
        about_desc: "An interactive exploration tool bringing world data to your fingertips.",
        about_mission_title: "Our Mission",
        about_mission_text: "To transform complex demographic, economic, and military data from static tables into a visual and interactive experience accessible to everyone.",
        about_tech_title: "Tech Stack",
        about_tech_text: "This project is built using modern web technologies with a focus on performance and user experience.",
        about_team_title: "Developer Team",
        about_team_text: "A community of students united by a passion for data visualization.",
        about_credits_title: "Credits & Resources",
        about_li_map: "Map Infrastructure (SimpleMaps)",
        about_li_data: "Demographic Data (PopulationPyramid)",
        about_li_flags: "Flag API (FlagCDN)",
        about_li_ui: "UI Library (Bootstrap 5)",
        // Toolbar
        tool_search_label: "Search Country",
        tool_search_ph: "TR, Germany...",
        tool_search_btn: "Find",
        tool_filter_label: "Filter Region",
        tool_filter_all: "All",
        tool_filter_eu: "Europe",
        tool_filter_asia: "Asia",
        tool_filter_na: "North America",
        tool_filter_sa: "South America",
        tool_filter_af: "Africa",
        tool_filter_oc: "Oceania",
        tool_filter_area: "Area > 1M km²",
        tool_filter_pop: "Pop. > 100M",
        tool_layers_label: "Data Layers",
        tool_layer_geo: "Geography",
        tool_layer_demo: "Population",
        tool_layer_eco: "Economy",
        tool_layer_mil: "Military",
        tool_layer_socio: "Socio-Economic",
        tool_layer_env: "Energy & Env.",
        tool_layer_tech: "Tech & Infra",
        // Error Messages
        toast_already_in_list: "This country is already in the list!",
        toast_max_limit: "You can compare up to 3 countries.",
        err_map_data_missing: "Map data is missing.",
        err_country_not_found: "not found."
    }
};

// Dil Değiştirme Fonksiyonu
// Dil değiştirme işlemi SPA ve DOM yapısına uygun bir şekilde çalışarak tüm sayfayı yenilemez.
function changeLanguage(lang) {
    window.currentLang = lang;
    
    // UI Metinlerini Güncelle
    if (typeof updateUITexts === 'function') updateUITexts();
    
    // Navbar butonunu güncelle
    const langBtn = document.getElementById('languageDropdown');
    if(langBtn) langBtn.innerText = lang.toUpperCase();

    // Varsa açık popover'ı kapat
    const openPopover = document.querySelector('.popover');
    if (openPopover) openPopover.remove();

    // --- YENİ EKLENEN KISIM ---
    // Harita üzerindeki ülke isimlerini yeni dile çevir
    if (typeof window.updateLabelsLanguage === 'function') {
        window.updateLabelsLanguage();
    }

    // 4. KRİTİK EKLEME: Karşılaştırma Tepsisini Yeniden Çiz (Buton dili düzelir)
    if (typeof window.updateComparisonTray === 'function') {
        window.updateComparisonTray();
    }
}

// UI Metinlerini Güncelleyen Fonksiyon
function updateUITexts() {
    // 'querySelectorAll' ile 'data-lang' niteliğine sahip tüm elementleri tek seferde bulup döngüye sokuyoruz.
    document.querySelectorAll("[data-lang]").forEach((el) => {
        const key = el.getAttribute("data-lang");
        if (uiTranslations[window.currentLang][key]) {
        el.innerText = uiTranslations[window.currentLang][key];
        }
    });

    document.querySelectorAll("[data-lang-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-lang-placeholder");
        // 'translations' yerine 'window.uiTranslations' yazıldı
        if (window.uiTranslations[currentLang] && window.uiTranslations[currentLang][key]) {
            el.setAttribute("placeholder", window.uiTranslations[currentLang][key]);
        }
    });
}

// Yardımcı Fonksiyon: Belirli bir anahtarın çevirisini getir
function getTrans(key) {
    return uiTranslations[window.currentLang][key] || key;
}