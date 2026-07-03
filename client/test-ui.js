import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting UI tests...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const errors = [];

  page.on('pageerror', err => {
    console.error('PAGE_ERROR:', err.toString());
    errors.push(err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('CONSOLE_ERROR:', msg.text());
      errors.push(msg.text());
    }
  });

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    console.log('Logging in...');
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 2000));
    console.log('Logged in! Current URL:', page.url());

    const tabs = ['/dashboard', '/pos', '/products', '/reports', '/users', '/settings'];
    for (const tab of tabs) {
      console.log(`Visiting ${tab}...`);
      await page.goto(`http://localhost:5173${tab}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1500));
    }

    if (errors.length === 0) {
      console.log('✅ ALL TESTS PASSED! No console or page errors found.');
    } else {
      console.log(`❌ FOUND ${errors.length} ERRORS.`);
    }

  } catch (err) {
    console.error('Test script crashed:', err);
  } finally {
    await browser.close();
  }
})();
