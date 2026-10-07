import { expect, test } from "@playwright/test";
import { type ShopFixture, seedShopFixture } from "../helpers/seedShop";

test.describe("Shop configurator", () => {
	let fixture: ShopFixture;

	test.beforeAll(async () => {
		fixture = await seedShopFixture();
	});

	test.afterAll(async () => {
		await fixture?.cleanup();
	});

	test("finds the product through the store pages", async ({ page }) => {
		await page.goto("http://localhost:3000/shop");
		await page.getByRole("link", { name: /Shop Test Store/ }).click();
		await page.getByRole("link", { name: "Shop Test Tee" }).click();

		await expect(page).toHaveURL(
			`http://localhost:3000/shop/locations/${fixture.locationId}/products/${fixture.productHandle}`,
		);
		await expect(page.locator("h1")).toHaveText("Shop Test Tee");
	});

	test("only offers values available at the store", async ({ page }) => {
		await page.goto(
			`http://localhost:3000/shop/locations/${fixture.locationId}/products/${fixture.productHandle}`,
		);

		for (const name of ["Small", "Large", "Red", "Black"]) {
			await expect(page.getByRole("radio", { name })).toBeEnabled();
		}
		await expect(page.getByRole("radio", { name: "Medium" })).toHaveCount(0);
		await expect(page.getByRole("radio", { name: "XL" })).toHaveCount(0);
	});

	test("resolves a selection to a SKU", async ({ page }) => {
		await page.goto(
			`http://localhost:3000/shop/locations/${fixture.locationId}/products/${fixture.productHandle}`,
		);
		const summary = page.locator("output");
		await expect(summary).toHaveText("Choose Size, Colour");

		await page.getByRole("radio", { name: "Small" }).check();
		await page.getByRole("radio", { name: "Red" }).check();
		await expect(summary).toContainText("Small / Red");
		await expect(summary).toContainText(`SKU #${fixture.skuIds["Small/Red"]}`);

		// There's no Large/Red SKU: Large is marked as conflicting but stays
		// clickable, and picking it clears Red
		const large = page.locator("label", { hasText: "Large" });
		await expect(large).toHaveClass(/is-unavailable/);
		await page.getByRole("radio", { name: "Large" }).check();
		await expect(summary).toHaveText("Choose Colour");
		await expect(page.locator("label", { hasText: "Red" })).toHaveClass(
			/is-unavailable/,
		);
		await expect(large).not.toHaveClass(/is-unavailable/);

		await page.getByRole("radio", { name: "Black" }).check();
		await expect(summary).toContainText(
			`Large / Black · SKU #${fixture.skuIds["Large/Black"]}`,
		);

		await page.getByRole("button", { name: "Clear selection" }).click();
		await expect(summary).toHaveText("Choose Size, Colour");
	});

	test("returns 404 for a product not sold at the store", async ({ page }) => {
		const response = await page.goto(
			`http://localhost:3000/shop/locations/${fixture.locationId}/products/does-not-exist`,
		);

		expect(response?.status()).toBe(404);
	});
});
