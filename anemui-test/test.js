const Chrome = require('selenium-webdriver/chrome');
const Firefox = require('selenium-webdriver/firefox');
const Edge = require('selenium-webdriver/edge');
const {suite} = require('selenium-webdriver/testing');
const {By, Browser, Key, until} = require('selenium-webdriver');

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

// Configuración por variables de entorno (sin credenciales en el código)
//   TEST_BASE_URL  URL del visor; {code} se sustituye por serviceCode.
//                  Por defecto, el -dev de servicios-climaticos. Para el servidor local: http://localhost:9000/
//   TEST_USER, TEST_PASSWORD  Autenticación básica; si no se dan, se entra sin autenticar.
//   TEST_HEADLESS  0 para ver el navegador; por defecto, sin ventana.
//   TEST_TIMEOUT   Tiempo límite de cada test, en ms (por defecto, 60000).
//   SELENIUM_BROWSER  chrome o firefox para ejecutar solo uno (lo lee selenium-webdriver/testing).
const VAR_BASE_URL = process.env.TEST_BASE_URL || 'https://servicios-climaticos.pti-clima.csic.es/{code}-dev/';
const VAR_USR = process.env.TEST_USER || '';
const VAR_PWD = process.env.TEST_PASSWORD || '';
const VAR_HEADLESS = process.env.TEST_HEADLESS !== '0';
const VAR_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000', 10);
const VAR_LOAD_TIMEOUT = 30 * 1000;
const VAR_SCREENSHOT_PATH = 'test/screenShots/';
const VAR_DOWNLOAD_PATH = 'test/downloads/';
const VAR_WINDOW = { width: 1000, height: 660 };

const VAR_TEST_1 = 'Test 1 - Se cargan el título y la cabecera correctas';
const VAR_TEST_2 = 'Test 2 - Se cargan las variables correctas';
const VAR_TEST_3 = 'Test 3 - Se muestra el marcador correspondiente al pulsar en el mapa';
const VAR_TEST_4 = 'Test 4 - Se puede descargar un fichero CSV.';
const VAR_TEST_5 = 'Test 5 - Se muestra el gráfico de pixel';
const VAR_TEST_6 = 'Test 6 - Se carga el mapa de la última fecha de todos los índices';
const VAR_TEST_7 = 'Test 7 - Los índices están actualizados';

// Tamaño en bytes de los tipos de struct que usa times.json (offsetType, sizeType, varType)
const STRUCT_SIZES = { b: 1, B: 1, h: 2, H: 2, i: 4, I: 4, l: 4, L: 4, q: 8, Q: 8, f: 4, d: 8 };

function readStruct(buf, type, off) {
    switch (type) {
        case 'b': return buf.readInt8(off);
        case 'B': return buf.readUInt8(off);
        case 'h': return buf.readInt16LE(off);
        case 'H': return buf.readUInt16LE(off);
        case 'i': case 'l': return buf.readInt32LE(off);
        case 'I': case 'L': return buf.readUInt32LE(off);
        case 'q': return Number(buf.readBigInt64LE(off));
        case 'Q': return Number(buf.readBigUInt64LE(off));
        case 'f': return buf.readFloatLE(off);
        case 'd': return buf.readDoubleLE(off);
    }
    throw new Error('Tipo de struct no admitido: ' + type);
}

// Petición HTTP de solo lectura, con autenticación básica si se ha dado y rango de bytes opcional
async function httpGet(url, range) {
    const headers = {};
    if (VAR_USR) headers.Authorization = 'Basic ' + Buffer.from(VAR_USR + ':' + VAR_PWD).toString('base64');
    if (range) headers.Range = 'bytes=' + range[0] + '-' + range[1];
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + url);
    return Buffer.from(await res.arrayBuffer());
}

