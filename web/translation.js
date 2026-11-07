(function (root) {
  'use strict';

  function createTranslation(browser = root, fallback = null) {
    const cache = new Map();
    let translator;
    let nativeAvailability = 'unknown';
    async function checkAvailability() {
      if (!browser.Translator) return nativeAvailability = 'unavailable';
      try {
        return nativeAvailability = await browser.Translator.availability({sourceLanguage: 'en', targetLanguage: 'zh'});
      } catch {
        return nativeAvailability = 'unavailable';
      }
    }
    async function initialize(progress = () => {}, timeoutMs = 45000) {
      if (!browser.Translator) throw new Error('浏览器本地翻译不可用。');
      if (translator) return translator;
      const controller = new AbortController();
      let timeout;
      try {
        const pending = Promise.resolve(browser.Translator.create({
          sourceLanguage: 'en', targetLanguage: 'zh', signal: controller.signal,
          monitor(m) { m.addEventListener('downloadprogress', e => progress(e.loaded)); }
        }));
        pending.then(result => { if (controller.signal.aborted) result.destroy?.(); }, () => {});
        const expiry = new Promise((_, reject) => {
          timeout = setTimeout(() => { controller.abort(); reject(new Error('本地语言包启动超时。')); }, timeoutMs);
        });
        translator = Promise.race([pending, expiry]).finally(() => clearTimeout(timeout));
        return translator;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    }
    return {
      availability: checkAvailability,
      async configure(progress = () => {}) {
        if (!browser.Translator || nativeAvailability === 'unavailable') {
          return {availability: 'unavailable', ready: false};
        }
        try {
          // Keep create() in the click task so browsers can request the language-pack download.
          await initialize(progress, 120000);
          nativeAvailability = 'available';
          return {availability: 'available', ready: true};
        } catch (error) {
          translator = null;
          return {availability: await checkAvailability(), ready: false, error: error.message};
        }
      },
      async translate(text, progress = () => {}) {
        const input = String(text || '').trim();
        if (!input) throw new Error('请选择需要翻译的英文文本。');
        if (cache.has(input)) return cache.get(input);
        try {
          if (!browser.Translator || nativeAvailability !== 'available') throw new Error('浏览器本地翻译不可用。');
          await initialize(progress);
          const result = {text: await (await translator).translate(input), engine: 'browser'};
          cache.set(input, result);
          return result;
        } catch (error) {
          translator = null;
          if (!fallback) throw error;
          const result = await fallback(input);
          cache.set(input, result);
          return result;
        }
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = createTranslation;
  else root.createScholarTranslation = createTranslation;
})(globalThis);
