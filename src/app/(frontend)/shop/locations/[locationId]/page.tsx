import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { getLocationProducts, getShopLocation } from "@/lib/shop";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

export default async function LocationPage(props: {
	params: Promise<{ locationId: string }>;
}) {
	const { locationId } = await props.params;
	const id = Number(locationId);
	if (!Number.isInteger(id)) notFound();

	const payload = await getPayload({ config: await config });
	const location = await getShopLocation(payload, id);
	if (!location) notFound();

	const products = await getLocationProducts(payload, id);

	return (
		<>
			<p className="shop-muted">{location.clientTitle}</p>
			<h1>{location.title}</h1>
			<p className="shop-muted">{location.address}</p>
			{products.length === 0 && <p>No products are available here yet.</p>}
			<ul className="shop-list">
				{products.map((product) => (
					<li key={product.handle}>
						<Link href={`/shop/locations/${id}/products/${product.handle}`}>
							{product.title}
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}
