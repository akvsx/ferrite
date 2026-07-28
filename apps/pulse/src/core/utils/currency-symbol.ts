const supportedCurrencies = new Set(Intl.supportedValuesOf('currency'));

/**
 * Returns the currency symbol for the given currency code.
 *
 * @param ISO 4217 currency code.
 * @param locale The locale to use.
 * @returns The currency symbol.
 */
export const currencySymbol = (
	currency: string,
	locale = 'en'
): string | undefined => {
	currency = currency.toUpperCase();

	if (!supportedCurrencies.has(currency)) {
		return undefined;
	}

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
	})
		.formatToParts(0)
		.find((part) => part.type === 'currency')?.value;
};
