/**
 * I18n Module - Multi-language Support
 */

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'zh', 'hi', 'ru', 'ja', 'es', 'pt', 'id', 'tr', 'de', 'fr'];
        this.currentLanguage = this.detectLanguage();
        this.languageNames = {
            ko: '🇰🇷 한국어',
            en: '🇺🇸 English',
            zh: '🇨🇳 中文',
            hi: '🇮🇳 हिन्दी',
            ru: '🇷🇺 Русский',
            ja: '🇯🇵 日本語',
            es: '🇪🇸 Español',
            pt: '🇧🇷 Português',
            id: '🇮🇩 Bahasa Indonesia',
            tr: '🇹🇷 Türkçe',
            de: '🇩🇪 Deutsch',
            fr: '🇫🇷 Français'
        };
    }

    detectLanguage() {
        // Check localStorage with error handling
        try {
            const saved = localStorage.getItem('language');
            if (saved && this.supportedLanguages.includes(saved)) {
                return saved;
            }
        } catch (e) {
            console.warn('localStorage not available for language detection:', e.message);
        }

        // Check browser language
        try {
            const browserLang = navigator.language.split('-')[0];
            if (this.supportedLanguages.includes(browserLang)) {
                return browserLang;
            }
        } catch (e) {
            console.warn('Failed to detect browser language:', e.message);
        }

        // Default to English
        return 'en';
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return this.translations[lang];
        }

        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load ${lang}.json`);
            const data = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error(`Invalid translation data for ${lang}`);
            }
            this.translations[lang] = data;
            return this.translations[lang];
        } catch (e) {
            console.error(`Failed to load translations for ${lang}:`, e.message);
            // Fallback to English if not already trying English
            if (lang !== 'en') {
                try {
                    return await this.loadTranslations('en');
                } catch (fallbackError) {
                    console.error('Failed to load English fallback:', fallbackError.message);
                    return {};
                }
            }
            return {};
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage] || {};

        for (const k of keys) {
            value = value[k];
            if (!value) return key; // Fallback to key if not found
        }

        return typeof value === 'string' ? value : key;
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language ${lang} not supported`);
            return;
        }

        try {
            await this.loadTranslations(lang);
            this.currentLanguage = lang;

            // Try to save language preference to localStorage
            try {
                localStorage.setItem('language', lang);
            } catch (storageError) {
                console.warn('Failed to save language preference to localStorage:', storageError.message);
                // Continue anyway - language is still set in memory
            }

            this.updateUI();
        } catch (e) {
            console.error('Failed to set language:', e.message);
        }
    }

    updateUI() {
        try {
            // Update elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(element => {
                try {
                    const key = element.getAttribute('data-i18n');
                    if (key) {
                        element.textContent = this.t(key);
                    }
                } catch (e) {
                    console.warn('Error updating element:', e.message);
                }
            });

            // Update elements with data-i18n-attr attribute
            document.querySelectorAll('[data-i18n-attr]').forEach(element => {
                try {
                    const key = element.getAttribute('data-i18n-attr');
                    if (key) {
                        element.setAttribute('title', this.t(key));
                    }
                } catch (e) {
                    console.warn('Error updating element attribute:', e.message);
                }
            });

            // Update language menu
            this.updateLanguageMenu();
        } catch (e) {
            console.error('Error during updateUI:', e.message);
        }
    }

    updateLanguageMenu() {
        try {
            const langMenu = document.getElementById('langMenu');
            if (!langMenu) return;

            langMenu.innerHTML = this.supportedLanguages
                .map(lang => {
                    const name = this.languageNames[lang] || lang;
                    const isActive = lang === this.currentLanguage ? 'active' : '';
                    // Use safer event handler
                    return `
                        <button class="lang-option ${isActive}"
                                data-lang="${lang}"
                                data-lang-code="${lang}"
                                title="${name}">
                            ${name}
                        </button>
                    `;
                })
                .join('');

            // Attach event listeners to avoid inline onclick
            document.querySelectorAll('.lang-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const langCode = e.currentTarget.getAttribute('data-lang-code');
                    if (langCode) {
                        this.setLanguage(langCode);
                    }
                });
            });
        } catch (e) {
            console.error('Error updating language menu:', e.message);
        }
    }

    setupLanguageSelector() {
        try {
            const langBtn = document.getElementById('langBtn');
            const langMenu = document.getElementById('langMenu');

            if (!langBtn || !langMenu) {
                console.warn('Language selector elements not found in DOM');
                return;
            }

            langBtn.addEventListener('click', (e) => {
                try {
                    e.stopPropagation();
                    langMenu.classList.toggle('hidden');
                } catch (e) {
                    console.warn('Error toggling language menu:', e.message);
                }
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                try {
                    if (langBtn && langMenu && !langBtn.contains(e.target) && !langMenu.contains(e.target)) {
                        langMenu.classList.add('hidden');
                    }
                } catch (e) {
                    console.warn('Error closing language menu:', e.message);
                }
            });

            this.updateLanguageMenu();
        } catch (e) {
            console.error('Error setting up language selector:', e.message);
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getLanguageName(lang) {
        return this.languageNames[lang] || lang;
    }

    async initI18n() {
        try {
            // Load current language
            await this.loadTranslations(this.currentLanguage);

            // Load English as fallback
            if (this.currentLanguage !== 'en') {
                try {
                    await this.loadTranslations('en');
                } catch (e) {
                    console.warn('Failed to load English fallback:', e.message);
                }
            }

            // Setup language selector
            this.setupLanguageSelector();

            // Update UI
            this.updateUI();
        } catch (e) {
            console.error('Error initializing i18n:', e.message);
            // Fallback: try to use English
            if (this.currentLanguage !== 'en') {
                try {
                    this.currentLanguage = 'en';
                    await this.loadTranslations('en');
                    this.updateUI();
                } catch (fallbackError) {
                    console.error('Failed to fallback to English:', fallbackError.message);
                }
            }
        }
    }
}

// Create global instance
window.i18n = new I18n();
