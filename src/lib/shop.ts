import type { Payload } from "payload";
import type { Client, Location, Organization } from "../payload-types";
import type {
	ConfiguratorOption,
	ConfiguratorSku,
	ConfiguratorValue,
} from "./configurator";
import {
	createOptionValueFilter,
	getOptionIdByValueId,
	toId,
} from "./optionValueRule";

/**
 * Server-side data loading for the shopper UI. Only active records are shown
 * to shoppers, and only plain serialisable data is returned so it can be
 * passed to client components.
 */

export interface ShopLocation {
	id: number;
	title: string;
	address: string;
	clientTitle: string;
}

const toShopLocation = (location: Location): ShopLocation | null => {
	const organization = location.organization as Organization;
	const client = organization.client as Client;
	if (
		location.status !== "active" ||
		organization.status !== "active" ||
		client.status !== "active"
	) {
		return null;
	}
	return {
		id: location.id,
		title: location.title,
		address: location.address,
		clientTitle: client.title,
	};
};

/**
 * Every active location whose organization and client are also active.
 */
export const getShopLocations = async (
	payload: Payload,
): Promise<ShopLocation[]> => {
	const { docs } = await payload.find({
		collection: "locations",
		where: { status: { equals: "active" } },
		depth: 2,
		pagination: false,
		sort: "title",
	});
	return docs
		.map(toShopLocation)
		.filter((location): location is ShopLocation => location !== null);
};

export const getShopLocation = async (
	payload: Payload,
	locationId: number,
): Promise<ShopLocation | null> => {
	const location = await payload.findByID({
		collection: "locations",
		id: locationId,
		depth: 2,
		disableErrors: true,
	});
	return location ? toShopLocation(location) : null;
};

export interface ShopProduct {
	handle: string;
	title: string;
}

/**
 * Active products with an active listing at the location.
 */
export const getLocationProducts = async (
	payload: Payload,
	locationId: number,
): Promise<ShopProduct[]> => {
	const { docs } = await payload.find({
		collection: "productListings",
		where: {
			location: { equals: locationId },
			status: { equals: "active" },
			"product.status": { equals: "active" },
		},
		depth: 1,
		pagination: false,
	});
	return docs
		.map((listing) => listing.product)
		.filter((product) => typeof product === "object")
		.map(({ handle, title }) => ({ handle, title }))
		.sort((a, b) => a.title.localeCompare(b.title));
};

export interface ConfiguratorData {
	product: ShopProduct;
	options: ConfiguratorOption[];
	skus: ConfiguratorSku[];
}

/**
 * Everything the configurator needs for a product at a location, already
 * narrowed to what the location's listing offers. Returns null when the
 * product isn't sold there.
 */
export const getConfiguratorData = async (
	payload: Payload,
	locationId: number,
	productHandle: string,
): Promise<ConfiguratorData | null> => {
	const {
		docs: [product],
	} = await payload.find({
		collection: "products",
		where: {
			handle: { equals: productHandle },
			status: { equals: "active" },
		},
		depth: 0,
		limit: 1,
	});
	if (!product) return null;

	const {
		docs: [listing],
	} = await payload.find({
		collection: "productListings",
		where: {
			product: { equals: product.id },
			location: { equals: locationId },
			status: { equals: "active" },
		},
		depth: 0,
		limit: 1,
	});
	if (!listing) return null;

	const [
		{ docs: options },
		{ docs: values },
		{ docs: skus },
		optionIdByValueId,
	] = await Promise.all([
		payload.find({
			collection: "productOptions",
			where: {
				product: { equals: product.id },
				status: { equals: "active" },
			},
			depth: 0,
			pagination: false,
			sort: "id",
		}),
		payload.find({
			collection: "productOptionValues",
			where: {
				"productOption.product": { equals: product.id },
				status: { equals: "active" },
			},
			depth: 0,
			pagination: false,
			sort: "id",
		}),
		payload.find({
			collection: "skus",
			where: { product: { equals: product.id } },
			depth: 0,
			pagination: false,
			sort: "id",
		}),
		// All values, including inactive ones, so the listing rule is
		// interpreted exactly as it was validated
		getOptionIdByValueId(payload, product.id),
	]);

	const isOffered = createOptionValueFilter(listing, optionIdByValueId);
	const activeOptionIds = new Set(options.map((option) => option.id));
	const offeredValues = values.filter(
		(value) =>
			activeOptionIds.has(toId(value.productOption)) && isOffered(value.id),
	);
	const offeredValueIds = new Set(offeredValues.map((value) => value.id));

	// A SKU is buyable when all its values are offered and it has exactly one
	// value for every active option
	const availableSkus: ConfiguratorSku[] = skus
		.map((sku) => ({
			id: sku.id,
			valueIds: (sku.productOptionValues ?? []).map(toId),
		}))
		.filter(
			({ valueIds }) =>
				valueIds.length === activeOptionIds.size &&
				valueIds.every((valueId) => offeredValueIds.has(valueId)) &&
				new Set(valueIds.map((valueId) => optionIdByValueId.get(valueId)))
					.size === activeOptionIds.size,
		);

	// Hide values that don't appear in any buyable SKU
	const valuesInSkus = new Set(availableSkus.flatMap((sku) => sku.valueIds));
	const configuratorOptions: ConfiguratorOption[] = options.map((option) => ({
		id: option.id,
		title: option.title,
		values: offeredValues
			.filter(
				(value) =>
					toId(value.productOption) === option.id && valuesInSkus.has(value.id),
			)
			.map(
				(value): ConfiguratorValue => ({ id: value.id, title: value.title }),
			),
	}));

	return {
		product: { handle: product.handle, title: product.title },
		options: configuratorOptions,
		skus: availableSkus,
	};
};
