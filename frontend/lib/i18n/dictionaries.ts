import type { Locale } from "./config";

/**
 * The strings that appear on every page.
 *
 * Scope is deliberate. This covers the chrome — navigation, footer, the
 * controls in the header — plus the home page's opening, which is the first
 * thing a visitor reads. It does not cover the long explanatory prose on the
 * security, rewards and funding pages.
 *
 * That is not an oversight. Those pages state what the owner can and cannot
 * do with pooled money, what leaving early costs, and which token address to
 * send to. A translation of "your principal is never held" that lands slightly
 * wrong is a promise this project did not make, in a language nobody here
 * reads well enough to catch. Interface labels carry no such risk, so they go
 * first; the prose gets translated deliberately, page by page, and until then
 * those pages stay in English with the notice below explaining why.
 */
export type Dict = {
  nav: {
    home: string;
    dashboard: string;
    exchange: string;
    portfolio: string;
    rewards: string;
    security: string;
    governance: string;
    activity: string;
    admin: string;
  };
  actions: {
    launch: string;
    explore: string;
    readSecurity: string;
    joinTelegram: string;
    getUsdt: string;
  };
  header: {
    toLight: string;
    toDark: string;
    language: string;
    telegram: string;
  };
  hero: {
    badge: string;
    tagline: string;
    lede: string;
    verified: string;
    nonCustodial: string;
    exitOpen: string;
  };
  footer: {
    platform: string;
    trust: string;
    community: string;
    tagline: string;
    operatingFrom: string;
    disclaimer: string;
  };
  /** Shown on pages whose body copy has not been translated yet. */
  partial: string;
};

const en: Dict = {
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    exchange: "Exchange",
    portfolio: "Portfolio",
    rewards: "Rewards",
    security: "Security",
    governance: "Governance",
    activity: "Activity",
    admin: "Admin",
  },
  actions: {
    launch: "Launch Platform",
    explore: "Explore Platform",
    readSecurity: "Read the security model",
    joinTelegram: "Join on Telegram",
    getUsdt: "Get USDT on Polygon",
  },
  header: {
    toLight: "Switch to light theme",
    toDark: "Switch to dark theme",
    language: "Language",
    telegram: "Join our Telegram",
  },
  hero: {
    badge: "Live on Polygon mainnet",
    tagline: "Advanced Digital Asset Infrastructure",
    lede: "Fixed-rate staking on Polygon. The contract is published and verified, the amount that can go into the strategy is capped, and you can withdraw without asking us.",
    verified: "Verified on Sourcify",
    nonCustodial: "Non-custodial",
    exitOpen: "Exit always open",
  },
  footer: {
    platform: "Platform",
    trust: "Trust",
    community: "Community",
    tagline:
      "Staking infrastructure on Polygon. The source is open, the deployed code is verified against it, and you can withdraw without asking us.",
    operatingFrom: "Operating from Malaysia",
    disclaimer:
      "Staking returns are settings in the contract, not guarantees. Every deposit is charged a fee before the stake is recorded, and the deposit screen shows the exact split before you sign.",
  },
  partial: "This page has not been translated yet and is shown in English.",
};

const de: Dict = {
  nav: { home: "Start", dashboard: "Übersicht", exchange: "Tausch", portfolio: "Portfolio", rewards: "Prämien", security: "Sicherheit", governance: "Governance", activity: "Aktivität", admin: "Verwaltung" },
  actions: { launch: "Plattform öffnen", explore: "Plattform ansehen", readSecurity: "Sicherheitsmodell lesen", joinTelegram: "Auf Telegram beitreten", getUsdt: "USDT auf Polygon erhalten" },
  header: { toLight: "Zum hellen Design wechseln", toDark: "Zum dunklen Design wechseln", language: "Sprache", telegram: "Unserem Telegram beitreten" },
  hero: { badge: "Live im Polygon-Mainnet", tagline: "Fortschrittliche Infrastruktur für digitale Vermögenswerte", lede: "Staking mit festem Satz auf Polygon. Der Vertrag ist veröffentlicht und verifiziert, der Betrag, der in die Strategie fließen kann, ist gedeckelt, und Sie können jederzeit ohne unsere Zustimmung abheben.", verified: "Auf Sourcify verifiziert", nonCustodial: "Nicht verwahrend", exitOpen: "Ausstieg jederzeit möglich" },
  footer: { platform: "Plattform", trust: "Vertrauen", community: "Community", tagline: "Staking-Infrastruktur auf Polygon. Der Quellcode ist offen, der bereitgestellte Code ist dagegen verifiziert, und Sie können ohne unsere Zustimmung abheben.", operatingFrom: "Betrieben aus Malaysia", disclaimer: "Staking-Renditen sind Einstellungen im Vertrag, keine Garantien. Auf jede Einzahlung wird eine Gebühr erhoben, bevor der Einsatz erfasst wird; die genaue Aufteilung sehen Sie vor dem Signieren." },
  partial: "Diese Seite ist noch nicht übersetzt und wird auf Englisch angezeigt.",
};

