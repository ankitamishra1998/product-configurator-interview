import { getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import config from "@/payload.config";

let payload: Payload;

// Unique suffix so test records never collide with seeded data
const suffix = `test-${Date.now()}`;

const ids = {
	client: 0,
	organization: 0,
	location: 0,
	product: 0,
	listing: 0,
};

describe("Product listings", () => {
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
		ids.client = client.id;

		const organization = await payload.create({
			collection: "organizations",
			data: {
				handle: `org-${suffix}`,
				title: "Test Organization",
				status: "active",
				client: client.id,
			},
		});
		ids.organization = organization.id;

		const location = await payload.create({
			collection: "locations",
			data: {
				title: `Test Location ${suffix}`,
				status: "active",
				organization: organization.id,
				address: "2 Test St",
			},
		});
		ids.location = location.id;

		const product = await payload.create({
			collection: "products",
			data: {
				handle: `product-${suffix}`,
				title: "Test Product",
				status: "active",
				attributes: {},
			},
		});
		ids.product = product.id;
	});

	afterAll(async () => {
		await payload.delete({
			collection: "productListings",
			where: { product: { equals: ids.product } },
		});
		await payload.delete({ collection: "products", id: ids.product });
		await payload.delete({ collection: "locations", id: ids.location });
		await payload.delete({ collection: "organizations", id: ids.organization });
		await payload.delete({ collection: "clients", id: ids.client });
	});

	it("creates a listing linking a product to a location", async () => {
		const listing = await payload.create({
			collection: "productListings",
			data: { product: ids.product, location: ids.location, status: "active" },
		});
		ids.listing = listing.id;

		expect(listing.status).toBe("active");
	});

	it("rejects a duplicate product + location listing", async () => {
		await expect(
			payload.create({
				collection: "productListings",
				data: {
					product: ids.product,
					location: ids.location,
					status: "active",
				},
			}),
		).rejects.toThrow();
	});

	it("exposes listings through the product and location join fields", async () => {
		const product = await payload.findByID({
			collection: "products",
			id: ids.product,
			depth: 0,
		});
		const location = await payload.findByID({
			collection: "locations",
			id: ids.location,
			depth: 0,
		});

		expect(product.listings?.docs).toEqual([ids.listing]);
		expect(location.listings?.docs).toEqual([ids.listing]);
	});

	it("finds a client's listings through location -> organization -> client", async () => {
		const result = await payload.find({
			collection: "productListings",
			where: { "location.organization.client": { equals: ids.client } },
			depth: 0,
		});

		expect(result.docs.map((doc) => doc.id)).toEqual([ids.listing]);
	});
});
