import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})

const results = []

async function inspect(viewport, label) {
  const page = await browser.newPage({ viewport })
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${label}-dashboard.png`, fullPage: true })
  const bodyText = await page.locator('body').innerText()

  const dashboardOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  const learnButton = page.getByRole('button', { name: /继续高考 3500/ })
  if (!await learnButton.count()) {
    results.push({ label, bodyText, dashboardOverflow, errors })
    await page.close()
    return
  }
  await learnButton.click()
  await page.getByRole('button', { name: /查看释义/ }).click()
  await page.screenshot({ path: `${label}-study.png`, fullPage: true })
  const studyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  await page.getByRole('button', { name: /没记住/ }).click()
  const totalProgress = await page.locator('.side-summary-top strong').innerText()

  if (viewport.width < 920) {
    await page.getByRole('button', { name: '打开导航' }).click()
  }
  await page.getByRole('button', { name: /生词本/ }).click()
  await page.waitForTimeout(250)
  const hardWordCount = await page.locator('.word-row').count()

  results.push({ label, dashboardOverflow, studyOverflow, hardWordCount, totalProgress, errors })
  await page.close()
}

await inspect({ width: 1440, height: 1000 }, 'desktop')
await inspect({ width: 390, height: 844 }, 'mobile')

await browser.close()
console.log(JSON.stringify(results, null, 2))