// Mapa de la fecha t de un índice y porción, leído igual que downloadXYChunk de anemui-core:
// -xy.bin da el desplazamiento y el tamaño del trozo dentro de -xy.nc, que va comprimido con zlib
async function downloadXYMap(webPage, timesJs, varId, portion, t) {
    const offSize = STRUCT_SIZES[timesJs.offsetType];
    const entry = offSize + STRUCT_SIZES[timesJs.sizeType];
    const idx = await httpGet(webPage + 'nc/' + varId + portion + '-xy.bin', [t * entry, (t + 1) * entry - 1]);
    const offset = readStruct(idx, timesJs.offsetType, 0);
    const size = readStruct(idx, timesJs.sizeType, offSize);
    assert.ok(size > 0, 'Trozo vacío en ' + varId + portion + ', fecha ' + t);
    const raw = zlib.inflateSync(await httpGet(webPage + 'nc/' + varId + portion + '-xy.nc', [offset, offset + size - 1]));
    const k = STRUCT_SIZES[timesJs.varType];
    const values = [];
    for (let i = 0; i < raw.length / k; i++) values.push(readStruct(raw, timesJs.varType, i * k));
    return values;
}

function lastDate(times) {
    return Array.isArray(times) ? times[times.length - 1] : times;
}

// Muestra del test 6: perFamily índices de cada familia (el varId sin el nombre del
// índice y con los números como N), distintos cada día para recorrerlos todos con el tiempo
function sampleVars(varIds, perFamily) {
    const families = {};
    for (const v of varIds) {
        const f = v.replace(/^[^_]+_/, '').replace(/\d+/g, 'N');
        (families[f] = families[f] || []).push(v);
    }
    const day = Math.floor(Date.now() / 86400000);
    const sample = [];
    for (const list of Object.values(families)) {
        for (let i = 0; i < Math.min(perFamily, list.length); i++) {
            sample.push(list[(day * perFamily + i) % list.length]);
        }
    }
    return sample;
}

class csTest {

    scrShotFolder;
    downloadFolder;

    async takeScreenshot(driver, fileName) {
        try {
            const image = await driver.takeScreenshot();
            fs.mkdirSync(this.scrShotFolder, { recursive: true });
            fs.writeFileSync(path.join(this.scrShotFolder, fileName + '.png'), image, 'base64');
        } catch (err) {
            console.error(err);
        }
    }

    // Vacía una carpeta propia del test (capturas o descargas), nunca una del sistema
    emptyFolder(folder) {
        fs.mkdirSync(folder, { recursive: true });
        fs.readdirSync(folder).forEach((file) => fs.unlinkSync(path.join(folder, file)));
    }

    downloadedFiles() {
        return fs.readdirSync(this.downloadFolder)
            .filter(f => !f.endsWith('.part') && !f.endsWith('.crdownload'));
    }

    async openViewer(driver, browserName, webPage) {
        if (VAR_USR && browserName == 'chrome') {
            const connection = await driver.createCDPConnection('page');
            await driver.register(VAR_USR, VAR_PWD, connection);
            await driver.get(webPage);
        } else if (VAR_USR) {
            // Se entra por times.json, que pide autenticación también en localhost (proxy a -dev)
            const url = new URL('times.json', webPage);
            url.username = VAR_USR;
            url.password = VAR_PWD;
            // Con usuario:contraseña@ en la URL, los fetch relativos del visor fallan:
            // se entra una vez con credenciales y se vuelve a cargar la URL limpia
            await driver.get(url.href);
            await driver.get(webPage);
        } else {
            await driver.get(webPage);
        }
        await driver.wait(until.elementLocated(By.css('#map canvas')), VAR_LOAD_TIMEOUT, 'No se ha pintado el mapa');
    }

    async clickMapCenter(driver) {
        const map = await driver.findElement(By.id('map'));
        await driver.actions({ async: true }).move({ origin: map, x: 0, y: 0 }).click().perform();
    }

