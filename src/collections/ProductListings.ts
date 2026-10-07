import type { CollectionConfig } from "payload";
import { generalStatusField } from "./common";

/**
 * A product being offered at a specific location. The client is not stored
 * here; it is derived through location -> organization -> client so the two
 * can never disagree.
 */
export const ProductListings: CollectionConfig = {
	slug: "productListings",
	labels: {
		plural: "Product Listings",
		singular: "Product Listing",
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
	],
	indexes: [{ fields: ["product", "location"], unique: true }],
};
