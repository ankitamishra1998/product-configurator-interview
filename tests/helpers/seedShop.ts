import { getPayload, type Payload } from "payload";
import config from "../../src/payload.config.js";

/**
 * A store selling a product with:
 * - Size: Small, Medium, Large, XL (archived)
 * - Colour: Red, Black
 * - SKUs for every combination except Large/Red
 * - A listing offering "only" Small and Large sizes (colour unrestricted)
 *
 * So shoppers should see Small/Large and Red/Black, Medium and XL hidden,
 * and Red disabled once Large is picked.
 */
export interface ShopFixture {
	locationId: number;
	productHandle: string;
	listingId: number;
	valueIds: Record<string, number>;
	skuIds: Record<string, number>;
	cleanup: () => Promise<void>;
}

export async function seedShopFixture(): Promise<ShopFixture> {
	const payload: Payload = await getPayload({ config });
	const suffix = `shop-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

	const client = await payload.create({
		collection: "clients",
		data: {
			handle: `client-${suffix}`,
			title: `Shop Test Client ${suffix}`,
			status: "active",
			legal_name: "Shop Test Client Inc.",
			legal_address: "1 Test St",
		},
	});
	const organization = await payload.create({
		collection: "organizations",
		data: {
			handle: `org-${suffix}`,
			title: "Shop Test Organization",
			status: "active",
			client: client.id,
		},
	});
	const location = await payload.create({
		collection: "locations",
		data: {
			title: `Shop Test Store ${suffix}`,
			status: "active",
			organization: organization.id,
			address: "2 Test St",
		},
	});
	const productHandle = `product-${suffix}`;
	const product = await payload.create({
		collection: "products",
		data: {
			handle: productHandle,
			title: "Shop Test Tee",
			status: "active",
			attributes: {},
		},
	});

	const optionIds: number[] = [];
	const createOption = async (title: string) => {
		const option = await payload.create({
			collection: "productOptions",
			data: {
				handle: `${title.toLowerCase()}-${suffix}`,
				title,
				status: "active",
				product: product.id,
			},
		});
		optionIds.push(option.id);
		return option.id;
	};
	const valueIds: Record<string, number> = {};
	const createValue = async (
		optionId: number,
		title: string,
		status: "active" | "archived" = "active",
	) => {
		const value = await payload.create({
			collection: "productOptionValues",
			data: {
				handle: `${title.toLowerCase()}-${suffix}`,
				title,
				status,
				productOption: optionId,
			},
		});
		valueIds[title] = value.id;
	};

	const sizeId = await createOption("Size");
	const colourId = await createOption("Colour");
	await createValue(sizeId, "Small");
	await createValue(sizeId, "Medium");
	await createValue(sizeId, "Large");
	await createValue(sizeId, "XL", "archived");
	await createValue(colourId, "Red");
	await createValue(colourId, "Black");

	const skuIds: Record<string, number> = {};
	for (const size of ["Small", "Medium", "Large", "XL"]) {
		for (const colour of ["Red", "Black"]) {
			if (size === "Large" && colour === "Red") continue;
			const sku = await payload.create({
				collection: "skus",
				data: {
					product: product.id,
					productOptionValues: [valueIds[size], valueIds[colour]],
				},
			});
			skuIds[`${size}/${colour}`] = sku.id;
		}
	}

	const listing = await payload.create({
		collection: "productListings",
		data: {
			product: product.id,
			location: location.id,
			status: "active",
			optionValueRule: "only",
			optionValues: [valueIds.Small, valueIds.Large],
		},
	});

	const cleanup = async () => {
		await payload.delete({
			collection: "productListings",
			where: { product: { equals: product.id } },
		});
		await payload.delete({
			collection: "skus",
			where: { product: { equals: product.id } },
		});
		await payload.delete({
			collection: "productOptionValues",
			where: { productOption: { in: optionIds } },
		});
		await payload.delete({
			collection: "productOptions",
			where: { id: { in: optionIds } },
		});
		await payload.delete({ collection: "products", id: product.id });
		await payload.delete({ collection: "locations", id: location.id });
		await payload.delete({ collection: "organizations", id: organization.id });
		await payload.delete({ collection: "clients", id: client.id });
	};

	return {
		locationId: location.id,
		productHandle,
		listingId: listing.id,
		valueIds,
		skuIds,
		cleanup,
	};
}
