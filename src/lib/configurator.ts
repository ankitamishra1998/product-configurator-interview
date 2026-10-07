/**
 * Pure configurator logic shared by the shopper UI. Has no Payload imports so
 * it can run in the browser.
 */

export interface ConfiguratorValue {
	id: number;
	title: string;
}

export interface ConfiguratorOption {
	id: number;
	title: string;
	values: ConfiguratorValue[];
}

export interface ConfiguratorSku {
	id: number;
	valueIds: number[];
}

/**
 * Selected value ID per option ID.
 */
export type Selection = Partial<Record<number, number>>;

const selectedValueIds = (selection: Selection, ignoreOptionId?: number) =>
	Object.entries(selection)
		.filter(
			([optionId, valueId]) =>
				valueId !== undefined && Number(optionId) !== ignoreOptionId,
		)
		.map(([, valueId]) => valueId as number);

/**
 * Values of an option that can still lead to a SKU, given what's selected in
 * the other options.
 */
export const getSelectableValueIds = (
	option: ConfiguratorOption,
	skus: ConfiguratorSku[],
	selection: Selection,
): Set<number> => {
	const otherSelected = selectedValueIds(selection, option.id);
	const matchingSkus = skus.filter((sku) =>
		otherSelected.every((valueId) => sku.valueIds.includes(valueId)),
	);
	return new Set(
		option.values
			.filter((value) =>
				matchingSkus.some((sku) => sku.valueIds.includes(value.id)),
			)
			.map((value) => value.id),
	);
};

/**
 * Selects a value, then drops selections in other options that no longer lead
 * to any SKU.
 */
export const selectValue = (
	options: ConfiguratorOption[],
	skus: ConfiguratorSku[],
	selection: Selection,
	optionId: number,
	valueId: number,
): Selection => {
	const next: Selection = { ...selection, [optionId]: valueId };
	for (const option of options) {
		const selected = next[option.id];
		if (option.id === optionId || selected === undefined) continue;
		if (!getSelectableValueIds(option, skus, next).has(selected)) {
			delete next[option.id];
		}
	}
	return next;
};

/**
 * The SKU matching the selection, once every option has a value.
 */
export const findSelectedSku = (
	options: ConfiguratorOption[],
	skus: ConfiguratorSku[],
	selection: Selection,
): ConfiguratorSku | undefined => {
	const selected = selectedValueIds(selection);
	if (selected.length !== options.length) return undefined;
	return skus.find(
		(sku) =>
			sku.valueIds.length === selected.length &&
			selected.every((valueId) => sku.valueIds.includes(valueId)),
	);
};