const es: Dict = {
  nav: { home: "Inicio", dashboard: "Panel", exchange: "Intercambio", portfolio: "Cartera", rewards: "Recompensas", security: "Seguridad", governance: "Gobernanza", activity: "Actividad", admin: "Administración" },
  actions: { launch: "Abrir la plataforma", explore: "Explorar la plataforma", readSecurity: "Leer el modelo de seguridad", joinTelegram: "Únete en Telegram", getUsdt: "Conseguir USDT en Polygon" },
  header: { toLight: "Cambiar al tema claro", toDark: "Cambiar al tema oscuro", language: "Idioma", telegram: "Únete a nuestro Telegram" },
  hero: { badge: "Activo en la red principal de Polygon", tagline: "Infraestructura avanzada para activos digitales", lede: "Staking a tasa fija en Polygon. El contrato está publicado y verificado, la cantidad que puede entrar en la estrategia tiene un límite, y puedes retirar sin pedírnoslo.", verified: "Verificado en Sourcify", nonCustodial: "Sin custodia", exitOpen: "Salida siempre abierta" },
  footer: { platform: "Plataforma", trust: "Confianza", community: "Comunidad", tagline: "Infraestructura de staking en Polygon. El código es abierto, el código desplegado está verificado contra él, y puedes retirar sin pedírnoslo.", operatingFrom: "Operamos desde Malasia", disclaimer: "Los rendimientos del staking son parámetros del contrato, no garantías. Cada depósito paga una comisión antes de registrarse, y la pantalla de depósito muestra el desglose exacto antes de firmar." },
  partial: "Esta página aún no está traducida y se muestra en inglés.",
};

const fr: Dict = {
  nav: { home: "Accueil", dashboard: "Tableau de bord", exchange: "Échange", portfolio: "Portefeuille", rewards: "Récompenses", security: "Sécurité", governance: "Gouvernance", activity: "Activité", admin: "Administration" },
  actions: { launch: "Ouvrir la plateforme", explore: "Découvrir la plateforme", readSecurity: "Lire le modèle de sécurité", joinTelegram: "Rejoindre sur Telegram", getUsdt: "Obtenir des USDT sur Polygon" },
  header: { toLight: "Passer au thème clair", toDark: "Passer au thème sombre", language: "Langue", telegram: "Rejoignez notre Telegram" },
  hero: { badge: "En service sur le réseau principal Polygon", tagline: "Infrastructure avancée pour actifs numériques", lede: "Staking à taux fixe sur Polygon. Le contrat est publié et vérifié, le montant pouvant aller dans la stratégie est plafonné, et vous pouvez retirer sans nous demander.", verified: "Vérifié sur Sourcify", nonCustodial: "Sans conservation", exitOpen: "Sortie toujours possible" },
  footer: { platform: "Plateforme", trust: "Confiance", community: "Communauté", tagline: "Infrastructure de staking sur Polygon. Le code source est ouvert, le code déployé est vérifié par rapport à lui, et vous pouvez retirer sans nous demander.", operatingFrom: "Exploité depuis la Malaisie", disclaimer: "Les rendements du staking sont des paramètres du contrat, pas des garanties. Chaque dépôt est soumis à des frais avant enregistrement, et l'écran de dépôt affiche la répartition exacte avant signature." },
  partial: "Cette page n'est pas encore traduite et s'affiche en anglais.",
};

