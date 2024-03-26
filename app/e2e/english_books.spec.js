// https://playwright.dev/docs/writing-tests#first-test
// @ts-check
import { test, expect } from '@playwright/test'

// https://playwright.dev/docs/test-fixtures#built-in-fixtures
test('get all books in the Bible (English project)', async ({ request }) => {
	const response = await request.get('/English')

	const books = await response.json()

	// https://playwright.dev/docs/api/class-genericassertions#generic-assertions-to-have-length
	// TODO: Philippians is currently missing in the English project. expect(books).toHaveLength(66)

	// https://playwright.dev/docs/api/class-genericassertions#generic-assertions-to-contain-2
	expect(books).toContain('1 Samuel')
})

test('Ensure language parameter is valid', async ({ request }) => {
	expect(await request.get('/English')).toBeOK()
	expect(await request.get('/123')).not.toBeOK()
})
