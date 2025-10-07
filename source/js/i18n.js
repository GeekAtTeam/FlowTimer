class I18n {
    constructor() {
        this.currentLocale = this.detectLocale();
        this.translations = {};
        this.init();
    }

    async init() {
        await this.loadTranslations();
    }

    detectLocale() {
        // 先检查是否有保存的语言设置
        const savedLanguage = this.getSavedLanguage();
        if (savedLanguage && savedLanguage !== 'system') {
            return savedLanguage;
        }
        
        // 如果设置为跟随系统或没有保存的设置，检测浏览器语言
        const browserLang = navigator.language || navigator.languages[0];
        
        // 如果是中文（包括简体中文、繁体中文等），返回中文
        if (browserLang.startsWith('zh')) {
            return 'zh-CN';
        }
        
        // 默认返回英文
        return 'en-US';
    }
    
    getSavedLanguage() {
        try {
            return localStorage.getItem('flowTimer_language') || 'system';
        } catch (error) {
            console.error('Failed to get saved language:', error);
            return 'system';
        }
    }
    
    saveLanguage(language) {
        try {
            localStorage.setItem('flowTimer_language', language);
            console.log('Language saved:', language);
        } catch (error) {
            console.error('Failed to save language:', error);
        }
    }

    async loadTranslations() {
        try {
            const response = await fetch(`locales/${this.currentLocale}.json`);
            this.translations = await response.json();
            console.log(`Loaded translations for ${this.currentLocale}:`, this.translations);
        } catch (error) {
            console.error('Failed to load translations:', error);
            // 如果加载失败，尝试加载英文作为备用
            if (this.currentLocale !== 'en-US') {
                try {
                    const response = await fetch('locales/en-US.json');
                    this.translations = await response.json();
                    this.currentLocale = 'en-US';
                    console.log('Fallback to English translations');
                } catch (fallbackError) {
                    console.error('Failed to load fallback translations:', fallbackError);
                    // 如果连英文都加载失败，使用空对象
                    this.translations = {};
                }
            }
        }
    }

    t(key, params = {}) {
        // 支持嵌套键，如 'timer.focusTime'
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key; // 返回键名作为备用
            }
        }
        
        // 如果找到的是字符串，进行参数替换
        if (typeof value === 'string') {
            return this.interpolate(value, params);
        }
        
        return value || key;
    }

    interpolate(template, params) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    getCurrentLocale() {
        return this.currentLocale;
    }

    isChinese() {
        return this.currentLocale === 'zh-CN';
    }

    isEnglish() {
        return this.currentLocale === 'en-US';
    }
    
    async switchLanguage(language) {
        // 保存语言设置
        this.saveLanguage(language);
        
        // 重新检测语言
        this.currentLocale = this.detectLocale();
        
        // 重新加载翻译
        await this.loadTranslations();
        
        // 通知所有页面更新界面
        this.notifyLanguageChange();
        
        return this.currentLocale;
    }
    
    notifyLanguageChange() {
        // 发送自定义事件通知界面更新
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { locale: this.currentLocale, translations: this.translations }
        }));
    }
}

// 创建全局实例
window.i18n = new I18n();
