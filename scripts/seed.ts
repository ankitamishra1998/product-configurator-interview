import { getPayload } from "payload";
import config from "../src/payload.config.js";
import "dotenv/config";

/**
 * Seed data below mirrors the sample records in example.db (clients,
 * organizations, locations, products, productOptions, productOptionValues,
 * skus). Users and media are intentionally omitted — see the seed plan for
 * why.
 */

const clientsData = [
	{
		handle: "maple-birch",
		title: "Maple & Birch",
		status: "active",
		legal_name: "Maple & Birch Trading Co.",
		legal_address: "123 Maple Ave, Birch, ON, Canada",
	},
	{
		handle: "harbor",
		title: "Harbour St Outfitters",
		status: "active",
		legal_name: "Harbour Street Outfitters Inc.",
		legal_address: "111 Harbour St, Townsville, BC, Canada",
	},
] as const;

const organizationsData = [
	{
		handle: "maple-birch-ca",
		title: "Maple & Birch - Canada Wide",
		status: "active",
		clientHandle: "maple-birch",
	},
	{
		handle: "harbour-st-west",
		title: "Harbour St - Canada West",
		status: "active",
		clientHandle: "harbor",
	},
	{
		handle: "harbour-st-east",
		title: "Harbour St - Canada East",
		status: "active",
		clientHandle: "harbor",
	},
] as const;

const locationsData = [
	{
		title: "Maple & Birch - Flagship Store",
		status: "active",
		organizationHandle: "maple-birch-ca",
		address: "123 Maple St, Birch, ON, Canada",
	},
	{
		title: "Maple & Birch - Outlet Store 1",
		status: "active",
		organizationHandle: "maple-birch-ca",
		address: "312 Outlet Dr, Vaughan, ON, Canada",
	},
	{
		title: "Harbour St - Vancouver Mall",
		status: "active",
		organizationHandle: "harbour-st-west",
		address: "2 Mall St, Vancouver, BC, Canada",
	},
	{
		title: "Harbour St - Outlet Store",
		status: "active",
		organizationHandle: "harbour-st-east",
		address: "312 Outlet Dr, Vaughan, ON, Canada",
	},
] as const;

const productsData = [
	{
		handle: "moose-tshirt",
		title: "Moose T-Shirt",
		status: "active",
		attributes: {},
	},
] as const;

const productOptionsData = [
	{
		handle: "moose-tshirt-colour",
		title: "Colour",
		status: "active",
		productHandle: "moose-tshirt",
	},
	{
		handle: "moose-tshirt-style",
		title: "Style",
		status: "active",
		productHandle: "moose-tshirt",
	},
	{
		handle: "moose-tshirt-size",
		title: "Size",
		status: "active",
		productHandle: "moose-tshirt",
	},
] as const;

const productOptionValuesData = [
	{
		handle: "moose-tshirt-size-s",
		title: "Small",
		status: "active",
		optionHandle: "moose-tshirt-size",
	},
	{
		handle: "moose-tshirt-size-m",
		title: "Medium",
		status: "active",
		optionHandle: "moose-tshirt-size",
	},
	{
		handle: "moose-tshirt-size-l",
		title: "Large",
		status: "active",
		optionHandle: "moose-tshirt-size",
	},
	{
		handle: "moose-tshirt-style-flat",
		title: "Flat",
		status: "active",
		optionHandle: "moose-tshirt-style",
	},
	{
		handle: "moose-tshirt-colour-black",
		title: "Black",
		status: "active",
		optionHandle: "moose-tshirt-colour",
	},
	{
		handle: "moose-tshirt-colour-red",
		title: "Red",
		status: "active",
		optionHandle: "moose-tshirt-colour",
	},
	{
		handle: "moose-tshirt-style-babydoll",
		title: "Babydoll",
		status: "active",
		optionHandle: "moose-tshirt-style",
	},
] as const;

const skusData = [
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-s",
			"moose-tshirt-style-flat",
			"moose-tshirt-colour-black",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-m",
			"moose-tshirt-style-flat",
			"moose-tshirt-colour-black",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-l",
			"moose-tshirt-style-flat",
			"moose-tshirt-colour-black",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-s",
			"moose-tshirt-style-flat",
			"moose-tshirt-colour-red",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-m",
			"moose-tshirt-style-flat",
			"moose-tshirt-colour-red",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-l",
			"moose-tshirt-style-flat",
			"moose-tshirt-colour-red",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-s",
			"moose-tshirt-style-babydoll",
			"moose-tshirt-colour-black",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-m",
			"moose-tshirt-style-babydoll",
			"moose-tshirt-colour-black",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-l",
			"moose-tshirt-style-babydoll",
			"moose-tshirt-colour-black",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-s",
			"moose-tshirt-style-babydoll",
			"moose-tshirt-colour-red",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-m",
			"moose-tshirt-style-babydoll",
			"moose-tshirt-colour-red",
		],
	},
	{
		productHandle: "moose-tshirt",
		optionValueHandles: [
			"moose-tshirt-size-l",
			"moose-tshirt-style-babydoll",
			"moose-tshirt-colour-red",
		],
	},
] as const;