const it: Dict = {
  nav: { home: "Home", dashboard: "Pannello", exchange: "Scambio", portfolio: "Portafoglio", rewards: "Premi", security: "Sicurezza", governance: "Governance", activity: "Attività", admin: "Amministrazione" },
  actions: { launch: "Apri la piattaforma", explore: "Esplora la piattaforma", readSecurity: "Leggi il modello di sicurezza", joinTelegram: "Unisciti su Telegram", getUsdt: "Ottenere USDT su Polygon" },
  header: { toLight: "Passa al tema chiaro", toDark: "Passa al tema scuro", language: "Lingua", telegram: "Unisciti al nostro Telegram" },
  hero: { badge: "Attivo sulla mainnet Polygon", tagline: "Infrastruttura avanzata per asset digitali", lede: "Staking a tasso fisso su Polygon. Il contratto è pubblicato e verificato, l'importo che può entrare nella strategia ha un limite, e puoi prelevare senza chiedercelo.", verified: "Verificato su Sourcify", nonCustodial: "Non custodiale", exitOpen: "Uscita sempre aperta" },
  footer: { platform: "Piattaforma", trust: "Fiducia", community: "Comunità", tagline: "Infrastruttura di staking su Polygon. Il sorgente è aperto, il codice distribuito è verificato rispetto ad esso, e puoi prelevare senza chiedercelo.", operatingFrom: "Operiamo dalla Malesia", disclaimer: "I rendimenti dello staking sono impostazioni del contratto, non garanzie. Ogni deposito paga una commissione prima di essere registrato, e la schermata di deposito mostra la suddivisione esatta prima della firma." },
  partial: "Questa pagina non è ancora tradotta ed è mostrata in inglese.",
};

const pt: Dict = {
  nav: { home: "Início", dashboard: "Painel", exchange: "Câmbio", portfolio: "Carteira", rewards: "Recompensas", security: "Segurança", governance: "Governança", activity: "Atividade", admin: "Administração" },
  actions: { launch: "Abrir a plataforma", explore: "Explorar a plataforma", readSecurity: "Ler o modelo de segurança", joinTelegram: "Entrar no Telegram", getUsdt: "Obter USDT na Polygon" },
  header: { toLight: "Mudar para o tema claro", toDark: "Mudar para o tema escuro", language: "Idioma", telegram: "Entre no nosso Telegram" },
  hero: { badge: "No ar na mainnet da Polygon", tagline: "Infraestrutura avançada para ativos digitais", lede: "Staking de taxa fixa na Polygon. O contrato está publicado e verificado, o valor que pode entrar na estratégia tem limite, e você pode sacar sem pedir a nós.", verified: "Verificado no Sourcify", nonCustodial: "Sem custódia", exitOpen: "Saída sempre aberta" },
  footer: { platform: "Plataforma", trust: "Confiança", community: "Comunidade", tagline: "Infraestrutura de staking na Polygon. O código é aberto, o código publicado é verificado contra ele, e você pode sacar sem pedir a nós.", operatingFrom: "Operamos a partir da Malásia", disclaimer: "Os rendimentos do staking são parâmetros do contrato, não garantias. Todo depósito paga uma taxa antes de ser registrado, e a tela de depósito mostra a divisão exata antes de você assinar." },
  partial: "Esta página ainda não foi traduzida e é exibida em inglês.",
};

