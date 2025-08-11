// server.js
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Load environment variables
const urls = process.env.TARGET_URLS?.split(',').map(u => u.trim()) || [];
const intervalSeconds = parseInt(process.env.INTERVAL_SECONDS || '900', 10); // default: 15 minutes
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!urls.length) {
  process.exit(1);
}

const targetTimes = [
  '8:00', '8:15', '8:30', '8:45',
  '9:00', '9:15', '9:30'
];

// Send Telegram notification
async function notifyTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram API error:", data);
    }
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

// Check one page
async function checkPage(browser, url) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const text = await page.evaluate(() => document.body.innerText);
    const foundTimes = targetTimes.filter(t => text.includes(t));

    if (foundTimes.length > 0) {
      await notifyTelegram(`🚀 Showtimes available for:\n${url}\nTimes: ${foundTimes.join(', ')}`);
    } else {
      await notifyTelegram(`❌ No FDFS times yet for ${url}`);
    }
  } catch (e) {
    console.error(`Error checking ${url}`, e);
  } finally {
    await page.close();
  }
}

// Main loop
(async () => {
 const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '', // Auto-detects in Render
  headless: 'new' // Use new Headless mode
});

  await notifyTelegram("✅ Ticket monitor started — Telegram bot is working!");

  setInterval(async () => {
    for (const url of urls) {
      await checkPage(browser, url);
    }
  }, intervalSeconds * 1000);
})();
