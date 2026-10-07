import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { getConfiguratorData, getShopLocation } from "@/lib/shop";
import config from "@/payload.config";
import { ProductConfigurator } from "./ProductConfigurator";

export const dynamic = "force-dynamic";

export default async function ProductPage(props: {
	params: Promise<{ locationId: string; handle: string }>;
}) {
	const { locationId, handle } = await props.params;
	const id = Number(locationId);
	if (!Number.isInteger(id)) notFound();

	const payload = await getPayload({ config: await config });
	const location = await getShopLocation(payload, id);
	if (!location) notFound();

	const data = await getConfiguratorData(payload, id, handle);
	if (!data) notFound();

	return (
		<>
			<p className="shop-muted">
				<Link href={`/shop/locations/${id}`}>{location.title}</Link>
			</p>
			<h1>{data.product.title}</h1>
			{data.skus.length === 0 ? (
				<p>This product isn't available to order at this store right now.</p>
			) : (
				<ProductConfigurator options={data.options} skus={data.skus} />
			)}
		</>
	);
}