const pl: Dict = {
  nav: { home: "Start", dashboard: "Panel", exchange: "Wymiana", portfolio: "Portfel", rewards: "Nagrody", security: "Bezpieczeństwo", governance: "Zarządzanie", activity: "Aktywność", admin: "Administracja" },
  actions: { launch: "Otwórz platformę", explore: "Poznaj platformę", readSecurity: "Przeczytaj model bezpieczeństwa", joinTelegram: "Dołącz na Telegramie", getUsdt: "Zdobądź USDT na Polygonie" },
  header: { toLight: "Przełącz na jasny motyw", toDark: "Przełącz na ciemny motyw", language: "Język", telegram: "Dołącz do naszego Telegrama" },
  hero: { badge: "Działa w sieci głównej Polygon", tagline: "Zaawansowana infrastruktura dla aktywów cyfrowych", lede: "Staking o stałej stawce na Polygonie. Kontrakt jest opublikowany i zweryfikowany, kwota, która może trafić do strategii, jest ograniczona, a wypłacisz bez pytania nas o zgodę.", verified: "Zweryfikowany w Sourcify", nonCustodial: "Bez powiernictwa", exitOpen: "Wyjście zawsze otwarte" },
  footer: { platform: "Platforma", trust: "Zaufanie", community: "Społeczność", tagline: "Infrastruktura stakingowa na Polygonie. Źródło jest otwarte, wdrożony kod jest z nim zweryfikowany, a wypłacisz bez pytania nas o zgodę.", operatingFrom: "Działamy z Malezji", disclaimer: "Zyski ze stakingu to ustawienia w kontrakcie, nie gwarancje. Od każdej wpłaty pobierana jest opłata przed zapisaniem stawki, a ekran wpłaty pokazuje dokładny podział przed podpisaniem." },
  partial: "Ta strona nie została jeszcze przetłumaczona i jest wyświetlana po angielsku.",
};

const uk: Dict = {
  nav: { home: "Головна", dashboard: "Панель", exchange: "Обмін", portfolio: "Портфель", rewards: "Винагороди", security: "Безпека", governance: "Управління", activity: "Активність", admin: "Адміністрування" },
  actions: { launch: "Відкрити платформу", explore: "Огляд платформи", readSecurity: "Прочитати модель безпеки", joinTelegram: "Приєднатися в Telegram", getUsdt: "Отримати USDT у Polygon" },
  header: { toLight: "Перемкнути на світлу тему", toDark: "Перемкнути на темну тему", language: "Мова", telegram: "Приєднуйтесь до нашого Telegram" },
  hero: { badge: "Працює в основній мережі Polygon", tagline: "Передова інфраструктура для цифрових активів", lede: "Стейкінг за фіксованою ставкою в Polygon. Контракт опубліковано та перевірено, сума, яка може піти в стратегію, обмежена, і ви можете вивести кошти, не питаючи нас.", verified: "Перевірено на Sourcify", nonCustodial: "Без зберігання коштів", exitOpen: "Вихід завжди відкритий" },
  footer: { platform: "Платформа", trust: "Довіра", community: "Спільнота", tagline: "Інфраструктура стейкінгу в Polygon. Вихідний код відкритий, розгорнутий код звірено з ним, і ви можете вивести кошти, не питаючи нас.", operatingFrom: "Працюємо з Малайзії", disclaimer: "Дохідність стейкінгу — це параметри контракту, а не гарантії. З кожного депозиту стягується комісія до запису ставки, і екран депозиту показує точний розподіл до підписання." },
  partial: "Цю сторінку ще не перекладено, вона показана англійською.",
};

const tr: Dict = {
  nav: { home: "Ana sayfa", dashboard: "Panel", exchange: "Takas", portfolio: "Portföy", rewards: "Ödüller", security: "Güvenlik", governance: "Yönetişim", activity: "Etkinlik", admin: "Yönetim" },
  actions: { launch: "Platformu aç", explore: "Platformu keşfet", readSecurity: "Güvenlik modelini oku", joinTelegram: "Telegram'a katıl", getUsdt: "Polygon'da USDT edin" },
  header: { toLight: "Açık temaya geç", toDark: "Koyu temaya geç", language: "Dil", telegram: "Telegram kanalımıza katılın" },
  hero: { badge: "Polygon ana ağında yayında", tagline: "Gelişmiş dijital varlık altyapısı", lede: "Polygon üzerinde sabit oranlı staking. Sözleşme yayımlandı ve doğrulandı, stratejiye girebilecek tutar sınırlı, ve bize sormadan çekebilirsiniz.", verified: "Sourcify'da doğrulandı", nonCustodial: "Saklamasız", exitOpen: "Çıkış her zaman açık" },
  footer: { platform: "Platform", trust: "Güven", community: "Topluluk", tagline: "Polygon üzerinde staking altyapısı. Kaynak kodu açık, dağıtılan kod ona karşı doğrulandı, ve bize sormadan çekebilirsiniz.", operatingFrom: "Malezya'dan yürütülüyor", disclaimer: "Staking getirileri sözleşmedeki ayarlardır, garanti değildir. Her yatırımdan, tutar kaydedilmeden önce bir ücret alınır ve yatırma ekranı imzalamadan önce tam dağılımı gösterir." },
  partial: "Bu sayfa henüz çevrilmedi ve İngilizce gösteriliyor.",
};