    // Pincha en una latitud y longitud; convierte a píxel con el mapa de OpenLayers (EPSG:4326 o EPSG:3857)
    async clickMapLatLng(driver, point) {
        const pixel = await driver.executeScript(function (lat, lng) {
            const map = window.CsViewerApp.getMap().controller.map;
            const code = map.getView().getProjection().getCode();
            let coord;
            if (code == 'EPSG:4326') coord = [lng, lat];
            else if (code == 'EPSG:3857') coord = [lng * 20037508.34 / 180, Math.log(Math.tan((90 + lat) * Math.PI / 360)) * 6378137];
            else return { error: 'Proyección no admitida: ' + code };
            const p = map.getPixelFromCoordinate(coord);
            const r = map.getViewport().getBoundingClientRect();
            return { x: r.left + p[0], y: r.top + p[1] };
        }, point.lat, point.lng);
        if (pixel.error) throw new Error(pixel.error);
        const map = await driver.findElement(By.id('map'));
        const rect = await map.getRect();
        await driver.actions({ async: true }).move({
            origin: map,
            x: Math.round(pixel.x - rect.x - rect.width / 2),
            y: Math.round(pixel.y - rect.y - rect.height / 2)
        }).click().perform();
    }

    // Fecha (pointDate, tal como se escribe en el selector) y punto (clickPoint) con dato para los tests 3 a 5
    async selectPoint(driver, pointDate, clickPoint) {
        if (pointDate) {
            const input = await driver.wait(until.elementLocated(By.css('#PickerFrame input')), VAR_LOAD_TIMEOUT, 'No aparece el selector de fecha');
            await input.click();
            await input.clear();
            await input.sendKeys(pointDate, Key.ENTER);
            await driver.wait(async () => (await input.getAttribute('value')) == pointDate, VAR_LOAD_TIMEOUT, 'No se ha podido poner la fecha ' + pointDate);
        }
        if (!clickPoint) {
            await this.clickMapCenter(driver);
            return;
        }
        // Si se pincha mientras se cargan los datos de la fecha nueva, el clic se pierde: se repite
        // hasta que el visor tiene el dato de ese punto (getLastLlData)
        const hasPointData = () => driver.executeScript(function (lat, lng) {
            const ll = window.CsViewerApp.getLastLlData();
            return !!(ll && ll.latlng && Math.abs(ll.latlng.lat - lat) < 0.5 && Math.abs(ll.latlng.lng - lng) < 0.5);
        }, clickPoint.lat, clickPoint.lng);
        for (let attempt = 0; attempt < 4; attempt++) {
            await this.clickMapLatLng(driver, clickPoint);
            try {
                await driver.wait(hasPointData, 5000);
                return;
            } catch (e) { /* se vuelve a pinchar */ }
        }
        throw new Error('El visor no tiene dato en ' + JSON.stringify(clickPoint) + (pointDate ? ' el ' + pointDate : ''));
    }

