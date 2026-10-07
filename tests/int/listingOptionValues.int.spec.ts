import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAvailableSkus, toId } from "@/lib/optionValueRule";
import config from "@/payload.config";
import type { ProductListing } from "@/payload-types";

let payload: Payload;

// Unique suffix so test records never collide with seeded data
const suffix = `test-${Date.now()}`;

let clientId: number;
let organizationId: number;
let locationId: number;
let productId: number;
let otherProductId: number;
let listingId: number;
const optionIds: number[] = [];
const valueIds: Record<string, number> = {};
const skuIds: Record<string, number> = {};

describe("Product listing option value rules", () => {
	beforeAll(async () => {
		const payloadConfig = await config;
		payload = await getPayload({ config: payloadConfig });

		const client = await payload.create({
			collection: "clients",
			data: {
				handle: `client-${suffix}`,
				title: "Test Client",
				status: "active",
				legal_name: "Test Client Inc.",
				legal_address: "1 Test St",
			},
		});
		clientId = client.id;

		const organization = await payload.create({
			collection: "organizations",
			data: {
				handle: `org-${suffix}`,
				title: "Test Organization",
				status: "active",
				client: clientId,
			},
		});
		organizationId = organization.id;

		const location = await payload.create({
			collection: "locations",
			data: {
				title: `Test Location ${suffix}`,
				status: "active",
				organization: organizationId,
				address: "2 Test St",
			},
		});
		locationId = location.id;

		const createProduct = async (handle: string) =>
			(
				await payload.create({
					collection: "products",
					data: { handle, title: handle, status: "active", attributes: {} },
				})
			).id;
		productId = await createProduct(`product-${suffix}`);
		otherProductId = await createProduct(`other-product-${suffix}`);

		const createOption = async (forProductId: number, name: string) => {
			const option = await payload.create({
				collection: "productOptions",
				data: {
					handle: `${name}-${forProductId}-${suffix}`,
					title: name,
					status: "active",
					product: forProductId,
				},
			});
			optionIds.push(option.id);
			return option.id;
		};
		const createValue = async (optionId: number, name: string) => {
			const value = await payload.create({
				collection: "productOptionValues",
				data: {
					handle: `${name}-${optionId}-${suffix}`,
					title: name,
					status: "active",
					productOption: optionId,
				},
			});
			valueIds[name] = value.id;
		};

		const sizeId = await createOption(productId, "size");
		const colourId = await createOption(productId, "colour");
		await createValue(sizeId, "small");
		await createValue(sizeId, "large");
		await createValue(colourId, "red");
		await createValue(colourId, "black");

		const otherOptionId = await createOption(otherProductId, "fit");
		await createValue(otherOptionId, "other-value");

		for (const size of ["small", "large"]) {
			for (const colour of ["red", "black"]) {
				const sku = await payload.create({
					collection: "skus",
					data: {
						product: productId,
						productOptionValues: [valueIds[size], valueIds[colour]],
					},
				});
				skuIds[`${size}-${colour}`] = sku.id;
			}
		}

		const listing = await payload.create({
			collection: "productListings",
			data: {
				product: productId,
				location: locationId,
				status: "active",
				optionValueRule: "all",
			},
		});
		listingId = listing.id;
	});

	afterAll(async () => {
		const productIds = [productId, otherProductId];
		await payload.delete({
			collection: "productListings",
			where: { product: { in: productIds } },
		});
		await payload.delete({
			collection: "skus",
			where: { product: { in: productIds } },
		});
		await payload.delete({
			collection: "productOptionValues",
			where: { productOption: { in: optionIds } },
		});
		await payload.delete({
			collection: "productOptions",
			where: { id: { in: optionIds } },
		});
		await payload.delete({
			collection: "products",
			where: { id: { in: productIds } },
		});
		await payload.delete({ collection: "locations", id: locationId });
		await payload.delete({ collection: "organizations", id: organizationId });
		await payload.delete({ collection: "clients", id: clientId });
	});

	const updateListing = (data: {
		optionValueRule: ProductListing["optionValueRule"];
		optionValues?: number[];
	}) =>
		payload.update({
			collection: "productListings",
			id: listingId,
			data,
			depth: 0,
		});

	const expectOptionValuesError = (
		promise: Promise<unknown>,
		message: string,
	) =>
		expect(promise).rejects.toMatchObject({
			data: { errors: [{ path: "optionValues", message }] },
		});

	const availableSkuIds = async () =>
		(await getAvailableSkus(payload, listingId)).map((sku) => sku.id).sort();

	it('offers every SKU with "all"', async () => {
		expect(await availableSkuIds()).toEqual(Object.values(skuIds).sort());
	});

	it('removes SKUs containing an excluded value with "except"', async () => {
		await updateListing({
			optionValueRule: "except",
			optionValues: [valueIds.large],
		});

		expect(await availableSkuIds()).toEqual(
			[skuIds["small-red"], skuIds["small-black"]].sort(),
		);
	});

	it('restricts only the options with listed values under "only"', async () => {
		await updateListing({
			optionValueRule: "only",
			optionValues: [valueIds.red],
		});

		// Colour is restricted to red; size has no listed values so stays open
		expect(await availableSkuIds()).toEqual(
			[skuIds["small-red"], skuIds["large-red"]].sort(),
		);
	});

	it('combines restrictions across options under "only"', async () => {
		await updateListing({
			optionValueRule: "only",
			optionValues: [valueIds.small, valueIds.red],
		});

		expect(await availableSkuIds()).toEqual([skuIds["small-red"]]);
	});

	it('clears the list when switching back to "all"', async () => {
		const listing = await updateListing({ optionValueRule: "all" });

		expect(listing.optionValues).toEqual([]);
		expect(await availableSkuIds()).toEqual(Object.values(skuIds).sort());
	});

	it('rejects "only" with no values', async () => {
		await expectOptionValuesError(
			updateListing({ optionValueRule: "only", optionValues: [] }),
			'Select at least one value when using "Only these values"',
		);
	});

	it("rejects values belonging to another product", async () => {
		await expectOptionValuesError(
			updateListing({
				optionValueRule: "except",
				optionValues: [valueIds["other-value"]],
			}),
			"All option values must belong to this listing's product",
		);
	});

	it('rejects "except" that leaves an option with no available values', async () => {
		await expectOptionValuesError(
			updateListing({
				optionValueRule: "except",
				optionValues: [valueIds.red, valueIds.black],
			}),
			"Every product option must keep at least one available value",
		);
	});

	it("leaves the listing unchanged after a rejected update", async () => {
		const listing = await payload.findByID({
			collection: "productListings",
			id: listingId,
			depth: 0,
		});

		expect(listing.optionValueRule).toBe("all");
		expect((listing.optionValues ?? []).map(toId)).toEqual([]);
	});
});