const hi: Dict = {
  nav: { home: "होम", dashboard: "डैशबोर्ड", exchange: "एक्सचेंज", portfolio: "पोर्टफोलियो", rewards: "पुरस्कार", security: "सुरक्षा", governance: "गवर्नेंस", activity: "गतिविधि", admin: "एडमिन" },
  actions: { launch: "प्लेटफ़ॉर्म खोलें", explore: "प्लेटफ़ॉर्म देखें", readSecurity: "सुरक्षा मॉडल पढ़ें", joinTelegram: "टेलीग्राम पर जुड़ें", getUsdt: "Polygon पर USDT लें" },
  header: { toLight: "लाइट थीम पर जाएँ", toDark: "डार्क थीम पर जाएँ", language: "भाषा", telegram: "हमारे टेलीग्राम से जुड़ें" },
  hero: { badge: "Polygon मेननेट पर लाइव", tagline: "उन्नत डिजिटल एसेट अवसंरचना", lede: "Polygon पर निश्चित दर स्टेकिंग। कॉन्ट्रैक्ट प्रकाशित और सत्यापित है, रणनीति में जाने वाली राशि सीमित है, और आप हमसे पूछे बिना निकाल सकते हैं।", verified: "Sourcify पर सत्यापित", nonCustodial: "नॉन-कस्टोडियल", exitOpen: "निकासी हमेशा खुली" },
  footer: { platform: "प्लेटफ़ॉर्म", trust: "भरोसा", community: "समुदाय", tagline: "Polygon पर स्टेकिंग अवसंरचना। सोर्स खुला है, तैनात कोड उससे सत्यापित है, और आप हमसे पूछे बिना निकाल सकते हैं।", operatingFrom: "मलेशिया से संचालित", disclaimer: "स्टेकिंग रिटर्न कॉन्ट्रैक्ट की सेटिंग्स हैं, गारंटी नहीं। हर जमा पर स्टेक दर्ज होने से पहले शुल्क लगता है, और जमा स्क्रीन हस्ताक्षर से पहले सटीक विभाजन दिखाती है।" },
  partial: "यह पृष्ठ अभी अनूदित नहीं है और अंग्रेज़ी में दिखाया गया है।",
};

const bn: Dict = {
  nav: { home: "হোম", dashboard: "ড্যাশবোর্ড", exchange: "এক্সচেঞ্জ", portfolio: "পোর্টফোলিও", rewards: "পুরস্কার", security: "নিরাপত্তা", governance: "গভর্ন্যান্স", activity: "কার্যকলাপ", admin: "অ্যাডমিন" },
  actions: { launch: "প্ল্যাটফর্ম খুলুন", explore: "প্ল্যাটফর্ম দেখুন", readSecurity: "নিরাপত্তা মডেল পড়ুন", joinTelegram: "টেলিগ্রামে যোগ দিন", getUsdt: "Polygon-এ USDT নিন" },
  header: { toLight: "লাইট থিমে যান", toDark: "ডার্ক থিমে যান", language: "ভাষা", telegram: "আমাদের টেলিগ্রামে যোগ দিন" },
  hero: { badge: "Polygon মেইননেটে সক্রিয়", tagline: "উন্নত ডিজিটাল অ্যাসেট পরিকাঠামো", lede: "Polygon-এ নির্দিষ্ট হারে স্টেকিং। চুক্তিটি প্রকাশিত ও যাচাই করা, কৌশলে যেতে পারা পরিমাণ সীমিত, এবং আমাদের না জিজ্ঞাসা করেই আপনি তুলে নিতে পারেন।", verified: "Sourcify-তে যাচাই করা", nonCustodial: "নন-কাস্টোডিয়াল", exitOpen: "প্রস্থান সবসময় খোলা" },
  footer: { platform: "প্ল্যাটফর্ম", trust: "আস্থা", community: "কমিউনিটি", tagline: "Polygon-এ স্টেকিং পরিকাঠামো। সোর্স উন্মুক্ত, স্থাপিত কোড তার বিপরীতে যাচাই করা, এবং আমাদের না জিজ্ঞাসা করেই আপনি তুলে নিতে পারেন।", operatingFrom: "মালয়েশিয়া থেকে পরিচালিত", disclaimer: "স্টেকিং রিটার্ন চুক্তির সেটিং, গ্যারান্টি নয়। স্টেক নথিভুক্ত হওয়ার আগে প্রতিটি জমার উপর ফি নেওয়া হয়, এবং স্বাক্ষরের আগে জমার পর্দা সঠিক বিভাজন দেখায়।" },
  partial: "এই পৃষ্ঠাটি এখনও অনূদিত হয়নি এবং ইংরেজিতে দেখানো হচ্ছে।",
};