// Locations have no handle, so listings reference them by title.
const productListingsData = [
	{
		productHandle: "moose-tshirt",
		locationTitle: "Maple & Birch - Flagship Store",
		status: "active",
	},
	{
		productHandle: "moose-tshirt",
		locationTitle: "Maple & Birch - Outlet Store 1",
		status: "active",
	},
	{
		productHandle: "moose-tshirt",
		locationTitle: "Harbour St - Vancouver Mall",
		status: "active",
	},
] as const;

async function seed(): Promise<void> {
	const payload = await getPayload({ config });

	const summary: Record<string, number> = {};

	// Clients
	const clientIdByHandle = new Map<string, number>();
	for (const client of clientsData) {
		const { handle, title, status, legal_name, legal_address } = client;
		const doc = await payload.create({
			collection: "clients",
			data: { handle, title, status, legal_name, legal_address },
		});
		clientIdByHandle.set(handle, doc.id);
	}
	summary.clients = clientsData.length;

	// Organizations
	const organizationIdByHandle = new Map<string, number>();
	for (const organization of organizationsData) {
		const { handle, title, status, clientHandle } = organization;
		const clientId = clientIdByHandle.get(clientHandle);
		if (!clientId) {
			throw new Error(`Unknown client handle: ${clientHandle}`);
		}
		const doc = await payload.create({
			collection: "organizations",
			data: { handle, title, status, client: clientId },
		});
		organizationIdByHandle.set(handle, doc.id);
	}
	summary.organizations = organizationsData.length;

	// Locations
	const locationIdByTitle = new Map<string, number>();
	for (const location of locationsData) {
		const { title, status, organizationHandle, address } = location;
		const organizationId = organizationIdByHandle.get(organizationHandle);
		if (!organizationId) {
			throw new Error(`Unknown organization handle: ${organizationHandle}`);
		}
		const doc = await payload.create({
			collection: "locations",
			data: { title, status, organization: organizationId, address },
		});
		locationIdByTitle.set(title, doc.id);
	}
	summary.locations = locationsData.length;

	// Products
	const productIdByHandle = new Map<string, number>();
	for (const product of productsData) {
		const { handle, title, status, attributes } = product;
		const doc = await payload.create({
			collection: "products",
			data: { handle, title, status, attributes },
		});
		productIdByHandle.set(handle, doc.id);
	}
	summary.products = productsData.length;

	// Product options
	const productOptionIdByHandle = new Map<string, number>();
	for (const productOption of productOptionsData) {
		const { handle, title, status, productHandle } = productOption;
		const productId = productIdByHandle.get(productHandle);
		if (!productId) {
			throw new Error(`Unknown product handle: ${productHandle}`);
		}
		const doc = await payload.create({
			collection: "productOptions",
			data: { handle, title, status, product: productId },
		});
		productOptionIdByHandle.set(handle, doc.id);
	}
	summary.productOptions = productOptionsData.length;

	// Product option values
	const productOptionValueIdByHandle = new Map<string, number>();
	for (const productOptionValue of productOptionValuesData) {
		const { handle, title, status, optionHandle } = productOptionValue;
		const productOptionId = productOptionIdByHandle.get(optionHandle);
		if (!productOptionId) {
			throw new Error(`Unknown product option handle: ${optionHandle}`);
		}
		const doc = await payload.create({
			collection: "productOptionValues",
			data: { handle, title, status, productOption: productOptionId },
		});
		productOptionValueIdByHandle.set(handle, doc.id);
	}
	summary.productOptionValues = productOptionValuesData.length;

	// SKUs
	for (const sku of skusData) {
		const productId = productIdByHandle.get(sku.productHandle);
		if (!productId) {
			throw new Error(`Unknown product handle: ${sku.productHandle}`);
		}
		const optionValueIds = sku.optionValueHandles.map((handle) => {
			const id = productOptionValueIdByHandle.get(handle);
			if (!id) {
				throw new Error(`Unknown product option value handle: ${handle}`);
			}
			return id;
		});
		await payload.create({
			collection: "skus",
			data: { product: productId, productOptionValues: optionValueIds },
		});
	}
	summary.skus = skusData.length;

	// Product listings
	for (const productListing of productListingsData) {
		const { productHandle, locationTitle, status } = productListing;
		const productId = productIdByHandle.get(productHandle);
		if (!productId) {
			throw new Error(`Unknown product handle: ${productHandle}`);
		}
		const locationId = locationIdByTitle.get(locationTitle);
		if (!locationId) {
			throw new Error(`Unknown location title: ${locationTitle}`);
		}
		await payload.create({
			collection: "productListings",
			data: { product: productId, location: locationId, status },
		});
	}
	summary.productListings = productListingsData.length;

	console.log("Seed complete:");
	for (const [collection, count] of Object.entries(summary)) {
		console.log(`  ${collection}: ${count}`);
	}

	process.exit(0);
}

seed().catch((error) => {
	console.error("Seed failed:", error);
	process.exit(1);
});
