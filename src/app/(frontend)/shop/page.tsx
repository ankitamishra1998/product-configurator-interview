import Link from "next/link";
import { getPayload } from "payload";
import { getShopLocations, type ShopLocation } from "@/lib/shop";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
	const payload = await getPayload({ config: await config });
	const locations = await getShopLocations(payload);

	const locationsByClient = new Map<string, ShopLocation[]>();
	for (const location of locations) {
		const clientLocations = locationsByClient.get(location.clientTitle) ?? [];
		clientLocations.push(location);
		locationsByClient.set(location.clientTitle, clientLocations);
	}

	return (
		<>
			<h1>Choose a store</h1>
			{locations.length === 0 && <p>No stores are open right now.</p>}
			{[...locationsByClient].map(([clientTitle, clientLocations]) => (
				<section key={clientTitle}>
					<h2>{clientTitle}</h2>
					<ul className="shop-list">
						{clientLocations.map((location) => (
							<li key={location.id}>
								<Link href={`/shop/locations/${location.id}`}>
									{location.title}
								</Link>
								<span className="shop-muted">{location.address}</span>
							</li>
						))}
					</ul>
				</section>
			))}
		</>
	);
}