const id: Dict = {
  nav: { home: "Beranda", dashboard: "Dasbor", exchange: "Tukar", portfolio: "Portofolio", rewards: "Hadiah", security: "Keamanan", governance: "Tata kelola", activity: "Aktivitas", admin: "Admin" },
  actions: { launch: "Buka platform", explore: "Jelajahi platform", readSecurity: "Baca model keamanan", joinTelegram: "Gabung di Telegram", getUsdt: "Dapatkan USDT di Polygon" },
  header: { toLight: "Beralih ke tema terang", toDark: "Beralih ke tema gelap", language: "Bahasa", telegram: "Gabung Telegram kami" },
  hero: { badge: "Aktif di mainnet Polygon", tagline: "Infrastruktur aset digital tingkat lanjut", lede: "Staking bertarif tetap di Polygon. Kontraknya diterbitkan dan terverifikasi, jumlah yang bisa masuk ke strategi dibatasi, dan Anda bisa menarik tanpa meminta izin kami.", verified: "Terverifikasi di Sourcify", nonCustodial: "Non-kustodial", exitOpen: "Keluar selalu terbuka" },
  footer: { platform: "Platform", trust: "Kepercayaan", community: "Komunitas", tagline: "Infrastruktur staking di Polygon. Sumbernya terbuka, kode yang di-deploy diverifikasi terhadapnya, dan Anda bisa menarik tanpa meminta izin kami.", operatingFrom: "Beroperasi dari Malaysia", disclaimer: "Imbal hasil staking adalah pengaturan dalam kontrak, bukan jaminan. Setiap setoran dikenai biaya sebelum stake dicatat, dan layar setoran menampilkan rincian pastinya sebelum Anda menandatangani." },
  partial: "Halaman ini belum diterjemahkan dan ditampilkan dalam bahasa Inggris.",
};

const vi: Dict = {
  nav: { home: "Trang chủ", dashboard: "Bảng điều khiển", exchange: "Chuyển đổi", portfolio: "Danh mục", rewards: "Phần thưởng", security: "Bảo mật", governance: "Quản trị", activity: "Hoạt động", admin: "Quản trị viên" },
  actions: { launch: "Mở nền tảng", explore: "Khám phá nền tảng", readSecurity: "Đọc mô hình bảo mật", joinTelegram: "Tham gia Telegram", getUsdt: "Nhận USDT trên Polygon" },
  header: { toLight: "Chuyển sang giao diện sáng", toDark: "Chuyển sang giao diện tối", language: "Ngôn ngữ", telegram: "Tham gia Telegram của chúng tôi" },
  hero: { badge: "Đang chạy trên mainnet Polygon", tagline: "Hạ tầng tài sản số tiên tiến", lede: "Staking lãi suất cố định trên Polygon. Hợp đồng đã được công bố và xác minh, số tiền có thể đưa vào chiến lược bị giới hạn, và bạn có thể rút mà không cần hỏi chúng tôi.", verified: "Đã xác minh trên Sourcify", nonCustodial: "Không giữ hộ tài sản", exitOpen: "Luôn có thể rút" },
  footer: { platform: "Nền tảng", trust: "Tin cậy", community: "Cộng đồng", tagline: "Hạ tầng staking trên Polygon. Mã nguồn mở, mã đã triển khai được xác minh khớp với nó, và bạn có thể rút mà không cần hỏi chúng tôi.", operatingFrom: "Hoạt động từ Malaysia", disclaimer: "Lợi nhuận staking là các thiết lập trong hợp đồng, không phải cam kết. Mỗi khoản nạp đều bị thu phí trước khi được ghi nhận, và màn hình nạp hiển thị chi tiết chính xác trước khi bạn ký." },
  partial: "Trang này chưa được dịch và đang hiển thị bằng tiếng Anh.",
};

