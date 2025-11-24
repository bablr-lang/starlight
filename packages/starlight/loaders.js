import { glob } from 'astro/loaders';
import { getCollectionPathFromRoot } from './utils/collection.js';

// https://github.com/withastro/astro/blob/main/packages/astro/src/core/constants.ts#L87
// https://github.com/withastro/astro/blob/main/packages/integrations/mdx/src/index.ts#L59
const docsExtensions = ['cstml', 'cst'];
const i18nExtensions = ['json', 'yml', 'yaml'];

/**
 * Loads content files from the `src/content/docs/` directory, ignoring filenames starting with `_`.
 */
export function docsLoader({ generateId } = {}) {
	return {
		name: 'starlight-docs-loader',
		load: createGlobLoadFn('docs', generateId),
	};
}

/**
 * Loads data files from the `src/content/i18n/` directory, ignoring filenames starting with `_`.
 */
export function i18nLoader() {
	return {
		name: 'starlight-i18n-loader',
		load: createGlobLoadFn('i18n'),
	};
}

function createGlobLoadFn(collection, generateId) {
	return (context) => {
		const extensions = collection === 'docs' ? docsExtensions : i18nExtensions;

		const options = {
			base: getCollectionPathFromRoot(collection, context.config),
			pattern: `**/[^_]*.{${extensions.join(',')}}`,
		};
		if (generateId) options.generateId = generateId;

		return glob(options).load(context);
	};
}
