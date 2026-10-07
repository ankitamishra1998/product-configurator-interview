import Link from "next/link";
import type React from "react";
import "./shop.css";

export default function ShopLayout(props: { children: React.ReactNode }) {
	const { children } = props;

	return (
		<div className="shop">
			<header className="shop-header">
				<Link href="/shop">Shop</Link>
			</header>
			{children}
		</div>
	);
}