const th: Dict = {
  nav: { home: "หน้าแรก", dashboard: "แดชบอร์ด", exchange: "แลกเปลี่ยน", portfolio: "พอร์ต", rewards: "รางวัล", security: "ความปลอดภัย", governance: "ธรรมาภิบาล", activity: "กิจกรรม", admin: "ผู้ดูแล" },
  actions: { launch: "เปิดแพลตฟอร์ม", explore: "สำรวจแพลตฟอร์ม", readSecurity: "อ่านแบบจำลองความปลอดภัย", joinTelegram: "เข้าร่วมทาง Telegram", getUsdt: "รับ USDT บน Polygon" },
  header: { toLight: "สลับเป็นธีมสว่าง", toDark: "สลับเป็นธีมมืด", language: "ภาษา", telegram: "เข้าร่วม Telegram ของเรา" },
  hero: { badge: "ใช้งานจริงบนเมนเน็ต Polygon", tagline: "โครงสร้างพื้นฐานสินทรัพย์ดิจิทัลขั้นสูง", lede: "การสเตกอัตราคงที่บน Polygon สัญญาถูกเผยแพร่และตรวจสอบแล้ว จำนวนที่เข้าสู่กลยุทธ์มีเพดานกำหนด และคุณถอนได้โดยไม่ต้องขออนุญาตเรา", verified: "ตรวจสอบแล้วบน Sourcify", nonCustodial: "ไม่ถือครองแทน", exitOpen: "ถอนออกได้เสมอ" },
  footer: { platform: "แพลตฟอร์ม", trust: "ความน่าเชื่อถือ", community: "ชุมชน", tagline: "โครงสร้างพื้นฐานการสเตกบน Polygon ซอร์สโค้ดเปิด โค้ดที่ใช้งานจริงถูกตรวจสอบเทียบกับมัน และคุณถอนได้โดยไม่ต้องขออนุญาตเรา", operatingFrom: "ดำเนินงานจากมาเลเซีย", disclaimer: "ผลตอบแทนการสเตกเป็นค่าที่ตั้งไว้ในสัญญา ไม่ใช่การรับประกัน ทุกการฝากจะถูกหักค่าธรรมเนียมก่อนบันทึกยอดสเตก และหน้าจอฝากจะแสดงการแบ่งที่แน่นอนก่อนคุณลงนาม" },
  partial: "หน้านี้ยังไม่ได้แปลและแสดงเป็นภาษาอังกฤษ",
};

const ja: Dict = {
  nav: { home: "ホーム", dashboard: "ダッシュボード", exchange: "交換", portfolio: "ポートフォリオ", rewards: "リワード", security: "セキュリティ", governance: "ガバナンス", activity: "アクティビティ", admin: "管理" },
  actions: { launch: "プラットフォームを開く", explore: "プラットフォームを見る", readSecurity: "セキュリティモデルを読む", joinTelegram: "Telegram に参加", getUsdt: "Polygon で USDT を入手" },
  header: { toLight: "ライトテーマに切り替え", toDark: "ダークテーマに切り替え", language: "言語", telegram: "Telegram に参加する" },
  hero: { badge: "Polygon メインネットで稼働中", tagline: "高度なデジタル資産インフラ", lede: "Polygon 上の固定レートステーキング。コントラクトは公開・検証済みで、戦略に回せる金額には上限があり、当社の許可なく引き出せます。", verified: "Sourcify で検証済み", nonCustodial: "非カストディアル", exitOpen: "いつでも出金可能" },
  footer: { platform: "プラットフォーム", trust: "信頼", community: "コミュニティ", tagline: "Polygon 上のステーキング基盤。ソースは公開され、デプロイ済みコードはそれと照合済みで、当社の許可なく引き出せます。", operatingFrom: "マレーシアより運営", disclaimer: "ステーキング利回りはコントラクトの設定値であり、保証ではありません。各入金はステーク記録前に手数料が差し引かれ、署名前に入金画面で正確な内訳を確認できます。" },
  partial: "このページは未翻訳のため英語で表示されています。",
};

