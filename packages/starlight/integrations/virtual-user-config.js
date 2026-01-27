import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCollectionPath } from '../utils/collection-fs.js';
import { getAllNewestCommitDate } from '../utils/git.js';

function resolveVirtualModuleId(id) {
	return `\0${id}`;
}

/** Vite plugin that exposes Starlight user config and project context via virtual modules. */
export function vitePluginStarlightUserConfig(
	command,
	opts,
	{ build, legacy, root, srcDir, trailingSlash },
	pluginTranslations
) {
	/**
	 * Resolves module IDs to a usable format:
	 * - Relative paths (e.g. `'./module.js'`) are resolved against `base` and formatted as an absolute path.
	 * - Package identifiers (e.g. `'module'`) are returned unchanged.
	 *
	 * By default, `base` is the project root directory.
	 */
	const resolveId = (id, base = root) =>
		JSON.stringify(id.startsWith('.') ? resolve(fileURLToPath(base), id) : id);

	/**
	 * Resolves a path to a Starlight file relative to this file.
	 * @example
	 * resolveLocalPath('../utils/git.js');
	 * // => '"/users/houston/docs/node_modules/@bablr/starlight/utils/git.js"'
	 */
	const resolveLocalPath = (path) => JSON.stringify(fileURLToPath(new URL(path, import.meta.url)));

	const rootPath = fileURLToPath(root);
	const docsPath = resolveCollectionPath('docs', srcDir);

	let collectionConfigImportPath = resolve(
		fileURLToPath(srcDir),
		legacy.collections ? './content/config.js' : './content.config.js'
	);
	// If not using legacy collections and the config doesn't exist, fallback to the legacy location.
	// We need to test this ahead of time as we cannot `try/catch` a failing import in the virtual
	// module as this would fail at build time when Rollup tries to resolve a non-existent path.
	if (!legacy.collections && !existsSync(collectionConfigImportPath)) {
		collectionConfigImportPath = resolve(fileURLToPath(srcDir), './content/config.js');
	}

	const virtualComponentModules = Object.fromEntries(
		Object.entries(opts.components).map(([name, path]) => [
			`virtual:starlight/components/${name}`,
			`export { default } from ${resolveId(path)};`,
		])
	);

	/** Map of virtual module names to their code contents as strings. */
	const modules = {
		'virtual:starlight/user-config': `export default ${JSON.stringify(opts)}`,
		'virtual:starlight/project-context': `export default ${JSON.stringify({
			build: { format: build.format },
			legacyCollections: legacy.collections,
			root,
			srcDir,
			trailingSlash,
		})}`,
		'virtual:starlight/git-info':
			(command !== 'build'
				? `import { makeAPI } from ${resolveLocalPath('../utils/git.js')};` +
					`const api = makeAPI(${JSON.stringify(rootPath)});`
				: `import { makeAPI } from ${resolveLocalPath('../utils/gitInlined.js')};` +
					`const api = makeAPI(${JSON.stringify(getAllNewestCommitDate(rootPath, docsPath))});`) +
			'export const getNewestCommitDate = api.getNewestCommitDate;',
		/**
		 * Module containing styles for features that can be toggled on or off such as heading anchor links.
		 */
		'virtual:starlight/optional-css': opts.markdown.headingLinks
			? `import ${resolveLocalPath('../style/anchor-links.css')};`
			: '',
		/**
		 * Module containing imports of user-specified custom CSS files.
		 */
		'virtual:starlight/user-css': opts.customCss.map((id) => `import ${resolveId(id)};`).join(''),
		'virtual:starlight/user-images': opts.logo
			? 'src' in opts.logo
				? `import src from ${resolveId(
						opts.logo.src
					)}; export const logos = { dark: src, light: src };`
				: `import dark from ${resolveId(opts.logo.dark)}; import light from ${resolveId(
						opts.logo.light
					)}; export const logos = { dark, light };`
			: 'export const logos = {};',
		'virtual:starlight/collection-config': `let userCollections;
			try {
				userCollections = (await import(${JSON.stringify(collectionConfigImportPath)})).collections;
			} catch {}
			export const collections = userCollections;`,
		'virtual:starlight/plugin-translations': `export default ${JSON.stringify(pluginTranslations)}`,
		/**
		 * Exports an array of route middleware functions.
		 * For example, might generate a module that looks like:
		 *
		 * ```js
		 * import { onRequest as routeMiddleware0 } from "/users/houston/docs/src/middleware";
		 * import { onRequest as routeMiddleware1 } from "@houston-inc/plugin/middleware";
		 *
		 * export const routeMiddleware = [
		 * 	routeMiddleware0,
		 * 	routeMiddleware1,
		 * ];
		 * ```
		 */
		'virtual:starlight/route-middleware':
			opts.routeMiddleware
				.reduce(
					([imports, entries], id, index) => {
						const importName = `routeMiddleware${index}`;
						imports += `import { onRequest as ${importName} } from ${resolveId(id)};\n`;
						entries += `\t${importName},\n`;
						return [imports, entries];
					},
					['', 'export const routeMiddleware = [\n']
				)
				.join('\n') + '];',
		/** Map of modules exporting Starlight’s templating components. */
		'virtual:starlight/pagefind-config': `export const pagefindUserConfig = ${JSON.stringify(opts.pagefind || {})}`,
		...virtualComponentModules,
	};

	/** Mapping names prefixed with `\0` to their original form. */
	const resolutionMap = Object.fromEntries(
		Object.keys(modules).map((key) => [resolveVirtualModuleId(key), key])
	);

	return {
		name: 'vite-plugin-starlight-user-config',
		resolveId(id) {
			if (id in modules) return resolveVirtualModuleId(id);
		},
		load(id) {
			const resolution = resolutionMap[id];
			if (resolution) return modules[resolution];
		},
	};
}