    performTest(params, testGraph = true) {
        const serviceCode = params["serviceCode"];
        const serviceFolder = params["serviceFolder"];
        const serviceTitle = params["serviceTitle"];
        const dropDownId = params["dropDownId"];
        const dropDownVars = params["dropDownVars"];
        const pointDate = params["pointDate"];
        const clickPoint = params["clickPoint"];
        // false en visores sin CSV de píxel (sri, wind en climatología)
        const testDownload = params["testDownload"] !== false;
        const webPage = VAR_BASE_URL.replace('{code}', serviceCode);
        const self = this;
        let browserName;

        suite((env) => {
            describe('Tests - ' + serviceFolder, function () {
                this.timeout(VAR_TIMEOUT);
                let driver;

                before(async function () {
                    browserName = env.browser.name;
                    self.scrShotFolder = path.resolve(VAR_SCREENSHOT_PATH, browserName);
                    self.downloadFolder = path.resolve(VAR_DOWNLOAD_PATH, browserName);
                    self.emptyFolder(self.scrShotFolder);
                    self.emptyFolder(self.downloadFolder);

                    const ChromeOptions = new Chrome.Options();
                    ChromeOptions.setPageLoadStrategy('normal');
                    ChromeOptions.addArguments("--remote-allow-origins=*");
                    ChromeOptions.addArguments('--force-device-scale-factor=1');
                    ChromeOptions.addArguments('--window-size=' + VAR_WINDOW.width + ',' + VAR_WINDOW.height);
                    ChromeOptions.setUserPreferences({
                        'download.default_directory': self.downloadFolder,
                        'download.prompt_for_download': false
                    });

                    const FirefoxOptions = new Firefox.Options();
                    FirefoxOptions.setPreference('browser.download.folderList', 2);
                    FirefoxOptions.setPreference('browser.download.dir', self.downloadFolder);
                    FirefoxOptions.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv,application/csv,text/plain,application/octet-stream');
                    // Evita el aviso de Firefox al entrar con usuario:contraseña@ en la URL
                    FirefoxOptions.setPreference('network.http.phishy-userpass-length', 255);

                    const EdgeOptions = new Edge.Options();

                    if (VAR_HEADLESS) {
                        ChromeOptions.addArguments('--headless=new');
                        FirefoxOptions.addArguments('-headless');
                        EdgeOptions.addArguments('--headless=new');
                    }

                    driver = await env
                        .builder()
                        .forBrowser(browserName)
                        .setChromeOptions(ChromeOptions)
                        .setEdgeOptions(EdgeOptions)
                        .setFirefoxOptions(FirefoxOptions)
                        .build();

                    await driver.manage().window().setRect(VAR_WINDOW);
                });

                after(async () => { if (driver) await driver.quit(); });

                it(VAR_TEST_1, async () => {
                    await self.openViewer(driver, browserName, webPage);
                    const title = await driver.wait(until.elementLocated(By.id('title')), VAR_LOAD_TIMEOUT);
                    await driver.wait(async () => (await title.getAttribute('textContent')).trim() != '', VAR_LOAD_TIMEOUT, 'La cabecera está vacía');
                    assert.equal(await driver.getTitle(), serviceTitle);
                    for (let e of await driver.findElements(By.id('title'))) {
                        assert.equal((await e.getAttribute('textContent')).trim(), serviceTitle);
                    }
                });

                it(VAR_TEST_2, async () => {
                    await self.openViewer(driver, browserName, webPage);
                    await driver.wait(until.elementLocated(By.id(dropDownId)), VAR_LOAD_TIMEOUT);
                    await self.takeScreenshot(driver, "t2");
                    let vbList = await (await driver.findElement(By.id(dropDownId))).findElements(By.css('.dropdown-item'));
                    let items = [];
                    for (let item of vbList) {
                        items.push((await item.getAttribute('textContent')).trim());
                    }
                    assert.deepEqual(items, dropDownVars);
                });

                it(VAR_TEST_3, async () => {
                    await self.openViewer(driver, browserName, webPage);
                    await self.takeScreenshot(driver, "t3_before_click");
                    await self.selectPoint(driver, pointDate, clickPoint);
                    const latLong = await driver.wait(until.elementLocated(By.css('#latLong span')), VAR_LOAD_TIMEOUT);
                    await driver.wait(until.elementIsVisible(latLong), VAR_LOAD_TIMEOUT, 'No se muestran las coordenadas');
                    await self.takeScreenshot(driver, "t3_after_click");
                    assert.match(await latLong.getText(), /^Lat:-?\d+\.\d+ Long:-?\d+\.\d+$/);
                });

                if (testDownload) it(VAR_TEST_4, async () => {
                    self.emptyFolder(self.downloadFolder);
                    await self.openViewer(driver, browserName, webPage);
                    await self.takeScreenshot(driver, "t4_before_click");
                    await self.selectPoint(driver, pointDate, clickPoint);
                    const btn = await driver.wait(until.elementLocated(By.css('[role="dropPointBtn"]')), VAR_LOAD_TIMEOUT);
                    await driver.wait(until.elementIsVisible(btn), VAR_LOAD_TIMEOUT, 'No aparece el botón de descarga del píxel');
                    await btn.click();
                    await driver.wait(() => self.downloadedFiles().length > 0, VAR_LOAD_TIMEOUT, 'No se ha descargado el CSV');
                    assert.equal(self.downloadedFiles().length, 1);
                    await self.takeScreenshot(driver, "t4_after_click");
                });

                if (testGraph) {
                    it(VAR_TEST_5, async () => {
                        await self.openViewer(driver, browserName, webPage);
                        await self.takeScreenshot(driver, "t5_before_click");
                        await self.selectPoint(driver, pointDate, clickPoint);
                        const popGraph = await driver.wait(until.elementLocated(By.id("popGraph")), VAR_LOAD_TIMEOUT);
                        await driver.wait(until.elementIsVisible(popGraph), VAR_LOAD_TIMEOUT, 'No se muestra el gráfico');
                        await self.takeScreenshot(driver, "t5_after_click");
                    });
                }
            });
        }, { browsers: [Browser.CHROME, Browser.FIREFOX/* , Browser.EDGE */] });

        this.performDataTest(params);
    }