const ko: Dict = {
  nav: { home: "홈", dashboard: "대시보드", exchange: "교환", portfolio: "포트폴리오", rewards: "리워드", security: "보안", governance: "거버넌스", activity: "활동", admin: "관리자" },
  actions: { launch: "플랫폼 열기", explore: "플랫폼 둘러보기", readSecurity: "보안 모델 읽기", joinTelegram: "텔레그램 참여", getUsdt: "Polygon에서 USDT 받기" },
  header: { toLight: "라이트 테마로 전환", toDark: "다크 테마로 전환", language: "언어", telegram: "텔레그램 채널 참여" },
  hero: { badge: "Polygon 메인넷에서 운영 중", tagline: "고급 디지털 자산 인프라", lede: "Polygon의 고정 이율 스테이킹. 컨트랙트는 공개·검증되었고, 전략에 투입될 수 있는 금액에는 상한이 있으며, 저희에게 묻지 않고 출금할 수 있습니다.", verified: "Sourcify에서 검증됨", nonCustodial: "비수탁형", exitOpen: "언제나 출금 가능" },
  footer: { platform: "플랫폼", trust: "신뢰", community: "커뮤니티", tagline: "Polygon 기반 스테이킹 인프라. 소스는 공개되어 있고, 배포된 코드는 그에 대해 검증되었으며, 저희에게 묻지 않고 출금할 수 있습니다.", operatingFrom: "말레이시아에서 운영", disclaimer: "스테이킹 수익률은 컨트랙트의 설정값이며 보장이 아닙니다. 모든 입금은 스테이크가 기록되기 전에 수수료가 부과되고, 입금 화면이 서명 전에 정확한 내역을 보여줍니다." },
  partial: "이 페이지는 아직 번역되지 않아 영어로 표시됩니다.",
};

const zh: Dict = {
  nav: { home: "首页", dashboard: "仪表板", exchange: "兑换", portfolio: "资产组合", rewards: "奖励", security: "安全", governance: "治理", activity: "动态", admin: "管理" },
  actions: { launch: "进入平台", explore: "了解平台", readSecurity: "阅读安全模型", joinTelegram: "加入 Telegram", getUsdt: "在 Polygon 上获取 USDT" },
  header: { toLight: "切换到浅色主题", toDark: "切换到深色主题", language: "语言", telegram: "加入我们的 Telegram" },
  hero: { badge: "已在 Polygon 主网运行", tagline: "先进的数字资产基础设施", lede: "Polygon 上的固定利率质押。合约已公开并通过验证，可投入策略的金额设有上限，你无需征得我们同意即可提取。", verified: "已在 Sourcify 验证", nonCustodial: "非托管", exitOpen: "随时可退出" },
  footer: { platform: "平台", trust: "信任", community: "社区", tagline: "Polygon 上的质押基础设施。源码公开，部署的代码已与其比对验证，你无需征得我们同意即可提取。", operatingFrom: "运营地：马来西亚", disclaimer: "质押收益是合约中的参数设置，并非保证。每笔存款在记入质押前都会扣除手续费，存款界面会在你签名前显示确切的拆分。" },
  partial: "本页尚未翻译，暂以英文显示。",
};

export const DICTIONARIES: Record<Locale, Dict> = {
  en, de, es, fr, it, pt, pl, uk, tr, hi, bn, id, vi, th, ja, ko, zh,
};
