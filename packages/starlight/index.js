import { AstroError } from 'astro/errors';
import { spawn } from 'node:child_process';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import cstml from '@bablr/astro_integration-cstml';
import { starlightSitemap } from './integrations/sitemap.js';
import { vitePluginStarlightUserConfig } from './integrations/virtual-user-config.js';
import { injectPluginTranslationsTypes, runPlugins } from './utils/plugins.js';
import { processI18nConfig } from './utils/i18n.js';
// import { starlightAutolinkHeadings } from './integrations/heading-links';

export default function StarlightIntegration(userOpts) {
	if (typeof userOpts !== 'object' || userOpts === null || Array.isArray(userOpts))
		throw new AstroError(
			'Invalid config passed to starlight integration',
			`The Starlight integration expects a configuration object with at least a \`title\` property.\n\n` +
				`See more details in the [Starlight configuration reference](https://starlight.astro.build/reference/configuration/)\n`
		);
	const { plugins, ...opts } = userOpts;
	let userConfig;
	let pluginTranslations = {};
	return {
		name: '@bablr/starlight',
		hooks: {
			'astro:config:setup': async ({
				addMiddleware,
				command,
				config,
				injectRoute,
				isRestart,
				logger,
				updateConfig,
			}) => {
				// Run plugins to get the updated configuration and any extra Astro integrations to load.
				const pluginResult = await runPlugins(opts, plugins, {
					command,
					config,
					isRestart,
					logger,
				});
				// Process the Astro and Starlight configurations for i18n and translations.
				const { astroI18nConfig, starlightConfig } = processI18nConfig(
					pluginResult.starlightConfig,
					config.i18n
				);

				const { integrations, useTranslations, absolutePathToLang } = pluginResult;
				pluginTranslations = pluginResult.pluginTranslations;
				userConfig = starlightConfig;

				addMiddleware({ entrypoint: '@bablr/starlight/locals', order: 'pre' });

				if (!starlightConfig.disable404Route) {
					injectRoute({
						pattern: '404',
						entrypoint: starlightConfig.prerender
							? '@bablr/starlight/routes/static/404.astro'
							: '@bablr/starlight/routes/ssr/404.astro',
						prerender: starlightConfig.prerender,
					});
				}
				injectRoute({
					pattern: '[...slug]',
					entrypoint: starlightConfig.prerender
						? '@bablr/starlight/routes/static/index.astro'
						: '@bablr/starlight/routes/ssr/index.astro',
					prerender: starlightConfig.prerender,
				});

				// Add built-in integrations only if they are not already added by the user through the
				// config or by a plugin.
				const allIntegrations = [...config.integrations, ...integrations];

				if (!allIntegrations.find(({ name }) => name === '@bablr/cstml')) {
					integrations.push(cstml());
				}

				if (!allIntegrations.find(({ name }) => name === '@astrojs/sitemap')) {
					integrations.push(starlightSitemap(starlightConfig));
				}

				// Add integrations immediately after Starlight in the config array.
				// e.g. if a user has `integrations: [starlight(), tailwind()]`, then the order will be
				// `[starlight(), expressiveCode(), sitemap(), mdx(), tailwind()]`.
				// This ensures users can add integrations before/after Starlight and we respect that order.
				const selfIndex = config.integrations.findIndex((i) => i.name === '@bablr/starlight');
				config.integrations.splice(selfIndex + 1, 0, ...integrations);

				updateConfig({
					vite: {
						plugins: [
							vitePluginStarlightUserConfig(command, starlightConfig, config, pluginTranslations),
						],
						server: {
							fs: {
								// TODO we only need this in dev!
								allow: ['..'],
							},
						},
					},
					scopedStyleStrategy: 'where',
					// If not already configured, default to prefetching all links on hover.
					prefetch: config.prefetch ?? { prefetchAll: true },
					i18n: astroI18nConfig,
				});
			},

			'astro:config:done': ({ injectTypes }) => {
				injectPluginTranslationsTypes(pluginTranslations, injectTypes);
			},

			'astro:build:done': ({ dir, logger }) => {
				if (!userConfig.pagefind) return;
				const loglevelFlag = getPagefindLoggingFlags(logger.options.level);
				const targetDir = fileURLToPath(dir);
				const cwd = dirname(fileURLToPath(import.meta.url));
				const relativeDir = relative(cwd, targetDir);
				return new Promise((resolve) => {
					spawn('npx', ['-y', 'pagefind', ...loglevelFlag, '--site', relativeDir], {
						stdio: 'inherit',
						shell: true,
						cwd,
					}).on('close', () => resolve());
				});
			},
		},
	};
}

/** Map the logging level of Astro’s logger to one of Pagefind’s logging level flags. */
function getPagefindLoggingFlags(level) {
	switch (level) {
		case 'silent':
		case 'error':
			return ['--silent'];
		case 'warn':
			return ['--quiet'];
		case 'debug':
			return ['--verbose'];
		case 'info':
		default:
			return [];
	}
}
