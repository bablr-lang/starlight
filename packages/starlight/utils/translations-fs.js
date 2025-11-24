import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { createTranslationSystem } from './createTranslationSystem.js';

const contentCollectionFileExtensions = ['.json', '.yaml', '.yml'];

/**
 * Loads and creates a translation system from the file system.
 * Only for use in integration code.
 * In modules loaded by Vite/Astro, import [`useTranslations`](./translations.js) instead.
 *
 * @see [`./translations.js`](./translations.js)
 */
export async function createTranslationSystemFromFs(opts, { srcDir }, pluginTranslations = {}) {
	/** All translation data from the i18n collection, keyed by `id`, which matches locale. */
	const userTranslations = {};
	try {
		const i18nDir = new URL('content/i18n/', srcDir);
		// Load the user’s i18n directory
		const files = fs.readdirSync(i18nDir, 'utf-8');
		// Load the user’s i18n collection and ignore the error if it doesn’t exist.
		for (const file of files) {
			const filePath = path.parse(file);
			if (!contentCollectionFileExtensions.includes(filePath.ext)) continue;
			const id = filePath.name;
			const url = new URL(filePath.base, i18nDir);
			const content = fs.readFileSync(new URL(file, i18nDir), 'utf-8');
			const data =
				filePath.ext === '.json'
					? JSON.parse(content)
					: yaml.load(content, { filename: fileURLToPath(url) });
			userTranslations[id] = data;
		}
	} catch (e) {
		if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
			// i18nDir doesn’t exist, so we ignore the error.
		} else {
			// Other errors may be meaningful, e.g. JSON syntax errors, so should be thrown.
			throw e;
		}
	}

	return createTranslationSystem(opts, userTranslations, pluginTranslations);
}
