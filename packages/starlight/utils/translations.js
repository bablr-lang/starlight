import { getCollection } from 'astro:content';
import config from 'virtual:starlight/user-config';
import project from 'virtual:starlight/project-context';
import pluginTranslations from 'virtual:starlight/plugin-translations';
import { createTranslationSystem } from './createTranslationSystem.js';
import { getCollectionPathFromRoot } from './collection.js';
import { stripExtension, stripLeadingSlash } from './path.js';

const i18nCollectionPathFromRoot = getCollectionPathFromRoot('i18n', project);

/** Get all translation data from the i18n collection, keyed by `lang`, which are BCP-47 language tags. */
async function loadTranslations() {
	// Briefly override `console.warn()` to silence logging when a project has no i18n collection.
	const warn = console.warn;
	console.warn = () => {};
	const userTranslations = Object.fromEntries(
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore — may be a type error in projects without an i18n collection
		(await getCollection('i18n')).map(({ id, data, filePath }) => {
			const lang =
				project.legacyCollections || !filePath
					? id
					: stripExtension(stripLeadingSlash(filePath.replace(i18nCollectionPathFromRoot, '')));
			return [lang, data];
		})
	);
	// Restore the original warn implementation.
	console.warn = warn;
	return userTranslations;
}

/**
 * Generate a utility function that returns UI strings for the given language.
 * @param {string | undefined} [lang]
 * @example
 * const t = useTranslations('en');
 * const label = t('search.label'); // => 'Search'
 */
export const useTranslations = await createTranslationSystem(
	config,
	await loadTranslations(),
	pluginTranslations
);
