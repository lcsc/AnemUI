const Chrome = require('selenium-webdriver/chrome');
const Firefox = require('selenium-webdriver/firefox');
const Edge = require('selenium-webdriver/edge');
const {suite} = require('selenium-webdriver/testing');
const {By, Browser, until} = require('selenium-webdriver');

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const os = require("os");

const VAR_USR = 'aemet';
const VAR_PWD = 'pticlima';
const VAR_WEB_DOMAIN = "servicios-climaticos.pti-clima.csic.es/";
const VAR_DOWNLOAD_PATH = os.userInfo().homedir + "/Downloads/";
const VAR_SCREENSHOT_PATH = 'test/screenShots/';

const VAR_TEST_1 = 'Test 1 - Se cargan el título y la cabecera correctas';
const VAR_TEST_2 = 'Test 2 - Se cargan las variables correctas';
const VAR_TEST_3 = 'Test 3 - Se muestra el marcador correspondiente al pulsar en el mapa';
const VAR_TEST_4 = 'Test 4 - Se puede descargar un fichero CSV.';
const VAR_TEST_5 = 'Test 5 - Se muestra el gráfico de pixel';

class csTest {

    scrShotFolder;
    
    takeScreenshot(driver,fileName) {
        let scrShotFolder = this.scrShotFolder;
        driver.takeScreenshot().then(
            function (image, err) {
                try {
                    if (!fs.existsSync(scrShotFolder)) {
                        fs.mkdirSync(scrShotFolder, { recursive: true });
                    }
                    fs.writeFile(scrShotFolder + fileName + '.png', image, 'base64', () => { });
                } catch (err) {
                    console.error(err);
                }
            }
        );
    }

    deleteFiles(delFolder) {
        let delFiles = fs.readdirSync(delFolder);
        delFiles.forEach((file) => {
            fs.unlinkSync(path.join(delFolder, file));
        });
    }

