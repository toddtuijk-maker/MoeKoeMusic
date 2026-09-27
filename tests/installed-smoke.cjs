// node tests/installed-smoke.cjs "C:/path/to/MoeKoe Music.exe" [output-directory]
// Runs the packaged app with a fresh profile and a loopback-only debug port.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'moekoe-installed-smoke'));
let child, socket, profile;
const pending = new Map();
let sequence = 0;
function command(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
        pending.set(id, {resolve, reject, timer});
        socket.send(JSON.stringify({id, method, params}));
    });
}
async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
}
async function click(selector) {
    const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block: 'center'}); const r = el.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; })()`);
    await command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
    await command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
    await pause(250);
}
async function dismissGuides() {
    for (let i = 0; i < 5; i++) {
        await pause(350);
        if (!await evaluate(`!!document.querySelector('.onboarding-actions .text-button')`)) return;
        await click('.onboarding-actions .text-button');
    }
    assert.equal(await evaluate(`!!document.querySelector('.onboarding-overlay')`), false);
}
async function main() {
    assert(process.argv[2], 'Provide the installed executable path');
    await fs.mkdir(output, {recursive: true});
    profile = await fs.mkdtemp(path.join(os.tmpdir(), 'moekoe-packaged-profile-'));
    await fs.writeFile(path.join(profile, 'config.json'), JSON.stringify({disclaimerAccepted: true, settings: {startMinimized: 'on', minimizeToTray: 'off', greetings: 'off'}}));
    child = spawn(path.resolve(process.argv[2]), ['--user-data-dir=' + profile, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=19223'], {windowsHide: true, stdio: 'ignore'});
    let page;
    for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error('App exited before loading: ' + child.exitCode);
        try {
            const pages = await (await fetch('http://127.0.0.1:19223/json/list')).json();
            page = pages.find(item => item.type === 'page' && item.url.includes('dist/index.html'));
            if (page) break;
        } catch {}
        await pause(500);
    }
    assert(page, 'Packaged renderer did not load');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = ({data}) => {
        const message = JSON.parse(data);
        const request = pending.get(message.id);
        if (!request) return;
        clearTimeout(request.timer); pending.delete(message.id);
        if (message.error) request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
    };
    await pause(1500);
    await dismissGuides();
    const initial = await evaluate(`({url: location.href, theme: document.documentElement.dataset.colorTheme, dark: document.documentElement.classList.contains('dark'), sidebar: !!document.querySelector('.side-navigation'), native: window.electron?.platform})`);
    assert(initial.url.startsWith('file:'));
    assert.equal(initial.theme, 'neon'); assert.equal(initial.dark, true); assert.equal(initial.sidebar, true); assert.equal(initial.native, 'win32');
    const api = await (await fetch('http://127.0.0.1:6521/top/card?card_id=1')).json();
    assert.equal(api.error_code, 0, 'Bundled API recommendation request failed');
    await evaluate(`localStorage.setItem('disclaimerAccepted', 'true'); location.hash = '#/settings'`);
    await pause(800);
    await dismissGuides();
    assert.equal(await evaluate(`document.querySelectorAll('.theme-choice').length`), 9);
    await click('.theme-choice:has(input[value="lavender"])');
    await pause(250);
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('settings')).themeColor`), 'lavender');
    await click('.theme-choice:has(input[value="neon"])');
    const screenshot = await command('Page.captureScreenshot', {format: 'png'});
    await fs.writeFile(path.join(output, 'installed-settings.png'), Buffer.from(screenshot.data, 'base64'));
    const report = {passed: true, initial, bundledApi: 'passed', themeSwitchAndPersistence: 'passed', profile};
    await fs.writeFile(path.join(output, 'installed-smoke.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    // Existing IPC closes this test instance gracefully, including its API child.
    await evaluate(`window.electron.ipcRenderer.send('save-settings', {...JSON.parse(localStorage.getItem('settings')), minimizeToTray: 'off'}); window.electron.ipcRenderer.send('window-control', 'close')`).catch(() => {});
}
main().catch(async error => {
    console.error(error); process.exitCode = 1;
    if (socket?.readyState === 1) {
        const image = await command('Page.captureScreenshot', {format: 'png'}).catch(() => null);
        if (image) await fs.writeFile(path.join(output, 'failure.png'), Buffer.from(image.data, 'base64'));
    }
}).finally(async () => {
    socket?.close();
    if (child) {
        for (let i = 0; i < 20 && child.exitCode === null; i++) await pause(250);
        if (child.exitCode === null) await new Promise(resolve => spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'}).on('exit', resolve));
    }
});
