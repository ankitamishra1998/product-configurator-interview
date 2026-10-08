import type { Payload, PayloadRequest } from "payload";

export type OptionValueRule = "all" | "only" | "except";

export type RelationshipValue = number | { id: number };

export interface ListingOptionValueRule {
	optionValueRule: OptionValueRule;
	optionValues?: RelationshipValue[] | null;
}

/**
 * Maps each option value ID to the ID of the option it belongs to.
 */
export type OptionIdByValueId = Map<number, number>;

/**
 * Relationship values may be IDs or populated documents depending on depth.
 */
export const toId = (value: RelationshipValue): number =>
	typeof value === "object" ? value.id : value;

/**
 * Loads every option value of a product, keyed to its option.
 * Create a map of option value IDs to option IDs for a product, which is used to validate
 * and filter option values in listings.
 * Example: value ID → option ID
   1 (Small)    → 3 (Size)
   2 (Medium)   → 3 (Size)
   3 (Large)    → 3 (Size)
   4 (Flat)     → 2 (Style)
   7 (Babydoll) → 2 (Style)
   5 (Black)    → 1 (Colour)
   6 (Red)      → 1 (Colour)
 */
export const getOptionIdByValueId = async (
	payload: Payload,
	productId: number,
	req?: PayloadRequest,
): Promise<OptionIdByValueId> => {
	const { docs } = await payload.find({
		collection: "productOptionValues",
		where: { "productOption.product": { equals: productId } },
		depth: 0,
		pagination: false,
		req,
	});
	return new Map(docs.map((value) => [value.id, toId(value.productOption)]));
};

/**
 * Builds a predicate telling whether an option value is offered under a
 * listing's rule:
 * - "all": every value is offered
 * - "except": every value except the listed ones is offered
 * - "only": applied per option; an option with listed values offers just
 *   those, an option with no listed values is unrestricted
 */
export const createOptionValueFilter = (
	listing: ListingOptionValueRule,
	optionIdByValueId: OptionIdByValueId,
): ((optionValueId: number) => boolean) => {
	const listed = new Set((listing.optionValues ?? []).map(toId));
	const restrictedOptions = new Set(
		[...listed].map((valueId) => optionIdByValueId.get(valueId)),
	);

	switch (listing.optionValueRule) {
		case "all":
			return () => true;
		case "except":
			return (optionValueId) => !listed.has(optionValueId);
		case "only":
			return (optionValueId) =>
				listed.has(optionValueId) ||
				!restrictedOptions.has(optionIdByValueId.get(optionValueId));
	}
};

/**
 * Keeps only the SKUs whose option values are all offered by the listing.
 */
export const filterAvailableSkus = <
	T extends { productOptionValues?: RelationshipValue[] | null },
>(
	listing: ListingOptionValueRule,
	skus: T[],
	optionIdByValueId: OptionIdByValueId,
): T[] => {
	const isAvailable = createOptionValueFilter(listing, optionIdByValueId);
	return skus.filter((sku) =>
		(sku.productOptionValues ?? []).every((value) => isAvailable(toId(value))),
	);
};

/**
 * Loads a listing and returns the SKUs of its product available at its
 * location.
 */
export const getAvailableSkus = async (payload: Payload, listingId: number) => {
	const listing = await payload.findByID({
		collection: "productListings",
		id: listingId,
		depth: 0,
	});
	const productId = toId(listing.product);
	const [{ docs: skus }, optionIdByValueId] = await Promise.all([
		payload.find({
			collection: "skus",
			where: { product: { equals: productId } },
			depth: 0,
			pagination: false,
		}),
		getOptionIdByValueId(payload, productId),
	]);
	return filterAvailableSkus(listing, skus, optionIdByValueId);
};
