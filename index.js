const puppeteer = require("puppeteer");
const axios = require("axios");
const randomUseragent = require("random-useragent");

// Загружаем список бесплатных HTTP прокси
async function getFreeProxies() {
  try {
    const response = await axios.get(
      "https://www.proxy-list.download/api/v1/get?type=http"
    );
    return response.data.split("\r\n").filter(Boolean);
  } catch (error) {
    console.error("Ошибка загрузки прокси:", error.message);
    return [];
  }
}

// Запуск браузера с прокси и случайным User-Agent
async function launchWithProxy(proxy) {
  const userAgent = randomUseragent.getRandom();
  console.log(`🟡 Используем прокси: ${proxy}, UA: ${userAgent}`);

  const browser = await puppeteer.launch({
    headless: false, // Показывает окно браузера, можно поставить true для headless
    args: [
      `--proxy-server=http://${proxy}`,
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const page = await browser.newPage();

  // Очистим cookies и localStorage для имитации "нового" пользователя
  const client = await page.target().createCDPSession();
  await client.send("Network.clearBrowserCookies");
  await client.send("Storage.clearDataForOrigin", {
    origin: "*",
    storageTypes: "all",
  });

  try {
    await page.setUserAgent(userAgent);
    // Перейти на страницу объявления (пример)
    await page.goto(
      "https://www.avito.ru/moskva/avtomobili/bmw_3_seriya_2.0_at_2013_121_000_km_7377748476",
      {
        waitUntil: "networkidle2",
        timeout: 15000,
      }
    );

    const content = await page.content();
    console.log(`🟢 Успешный переход. Ответ: ${content.slice(0, 200)}...`);

    // Ждём кнопку "Показать телефон" и кликаем по ней
    try {
      await page.waitForSelector(
        'button[data-marker="item-phone-button/card"]',
        {
          timeout: 5000,
        }
      );
      await page.click('button[data-marker="item-phone-button/card"]');
      console.log('Нажата кнопка "Показать телефон"');
    } catch (e) {
      console.log("Кнопка не найдена");
    }
  } catch (error) {
    console.error("🔴 Ошибка перехода:", error.message);
  } finally {
    await browser.close();
  }
}

async function testProxy(proxy) {
  try {
    const res = await axios.get("https://httpbin.org/ip", {
      proxy: {
        host: proxy.split(":")[0],
        port: parseInt(proxy.split(":")[1]),
      },
      timeout: 5000,
    });
    console.log(`✅ Прокси рабочий: ${proxy}`);
    return true;
  } catch (err) {
    return false;
  }
}

// Основной запуск
(async () => {
  const proxies = await getFreeProxies();
  if (proxies.length === 0) {
    console.error("Нет доступных прокси.");
    return;
  }

  // Можно ограничить до 5 тестов, чтобы не забанили
  const testCount = 2;
  let tested = 0;
  for (let i = 0; i < proxies.length && tested < testCount; i++) {
    const proxy = proxies[i];
    const isWorking = await testProxy(proxy);
    if (isWorking) {
      await launchWithProxy(proxy);
      tested++;
    }
  }
})();
