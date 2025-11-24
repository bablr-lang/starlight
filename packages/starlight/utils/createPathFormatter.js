import { fileWithBase, pathWithBase } from './base.js';
import {
	ensureHtmlExtension,
	ensureTrailingSlash,
	stripHtmlExtension,
	stripTrailingSlash,
} from './path';

const defaultFormatStrategy = {
	addBase: pathWithBase,
	handleExtension: (href) => stripHtmlExtension(href),
};

const formatStrategies = {
	file: {
		addBase: fileWithBase,
		handleExtension: (href) => ensureHtmlExtension(href),
	},
	directory: defaultFormatStrategy,
	preserve: defaultFormatStrategy,
};

const trailingSlashStrategies = {
	always: ensureTrailingSlash,
	never: stripTrailingSlash,
	ignore: (href) => href,
};

/** Format a path based on the project config. */
function formatPath(href, { format = 'directory', trailingSlash = 'ignore' }) {
	const formatStrategy = formatStrategies[format];
	const trailingSlashStrategy = trailingSlashStrategies[trailingSlash];

	// Handle extension
	href = formatStrategy.handleExtension(href);

	// Add base
	href = formatStrategy.addBase(href);

	// Skip trailing slash handling for `build.format: 'file'`
	if (format === 'file') return href;

	// Handle trailing slash
	href = href === '/' ? href : trailingSlashStrategy(href);

	return href;
}

export function createPathFormatter(opts) {
	return (href) => formatPath(href, opts);
}
