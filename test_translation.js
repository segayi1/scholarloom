'use strict';

const assert = require('node:assert/strict');
const createTranslation = require('./web/translation.js');

(async () => {
  const missing = createTranslation({});
  assert.equal(await missing.availability(), 'unavailable');
  await assert.rejects(missing.translate('hello'), /不可用/);
  let calls = 0, creations = 0;
  const api = createTranslation({Translator: {
    availability: async () => 'available',
    create: async () => {
      creations++;
      return {translate: async text => { calls++; return `译：${text}`; }};
    }
  }});
  assert.equal(await api.availability(), 'available');
  assert.deepEqual(await api.translate('hello'), {text: '译：hello', engine: 'browser'});
  assert.deepEqual(await api.translate('hello'), {text: '译：hello', engine: 'browser'});
  assert.equal(creations, 1);
  assert.equal(calls, 1);
  await assert.rejects(api.translate(' '), /请选择/);
  let attempts = 0;
  const retry = createTranslation({Translator: {
    availability: async () => 'available',
    create: async () => {
      if (++attempts === 1) throw new Error('download failed');
      return {translate: async () => '成功'};
    }
  }});
  assert.equal(await retry.availability(), 'available');
  await assert.rejects(retry.translate('retry'), /download failed/);
  assert.deepEqual(await retry.translate('retry'), {text: '成功', engine: 'browser'});
  let fallbackCalls = 0;
  const fallback = createTranslation({Translator: {
    availability: async () => 'unavailable',
    create: () => { throw new Error('should not create'); }
  }}, async text => { fallbackCalls++; return `离线：${text}`; });
  assert.equal(await fallback.availability(), 'unavailable');
  assert.equal(await fallback.translate('test'), '离线：test');
  assert.equal(await fallback.translate('test'), '离线：test');
  assert.equal(fallbackCalls, 1);
  const downloadable = createTranslation({Translator: {
    availability: async () => 'downloadable',
    create: () => { throw new Error('should not create'); }
  }}, async text => `在线：${text}`);
  assert.equal(await downloadable.availability(), 'downloadable');
  assert.equal(await downloadable.translate('test'), '在线：test');
  let configured = 0;
  const setup = createTranslation({Translator: {
    availability: async () => 'downloadable',
    create: async () => {
      configured++;
      return {translate: async text => `本地：${text}`};
    }
  }});
  assert.deepEqual(await setup.configure(), {availability: 'available', ready: true});
  assert.equal(configured, 1);
  assert.deepEqual(await setup.translate('configured'), {text: '本地：configured', engine: 'browser'});
  let unavailableCreations = 0;
  const unavailableSetup = createTranslation({Translator: {
    availability: async () => 'unavailable',
    create: async () => { unavailableCreations++; }
  }});
  assert.equal(await unavailableSetup.availability(), 'unavailable');
  assert.deepEqual(await unavailableSetup.configure(), {availability: 'unavailable', ready: false});
  assert.equal(unavailableCreations, 0);
  const failedNative = createTranslation({Translator: {
    availability: async () => 'available',
    create: () => { throw new Error('native model unavailable'); }
  }}, async () => '本地后备');
  assert.equal(await failedNative.availability(), 'available');
  assert.equal(await failedNative.translate('test'), '本地后备');
  console.log('Translation checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
