import { expect, test, type Page } from '@playwright/test'

const required = [
  'E2E_USER_ONE_EMAIL', 'E2E_USER_ONE_PASSWORD',
  'E2E_USER_TWO_EMAIL', 'E2E_USER_TWO_PASSWORD',
] as const

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required E2E variable: ${name}`)
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/Email|電子郵件/).fill(email)
  await page.getByLabel(/Password|密碼/).fill(password)
  await page.getByRole('button', { name: /Sign in|登入/ }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('keeps both family members isolated and preserves identity on language change', async ({ browser }) => {
  const uniqueMerchant = `Isolation ${Date.now()}`
  const userOne = await browser.newContext()
  const userTwo = await browser.newContext()

  try {
    const pageOne = await userOne.newPage()
    await signIn(pageOne, process.env.E2E_USER_ONE_EMAIL!, process.env.E2E_USER_ONE_PASSWORD!)
    const totalBefore = await pageOne.getByTestId('total-spending').textContent()
    await pageOne.getByRole('link', { name: /New transaction|新增交易/ }).click()
    await pageOne.getByLabel(/Merchant|商家/).fill(uniqueMerchant)
    await pageOne.getByLabel(/Category|分類/).selectOption('Grocery')
    await pageOne.getByLabel(/Date|日期/).fill(new Date().toISOString().slice(0, 10))
    await pageOne.getByLabel(/Amount|金額/).fill('-12.34')
    await pageOne.getByRole('button', { name: /Save|儲存/ }).click()
    await expect(pageOne.getByText(uniqueMerchant)).toBeVisible()
    const transactionRow = pageOne.getByRole('row').filter({ hasText: uniqueMerchant })
    const editPath = await transactionRow.getByRole('link', { name: /Edit|編輯/ }).getAttribute('href')
    expect(editPath).toMatch(/^\/transactions\/[0-9a-f-]+\/edit$/)
    await pageOne.goto('/dashboard')
    await expect(pageOne.getByTestId('total-spending')).not.toHaveText(totalBefore ?? '')

    const pageTwo = await userTwo.newPage()
    await signIn(pageTwo, process.env.E2E_USER_TWO_EMAIL!, process.env.E2E_USER_TWO_PASSWORD!)
    await pageTwo.goto(`/transactions?q=${encodeURIComponent(uniqueMerchant)}`)
    await expect(pageTwo.getByText(uniqueMerchant)).toHaveCount(0)
    await pageTwo.goto(editPath!)
    await expect(pageTwo.getByText(uniqueMerchant)).toHaveCount(0)
    await expect(pageTwo.getByText(/not.*found|找不到/i)).toBeVisible()
    await pageTwo.getByLabel(/Language|語言/).selectOption('en')
    await pageTwo.getByRole('button', { name: /Save|儲存/ }).click()
    await expect(pageTwo.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(pageTwo.getByText(process.env.E2E_USER_TWO_EMAIL!)).toBeVisible()
  } finally {
    await userOne.close()
    await userTwo.close()
  }
})
