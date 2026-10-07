import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type ConfiguratorOption,
	type ConfiguratorSku,
	findSelectedSku,
	getSelectableValueIds,
	selectValue,
} from "@/lib/configurator";
import { getConfiguratorData, getLocationProducts } from "@/lib/shop";
import config from "@/payload.config";
import { type ShopFixture, seedShopFixture } from "../helpers/seedShop";

describe("Configurator logic", () => {
	// Size: S(1) L(2), Colour: Red(3) Black(4); no Large/Red SKU
	const options: ConfiguratorOption[] = [
		{
			id: 10,
			title: "Size",
			values: [
				{ id: 1, title: "Small" },
				{ id: 2, title: "Large" },
			],
		},
		{
			id: 20,
			title: "Colour",
			values: [
				{ id: 3, title: "Red" },
				{ id: 4, title: "Black" },
			],
		},
	];
	const skus: ConfiguratorSku[] = [
		{ id: 100, valueIds: [1, 3] },
		{ id: 101, valueIds: [1, 4] },
		{ id: 102, valueIds: [2, 4] },
	];
	const [size, colour] = options;

	it("allows every value that appears in a SKU when nothing is selected", () => {
		expect(getSelectableValueIds(size, skus, {})).toEqual(new Set([1, 2]));
		expect(getSelectableValueIds(colour, skus, {})).toEqual(new Set([3, 4]));
	});

	it("disables values with no SKU for the current selection", () => {
		expect(getSelectableValueIds(colour, skus, { 10: 2 })).toEqual(
			new Set([4]),
		);
	});

	it("ignores an option's own selection when computing its choices", () => {
		expect(getSelectableValueIds(size, skus, { 10: 2 })).toEqual(
			new Set([1, 2]),
		);
	});

	it("drops other selections that no longer lead to a SKU", () => {
		const selection = selectValue(options, skus, { 10: 1, 20: 3 }, 10, 2);

		expect(selection).toEqual({ 10: 2 });
	});

	it("resolves the SKU only once every option has a value", () => {
		expect(findSelectedSku(options, skus, { 10: 2 })).toBeUndefined();
		expect(findSelectedSku(options, skus, { 10: 2, 20: 4 })?.id).toBe(102);
	});
});

describe("Shop data loading", () => {
	let payload: Payload;
	let fixture: ShopFixture;

	beforeAll(async () => {
		payload = await getPayload({ config: await config });
		fixture = await seedShopFixture();
	});

	afterAll(async () => {
		await fixture?.cleanup();
	});

	it("narrows options and SKUs to what the listing offers", async () => {
		const data = await getConfiguratorData(
			payload,
			fixture.locationId,
			fixture.productHandle,
		);

		// Medium is excluded by the listing, XL is archived
		expect(
			data?.options.map((option) => [
				option.title,
				option.values.map((value) => value.title),
			]),
		).toEqual([
			["Size", ["Small", "Large"]],
			["Colour", ["Red", "Black"]],
		]);
		expect(data?.skus.map((sku) => sku.id).sort()).toEqual(
			[
				fixture.skuIds["Small/Red"],
				fixture.skuIds["Small/Black"],
				fixture.skuIds["Large/Black"],
			].sort(),
		);
	});

	it("lists the product at its location", async () => {
		const products = await getLocationProducts(payload, fixture.locationId);

		expect(products.map((product) => product.handle)).toEqual([
			fixture.productHandle,
		]);
	});

	it("hides the product when its listing isn't active", async () => {
		await payload.update({
			collection: "productListings",
			id: fixture.listingId,
			data: { status: "draft" },
		});

		expect(
			await getConfiguratorData(
				payload,
				fixture.locationId,
				fixture.productHandle,
			),
		).toBeNull();
		expect(await getLocationProducts(payload, fixture.locationId)).toEqual([]);

		await payload.update({
			collection: "productListings",
			id: fixture.listingId,
			data: { status: "active" },
		});
	});
});