    // Tests 6 y 7: solo peticiones HTTP a los ficheros del visor, sin navegador
    //   emptyAllowed  expresiones regulares de índices cuyo mapa puede estar vacío (todo NaN), p. ej. eventos
    //   updateVars    expresiones regulares de los índices que se actualizan; si no se da, no se ejecuta el test 7
    //   maxAgeDays    días máximos desde la última fecha de esos índices; si no se da, la última
    //                 fecha tiene que ser como mínimo el día 1 del mes anterior
    //   dataSample    índices de cada familia que se comprueban en el test 6 (ver sampleVars);
    //                 si no se da, se comprueban todos
    performDataTest(params) {
        const serviceFolder = params["serviceFolder"];
        // Node resuelve localhost a IPv6 y el servidor de desarrollo solo escucha en IPv4
        const webPage = VAR_BASE_URL.replace('{code}', params["serviceCode"]).replace('//localhost', '//127.0.0.1');
        const emptyAllowed = params["emptyAllowed"] || [];
        const updateVars = params["updateVars"];
        const maxAgeDays = params["maxAgeDays"];
        const dataSample = params["dataSample"];
        const matches = (list, varId) => list.some(re => new RegExp(re).test(varId));

        describe('Datos - ' + serviceFolder, function () {
            this.timeout(10 * VAR_TIMEOUT);
            let timesJs;

            before(async function () {
                timesJs = JSON.parse((await httpGet(webPage + 'times.json')).toString());
            });

            it(VAR_TEST_6, async () => {
                const errors = [];
                const allVars = Object.keys(timesJs.times);
                for (const varId of dataSample ? sampleVars(allVars, dataSample) : allVars) {
                    const times = timesJs.times[varId];
                    const n = Array.isArray(times) ? times.length : 1;
                    let finite = 0;
                    for (const portion of timesJs.portions[varId] || ['']) {
                        try {
                            const last = await downloadXYMap(webPage, timesJs, varId, portion, n - 1);
                            const first = await downloadXYMap(webPage, timesJs, varId, portion, 0);
                            if (last.length != first.length) {
                                errors.push(varId + portion + ': el mapa del ' + lastDate(times) + ' tiene ' + last.length + ' valores y el primero ' + first.length);
                            }
                            finite += last.filter(Number.isFinite).length;
                        } catch (e) {
                            errors.push(varId + portion + ': ' + e.message);
                        }
                    }
                    if (finite == 0 && !matches(emptyAllowed, varId)) {
                        errors.push(varId + ': el mapa del ' + lastDate(times) + ' no tiene ningún valor');
                    }
                }
                assert.deepEqual(errors, []);
            });

            if (updateVars) {
                it(VAR_TEST_7, async () => {
                    const now = new Date();
                    const limit = maxAgeDays
                        ? new Date(now.getTime() - maxAgeDays * 86400000)
                        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
                    const errors = [];
                    const vars = Object.keys(timesJs.times).filter(v => matches(updateVars, v));
                    assert.ok(vars.length > 0, 'Ningún índice coincide con updateVars');
                    for (const varId of vars) {
                        const last = lastDate(timesJs.times[varId]);
                        if (new Date(last) < limit) {
                            errors.push(varId + ': última fecha ' + last + ', anterior al ' + limit.toISOString().slice(0, 10));
                        }
                    }
                    assert.deepEqual(errors, []);
                });
            }
        });
    }
}

module.exports = csTest;
