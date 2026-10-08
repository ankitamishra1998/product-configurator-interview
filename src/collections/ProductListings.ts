import type { CollectionConfig } from "payload";
import {
	createOptionValueFilter,
	getOptionIdByValueId,
	type RelationshipValue,
	toId,
} from "../lib/optionValueRule";
import type { ProductListing } from "../payload-types";
import { generalStatusField } from "./common";

/**
 * A product being offered at a specific location. The client is not stored
 * here; it is derived through location -> organization -> client so the two
 * can never disagree.
 *
 * Which product option values are offered is controlled by a single list plus
 * a rule describing how to read it ("all", "only" or "except"), so allow and
 * exclude lists can never conflict. "only" applies per option: options with
 * no listed values stay unrestricted.
 */
export const ProductListings: CollectionConfig = {
	slug: "productListings",
	labels: {
		plural: "Product Listings",
		singular: "Product Listing",
	},
	hooks: {
		beforeChange: [
			({ data, originalDoc }) => {
				// The list is meaningless when everything is available
				const rule = data.optionValueRule ?? originalDoc?.optionValueRule;
				if (rule === "all") {
					data.optionValues = [];
				}
				return data;
			},
		],
	},
	fields: [
		{
			name: "product",
			type: "relationship",
			relationTo: "products",
			hasMany: false,
			required: true,
		},
		{
			name: "location",
			type: "relationship",
			relationTo: "locations",
			hasMany: false,
			required: true,
		},
		generalStatusField,
		{
			name: "optionValueRule",
			label: "Available Option Values",
			type: "select",
			options: [
				{ label: "All values available", value: "all" },
				{ label: "Only these values (per option)", value: "only" },
				{ label: "All except these values", value: "except" },
			],
			defaultValue: "all",
			required: true,
		},
		{
			name: "optionValues",
			type: "relationship",
			relationTo: "productOptionValues",
			hasMany: true,
			admin: {
				// Admin UI: only show this field when the rule is not "all"
				condition: (data) => data?.optionValueRule !== "all",
				description:
					'With "Only these values", options without any selected value stay unrestricted.',
			},
			// Admin UI: only offer values belonging to this listing's product
			filterOptions: ({ data }) =>
				data?.product
					? { "productOption.product": { equals: toId(data.product) } }
					: false,
			validate: async (value, { data, req }) => {
				const listing = data as Partial<ProductListing>;
				const rule = listing.optionValueRule;
				if (!rule || rule === "all" || !listing.product) return true;

				const listedIds = ((value ?? []) as RelationshipValue[]).map(toId);
				if (rule === "only" && listedIds.length === 0) {
					return 'Select at least one value when using "Only these values"';
				}

				// Map of option value IDs to option IDs for this listing's product, used to validate
				// and filter option values in listings.
				const optionIdByValueId = await getOptionIdByValueId(
					req.payload,
					toId(listing.product),
					req,
				);
				if (listedIds.some((id) => !optionIdByValueId.has(id))) {
					return "All option values must belong to this listing's product";
				}

				// Every option needs at least one value left, otherwise nothing
				// can be bought at this location. Only reachable with "except",
				// since "only" leaves options without listed values unrestricted.
				const isAvailable = createOptionValueFilter(
					{ optionValueRule: rule, optionValues: listedIds },
					optionIdByValueId,
				);
				const availableByOption = new Map<number, boolean>();
				for (const [valueId, optionId] of optionIdByValueId) {
					availableByOption.set(
						optionId,
						(availableByOption.get(optionId) ?? false) || isAvailable(valueId),
					);
				}
				if ([...availableByOption.values()].some((available) => !available)) {
					return "Every product option must keep at least one available value";
				}

				return true;
			},
		},
	],
	indexes: [{ fields: ["product", "location"], unique: true }],
};
