const puppeteer = require("puppeteer");
const randomUseragent = require("random-useragent");

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Показывает окно браузера, можно поставить true для headless
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Очистим cookies и localStorage для имитации "нового" пользователя
  const client = await page.target().createCDPSession();
  await page.setUserAgent(randomUseragent.getRandom());
  await client.send("Network.clearBrowserCookies");
  await client.send("Storage.clearDataForOrigin", {
    origin: "*",
    storageTypes: "all",
  });

  // Перейти на страницу объявления (пример)
  await page.goto(
    "https://www.avito.ru/sankt-peterburg/vakansii/prodavets_konsultant_lakokrasochnye_materialy_7303343633",
    {
      waitUntil: "networkidle2",
      timeout: 15000,
    }
  );

  // Ждём кнопку "Показать телефон" и кликаем по ней
  try {
    await page.waitForSelector('button[data-marker="item-phone-button/card"]', {
      timeout: 5000,
    });
    await page.click('button[data-marker="item-phone-button/card"]');
    console.log('Нажата кнопка "Показать телефон"');
  } catch (e) {
    console.log("Кнопка не найдена");
  }

  await browser.close();
})();
