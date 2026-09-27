// Run with a local Vite server: npx electron tests/ui-smoke.cjs
// Uses an isolated, in-memory renderer session; no real account or library data.
const { app, BrowserWindow, nativeTheme } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const url = process.env.UI_TEST_URL || 'http://127.0.0.1:8080';
const output = process.env.UI_TEST_OUTPUT || path.join(app.getPath('temp'), 'moekoe-ui-smoke');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const failures = [];
let win;
const evaluate = fn => win.webContents.executeJavaScript(`(${fn.toString()})()`);
async function click(selector) {
    const point = await win.webContents.executeJavaScript(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error('Missing target: ' + ${JSON.stringify(selector)});
        el.scrollIntoView({block: 'center'});
        const r = el.getBoundingClientRect(); return {x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2)};
    })()`);
    win.webContents.sendInputEvent({type: 'mouseDown', button: 'left', clickCount: 1, ...point});
    win.webContents.sendInputEvent({type: 'mouseUp', button: 'left', clickCount: 1, ...point});
    await pause(180);
}
async function screenshot(name) {
    await evaluate(() => { document.querySelector('.settings-content')?.scrollTo(0, 0); });
    await pause(500);
    const image = await win.webContents.capturePage();
    await fs.writeFile(path.join(output, name + '.png'), image.toPNG());
}
app.whenReady().then(async () => {
    await fs.mkdir(output, {recursive: true});
    win = new BrowserWindow({width: 1280, height: 850, show: false, webPreferences: {partition: 'ui-smoke', backgroundThrottling: false, offscreen: true}});
    win.webContents.setAudioMuted(true);
    win.webContents.on('console-message', details => {
        if (details.level === 'error' && /全局捕获异常|Unhandled|未处理/.test(details.message)) failures.push(details.message);
    });
    // Seed only test preferences before mounting the application.
    await win.loadURL(url + '/favicon.ico');
    await evaluate(() => {
        localStorage.setItem('settings', JSON.stringify({language: 'zh-CN', themeColor: 'pink', theme: 'light', navigationMode: 'top', apiBaseUrl: 'http://127.0.0.1:16521'}));
        localStorage.setItem('disclaimerAccepted', 'true');
        localStorage.setItem('moekoe:onboarding-guide-intro-version', '1');
    });
    await win.webContents.executeJavaScript("import('/src/config/onboardingGuide.js').then(m => m.onboardingGuideGroups.forEach(g => localStorage.setItem(g.storageKey || `${m.ONBOARDING_GUIDE_STORAGE_PREFIX}${g.key}:version`, g.version)))");
    await win.loadURL(url + '/#/settings');
    await pause(1500);
    await screenshot('initial');
    assert.equal(await evaluate(() => document.querySelectorAll('.theme-choice').length), 9);
    const ids = ['pink', 'blue', 'green', 'orange', 'lavender', 'teal', 'amber', 'slate', 'neon'];
    for (const mode of ['light', 'dark']) {
        await click('[data-setting="theme"]');
        await click(`.modal-content > ul > li:nth-child(${mode === 'light' ? 2 : 3})`);
        for (const id of ids) {
            await click(`.theme-choice:has(input[value="${id}"])`);
            const state = await evaluate(() => ({
                selected: document.querySelector('.theme-choice.selected input')?.value,
                stored: JSON.parse(localStorage.getItem('settings')).themeColor,
                theme: document.documentElement.dataset.colorTheme,
                filter: getComputedStyle(document.documentElement).filter,
                background: getComputedStyle(document.querySelector('.settings-page')).backgroundColor,
                overflow: document.documentElement.scrollWidth > innerWidth
            }));
            assert.equal(state.selected, id); assert.equal(state.stored, id); assert.equal(state.theme, id);
            assert.equal(state.filter, 'none'); assert.equal(state.overflow, false);
            if (mode === 'dark') assert.equal(state.background, 'rgb(23, 25, 27)');
        }
        await click('.theme-choice:has(input[value="lavender"])');
        await screenshot('settings-' + mode);
    }
    await win.webContents.reload(); await pause(1500);
    assert.equal(await evaluate(() => document.querySelector('.theme-choice.selected input').value), 'lavender');
    assert.equal(await evaluate(() => document.documentElement.classList.contains('dark')), true);
    // Native radio keys must update the same persisted preference as mouse input.
    await evaluate(() => document.querySelector('input[value="lavender"]').focus());
    win.webContents.sendInputEvent({type: 'keyDown', keyCode: 'Right'});
    win.webContents.sendInputEvent({type: 'keyUp', keyCode: 'Right'}); await pause(250);
    assert.equal(await evaluate(() => JSON.parse(localStorage.getItem('settings')).themeColor), 'teal');
    nativeTheme.themeSource = 'dark';
    await win.webContents.executeJavaScript("import('/src/utils/utils.js').then(m => m.setTheme('auto'))");
    assert.equal(await evaluate(() => document.documentElement.classList.contains('dark')), true);
    nativeTheme.themeSource = 'light'; await pause(350);
    assert.equal(await evaluate(() => document.documentElement.classList.contains('dark')), false);
    // Explicit mode must unsubscribe from system changes.
    await win.webContents.executeJavaScript("import('/src/utils/utils.js').then(m => m.setTheme('light'))");
    nativeTheme.themeSource = 'dark'; await pause(250);
    assert.equal(await evaluate(() => document.documentElement.classList.contains('dark')), false);
    for (const width of [960, 760]) {
        win.setSize(width, 720); await pause(250);
        const bounds = await evaluate(() => Array.from(document.querySelectorAll('.theme-choice, .settings-page, .player-container, .player-bar, .album-art')).map(el => {
            const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, viewport: innerWidth};
        }));
        assert(bounds.every(r => r.left >= 0 && r.right <= r.viewport + 1), 'UI clips at ' + width);
        await screenshot('settings-' + width);
    }
    win.setSize(1280, 850);
    await evaluate(() => {
        const settings = JSON.parse(localStorage.getItem('settings'));
        settings.navigationMode = 'side'; settings.playerBarLayout = 'content';
        localStorage.setItem('settings', JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('settings-change', {detail: {settings}}));
    }); await pause(350);
    assert.equal(await evaluate(() => !!document.querySelector('.side-navigation')), true);
    await click('.side-action-button[title="折叠/展开"]');
    assert.equal(await evaluate(() => document.querySelector('.side-navigation').classList.contains('collapsed')), true);
    await click('.side-action-button[title="折叠/展开"]');
    await screenshot('settings-sidebar');
    await click('.side-profile-menu-button');
    assert.equal(await evaluate(() => document.querySelector('.side-profile-menu').getBoundingClientRect().top > document.querySelector('.side-brand').getBoundingClientRect().bottom), true);
    await click('.side-profile-menu-button');
    win.setSize(890, 720); await pause(350);
    const playerBounds = await evaluate(() => Array.from(document.querySelectorAll('.player-bar .control-btn, .player-bar .extra-btn, .player-bar .volume-control')).map(el => {
        const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, viewport: innerWidth};
    }));
    assert(playerBounds.every(r => r.left >= 0 && r.right <= r.viewport + 1), 'Content player controls clip at minimum desktop width: ' + JSON.stringify(playerBounds));
    assert.equal(await evaluate(() => document.querySelector('.player-bar .album-art').getBoundingClientRect().width), 60);
    await screenshot('settings-sidebar-890');
    win.setSize(1280, 850); await pause(350);
    await win.webContents.executeJavaScript("location.hash = '#/'"); await pause(1500);
    assert.equal(await evaluate(() => !!document.querySelector('.home-recommendations-section')), true);
    await screenshot('home-light');
    await win.webContents.executeJavaScript("import('/src/utils/utils.js').then(m => {m.applyColorTheme('neon'); m.setTheme('dark');})");
    await screenshot('home-dark');
    await win.webContents.executeJavaScript("location.hash = '#/discover'"); await pause(1200);
    assert.equal(await evaluate(() => !!document.querySelector('.player-container')), true);
    await screenshot('discover-dark');
    await win.webContents.executeJavaScript("location.hash = '#/login'"); await pause(600);
    assert.equal(await evaluate(() => !!document.querySelector('.login-container')), true);
    assert.equal(await evaluate(() => getComputedStyle(document.querySelector('.login-container .primary-button')).color), 'rgb(23, 25, 27)');
    assert.equal(await evaluate(() => getComputedStyle(document.querySelector('.login-container .append-button:disabled')).backgroundColor), 'rgb(48, 52, 54)');
    await screenshot('login-dark');
    await click('.extra-btn[title="播放列表"]');
    assert.equal(await evaluate(() => !!document.querySelector('.queue-popup')), true);
    await click('.extra-btn[title="播放列表"]');
    await click('.extra-btn[title="播放速度"]');
    assert.equal(await evaluate(() => !!document.querySelector('.speed-menu')), true);
    await click('.extra-btn[title="播放速度"]');
    await win.webContents.executeJavaScript("location.hash = '#/settings'"); await pause(300);
    for (const locale of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'ru']) {
        await win.webContents.executeJavaScript(`import('/src/utils/i18n.js').then(m => { m.default.global.locale = '${locale}'; })`);
        const labels = await evaluate(() => Array.from(document.querySelectorAll('.theme-choice-label')).map(el => el.textContent));
        assert.equal(labels.length, 9); assert(labels.every(text => !text.includes('theme-')));
    }
    await win.webContents.executeJavaScript("import('/src/utils/i18n.js').then(m => { m.default.global.locale = 'zh-CN'; })");
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
    const duration = await evaluate(() => parseFloat(getComputedStyle(document.querySelector('.page-route-view')).animationDuration));
    assert(duration <= .00001);
    win.webContents.debugger.detach();
    // Missing appearance preferences use the new defaults without migrating saved choices.
    await evaluate(() => {
        localStorage.removeItem('theme');
        localStorage.setItem('settings', JSON.stringify({language: 'zh-CN', apiBaseUrl: 'http://127.0.0.1:16521'}));
    });
    await win.loadURL(url + '/favicon.ico');
    await win.loadURL(url + '/#/'); await pause(1500);
    assert.equal(await evaluate(() => document.documentElement.dataset.colorTheme), 'neon');
    assert.equal(await evaluate(() => document.documentElement.classList.contains('dark')), true);
    assert.equal(await evaluate(() => !!document.querySelector('.side-navigation')), true);
    assert.equal(await evaluate(() => !!document.querySelector('.icon-recommendations')), true);
    await screenshot('home-default');
    await click('.side-footer a');
    assert.equal(await evaluate(() => !!document.querySelector('.settings-page')), true);
    await screenshot('settings-default');
    await win.webContents.executeJavaScript("location.hash = '#/'"); await pause(350);
    await click('.recommend-title');
    assert.equal(await evaluate(() => localStorage.getItem('homeRecommendCardStyle')), 'image');
    await pause(350);
    assert.equal(await evaluate(() => !!document.querySelector('.radio-card')), true);
    await click('.recommend-title');
    assert.deepEqual(failures, [], 'Renderer errors');
    console.log(JSON.stringify({passed: true, checks: ['9 palettes × light/dark', 'persistence', 'keyboard', 'system mode', 'explicit mode', '960/760 layouts', 'sidebar collapse', 'content player layout', 'home/discover routes', 'queue/speed menus', '6 locales', 'reduced motion', 'first-run defaults'], output}, null, 2));
    app.exit(0);
}).catch(async error => { if (win) await screenshot('failure'); console.error(error); app.exit(1); });
