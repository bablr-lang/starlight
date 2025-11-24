import sitemap from '@astrojs/sitemap';

export function getSitemapConfig(opts) {
	const sitemapConfig = {};
	if (opts.isMultilingual) {
		sitemapConfig.i18n = {
			defaultLocale: opts.defaultLocale.locale || 'root',
			locales: Object.fromEntries(
				Object.entries(opts.locales).map(([locale, config]) => [locale, config.lang])
			),
		};
	}
	return sitemapConfig;
}

/**
 * A wrapped version of the `@astrojs/sitemap` integration configured based
 * on Starlight i18n config.
 */
export function starlightSitemap(opts) {
	return sitemap(getSitemapConfig(opts));
}