    performTest(params, testGraph = true) {
        const serviceCode = params["serviceCode"];
        const serviceFolder = params["serviceFolder"];
        const serviceTitle = params["serviceTitle"];
        const dropDownId = params["dropDownId"];
        const dropDownVars = params["dropDownVars"];
        const self = this;
        let browserName;
        
        suite((env) => {
            describe('Tests - ' + serviceFolder, function () {
                let driver;
                const ChromeOptions = new Chrome.Options();
                const EdgeOptions = new Edge.Options();
                const FirefoxOptions = new Firefox.Options();
                const webPage = VAR_WEB_DOMAIN + serviceCode + "-dev/";

                before(async function () {
                    ChromeOptions.setPageLoadStrategy('normal');
                    ChromeOptions.detachDriver(true);
                    ChromeOptions.addArguments("--remote-allow-origins=*");
                    ChromeOptions.addArguments('--force-device-scale-factor=1');

                    browserName = env.browser.name;

                    driver = await env
                        .builder()
                        .forBrowser(browserName)
                        .setChromeOptions(ChromeOptions)
                        .setEdgeOptions(EdgeOptions)
                        .setFirefoxOptions(FirefoxOptions)
                        .build();

                    await driver.manage().window().setRect({ width: 1000, height: 660 });

                    self.scrShotFolder = VAR_SCREENSHOT_PATH + browserName + '/';

                    if (fs.existsSync(self.scrShotFolder)) {
                        self.deleteFiles(self.scrShotFolder);
                    }
                });

                after(async () => await driver.quit());

                it(VAR_TEST_1, async () => {
                    this.timeout(0);
                    if (browserName == 'chrome') {
                        const connection = await driver.createCDPConnection('page');
                        await driver.register(VAR_USR, VAR_PWD, connection);
                        await driver.get('https://' + webPage);
                    } else {
                        await driver.get('https://' + VAR_USR + ':' + VAR_PWD + '@' + webPage);
                    }
                    driver.wait(until.elementLocated(By.id('title')), 10 * 1000);
                    assert.equal(serviceTitle, await driver.getTitle());
                    let title = await driver.findElements(By.id('title'));
                    for (let e of title) {
                        assert.equal(serviceTitle, await e.getText());
                    }
                });

                it(VAR_TEST_2, async () => {
                    if (browserName == 'chrome') {
                        const connection = await driver.createCDPConnection('page');
                        await driver.register(VAR_USR, VAR_PWD, connection);
                        await driver.get('https://' + webPage);
                    } else {
                        await driver.get('https://' + VAR_USR + ':' + VAR_PWD + '@' + webPage);
                    }

                    self.takeScreenshot(driver, "t2_before_click");
                    await driver.wait(until.elementLocated(By.id(dropDownId)), 10 * 1000);
                    await driver.findElement(By.css('[id="' + dropDownId + '"] [data-bs-toggle="dropdown"]')).click();
                    self.takeScreenshot(driver, "t2_after_click");
                    let vbList = await driver.findElements(By.css('#' + dropDownId + ' .dropdown-item'));
                    let i = 0;
                    for (let item of vbList) {
                        let vb = await item.getAttribute('innerHTML');
                        let vbtrim = vb.trim();
                        assert.equal(dropDownVars[i], vbtrim);
                        i++;
                    }
                });

                it(VAR_TEST_3, async () => {
                    if (browserName == 'chrome') {
                        const connection = await driver.createCDPConnection('page');
                        await driver.register(VAR_USR, VAR_PWD, connection);
                        await driver.get('https://' + webPage);
                    } else {
                        await driver.get('https://' + VAR_USR + ':' + VAR_PWD + '@' + webPage);
                    }
                    await driver.wait(until.elementLocated(By.id('map')), 10 * 1000);

                    let rect = await driver.manage().window().getRect();
                    let rectX = rect.width / 2;
                    let rectY = Math.floor(rect.height / 2);

                    let map = await driver.findElement(By.id('map'));

                    self.takeScreenshot(driver, "t3_before_click");
                    await driver.actions().move({ x: rectX, y: rectY }).click().perform();
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    await driver.wait(until.elementLocated(By.css('#latlong span')), 10 * 1000);
                    assert.ok(await driver.findElement(By.css('#latlong span')).isDisplayed());
                    self.takeScreenshot(driver, "t3_after_click");
                    let latLong = await driver.findElements(By.css('#latlong span'));
                    for (let e of latLong) {
                        let latLongText = await e.getText();
                        assert.equal('Lat:', latLongText.substr(0, 4));
                        assert.equal('Long:', latLongText.substr(10, 5));
                    }
                });

                it(VAR_TEST_4, async () => {
                    self.deleteFiles(VAR_DOWNLOAD_PATH);
                    if (browserName == 'chrome') {
                        const connection = await driver.createCDPConnection('page');
                        await driver.register(VAR_USR, VAR_PWD, connection);
                        await driver.get('https://' + webPage);
                    } else {
                        await driver.get('https://' + VAR_USR + ':' + VAR_PWD + '@' + webPage);
                    }
                    await driver.wait(until.elementLocated(By.id('map')), 10 * 1000);

                    self.takeScreenshot(driver, "t4_before_click");
                    await driver.findElement(By.id("map")).click();
                    driver.wait(until.elementLocated(By.css('[role="dropPoint"] [data-bs-toggle="dropdown"]')), 4 * 1000);
                    await driver.findElement(By.css('[role="dropPoint"] [data-bs-toggle="dropdown"]')).click();
                    driver.wait(until.elementLocated(By.css('[role="dropPoint"] a:nth-of-type(1)')), 4 * 1000);
                    assert.ok(await driver.findElement(By.css('[role="dropPoint"] a:nth-of-type(1)')).isDisplayed());
                    await driver.findElement(By.css('[role="dropPoint"] a:nth-of-type(1)')).click();
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    let files = fs.readdirSync(VAR_DOWNLOAD_PATH);
                    assert.equal(files.length, 1);
                    self.takeScreenshot(driver, "t4_after_click");
                });

                if (testGraph) {
                    it(VAR_TEST_5, async () => {
                        this.timeout(0);
                        if (browserName == 'chrome') {
                            const connection = await driver.createCDPConnection('page');
                            await driver.register(VAR_USR, VAR_PWD, connection);
                            await driver.get('https://' + webPage);
                        } else {
                            await driver.get('https://' + VAR_USR + ':' + VAR_PWD + '@' + webPage);
                        }
                        await driver.wait(until.elementLocated(By.id('map')), 4 * 1000);

                        self.takeScreenshot(driver, "t5_before_click");
                        await driver.findElement(By.id("map")).click();
                        await driver.wait(until.elementLocated(By.css('[role="graph"]')), 4 * 1000);
                        await driver.findElement(By.css('[role="graph"]')).click();
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        driver.wait(until.elementLocated(By.id("popGraph")), 4 * 1000);
                        assert.ok(await driver.findElement(By.id("popGraph")).isDisplayed());
                        self.takeScreenshot(driver, "t5_after_click");
                    });
                }
            });
        }, { browsers: [Browser.CHROME, Browser.FIREFOX/* , Browser.EDGE */] });
    }
}

module.exports = csTest;


