import i18next from 'i18next';
import builtinTranslations from '../translations/index.js';
import { BuiltInDefaultLocale } from './i18n.js';

/**
 * The namespace for i18next resources used by Starlight.
 * All translations handled by Starlight are stored in the same namespace and Starlight always use
 * a new instance of i18next configured for this namespace.
 */
export const I18nextNamespace = 'starlight';

export async function createTranslationSystem(config, userTranslations, pluginTranslations) {
	const defaultLocale =
		config.defaultLocale.lang || config.defaultLocale?.locale || BuiltInDefaultLocale.lang;

	const translations = {
		[defaultLocale]: buildResources(
			builtinTranslations[defaultLocale],
			builtinTranslations[stripLangRegion(defaultLocale)],
			pluginTranslations[defaultLocale],
			userTranslations[defaultLocale]
		),
	};

	if (config.locales) {
		for (const locale in config.locales) {
			const lang = localeToLang(locale, config.locales, config.defaultLocale);

			translations[lang] = buildResources(
				builtinTranslations[lang] || builtinTranslations[stripLangRegion(lang)],
				pluginTranslations[lang],
				userTranslations[lang]
			);
		}
	}

	const i18n = i18next.createInstance();
	await i18n.init({
		resources: translations,
		fallbackLng:
			config.defaultLocale.lang || config.defaultLocale?.locale || BuiltInDefaultLocale.lang,
	});

	/**
	 * Generate a utility function that returns UI strings for the given language.
	 *
	 * Also includes a few utility methods:
	 * - `all()` method for getting the entire dictionary.
	 * - `exists()` method for checking if a key exists in the dictionary.
	 * - `dir()` method for getting the text direction of the locale.
	 *
	 * @param {string | undefined} [lang]
	 * @example
	 * const t = useTranslations('en');
	 * const label = t('search.label');
	 * // => 'Search'
	 * const dictionary = t.all();
	 * // => { 'skipLink.label': 'Skip to content', 'search.label': 'Search', ... }
	 * const exists = t.exists('search.label');
	 * // => true
	 * const dir = t.dir();
	 * // => 'ltr'
	 */
	return (lang) => {
		lang ??= config.defaultLocale?.lang || BuiltInDefaultLocale.lang;

		const t = i18n.getFixedT(lang, I18nextNamespace);
		t.all = () => i18n.getResourceBundle(lang, I18nextNamespace);
		t.exists = (key, options) => i18n.exists(key, { lng: lang, ns: I18nextNamespace, ...options });
		t.dir = (dirLang = lang) => i18n.dir(dirLang);

		return t;
	};
}

/**
 * Strips the region subtag from a BCP-47 lang string.
 * @param {string} [lang]
 * @example
 * const lang = stripLangRegion('en-GB'); // => 'en'
 */
function stripLangRegion(lang) {
	return lang.replace(/-[a-zA-Z]{2}/, '');
}

/**
 * Get the BCP-47 language tag for the given locale.
 * @param locale Locale string or `undefined` for the root locale.
 */
function localeToLang(locale, locales, defaultLocale) {
	const lang = locale ? locales?.[locale]?.lang : locales?.root?.lang;
	const defaultLang = defaultLocale?.lang || defaultLocale?.locale;
	return lang || defaultLang || BuiltInDefaultLocale.lang;
}

/** Build an i18next resources dictionary by layering preferred translation sources. */
function buildResources(...dictionaries) {
	const dictionary = {};
	// Iterate over alternate dictionaries to avoid overwriting preceding values with `undefined`.
	for (const dict of dictionaries) {
		for (const key in dict) {
			const value = dict[key];
			if (value) dictionary[key] = value;
		}
	}
	return { [I18nextNamespace]: dictionary };
}
