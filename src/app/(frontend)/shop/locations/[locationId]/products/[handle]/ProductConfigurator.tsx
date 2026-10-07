"use client";

import { useState } from "react";
import {
	type ConfiguratorOption,
	type ConfiguratorSku,
	findSelectedSku,
	getSelectableValueIds,
	type Selection,
	selectValue,
} from "@/lib/configurator";

export function ProductConfigurator(props: {
	options: ConfiguratorOption[];
	skus: ConfiguratorSku[];
}) {
	const { options, skus } = props;
	const [selection, setSelection] = useState<Selection>({});

	const selectedSku = findSelectedSku(options, skus, selection);
	const missingOptions = options.filter(
		(option) => selection[option.id] === undefined,
	);

	return (
		<div className="configurator">
			{options.map((option) => {
				const selectable = getSelectableValueIds(option, skus, selection);
				return (
					<fieldset key={option.id} className="configurator-option">
						<legend>{option.title}</legend>
						<div className="configurator-values">
							{option.values.map((value) => (
								// Values that conflict with other choices stay clickable;
								// picking one clears the conflicting choices instead of
								// leaving the shopper stuck
								<label
									key={value.id}
									className={
										selectable.has(value.id)
											? "configurator-value"
											: "configurator-value is-unavailable"
									}
									title={
										selectable.has(value.id)
											? undefined
											: "Not available with your current choices; selecting it will clear them"
									}
								>
									<input
										type="radio"
										name={`option-${option.id}`}
										value={value.id}
										checked={selection[option.id] === value.id}
										onChange={() =>
											setSelection(
												selectValue(
													options,
													skus,
													selection,
													option.id,
													value.id,
												),
											)
										}
									/>
									<span>{value.title}</span>
								</label>
							))}
						</div>
					</fieldset>
				);
			})}

			<output className="configurator-summary" aria-live="polite">
				{selectedSku ? (
					<>
						<strong>Your selection: </strong>
						{options
							.map(
								(option) =>
									option.values.find((v) => v.id === selection[option.id])
										?.title,
							)
							.join(" / ")}
						<span className="shop-muted"> · SKU #{selectedSku.id}</span>
					</>
				) : (
					<>Choose {missingOptions.map((option) => option.title).join(", ")}</>
				)}
			</output>

			{Object.keys(selection).length > 0 && (
				<button
					type="button"
					className="configurator-reset"
					onClick={() => setSelection({})}
				>
					Clear selection
				</button>
			)}
		</div>
	);
}
