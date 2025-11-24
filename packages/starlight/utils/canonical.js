import { ensureTrailingSlash, stripTrailingSlash } from './path';

const canonicalTrailingSlashStrategies = {
	always: ensureTrailingSlash,
	never: stripTrailingSlash,
	ignore: ensureTrailingSlash,
};

/** Format a canonical link based on the project config. */
export function formatCanonical(href, opts) {
	if (opts.format === 'file') return href;
	return canonicalTrailingSlashStrategies[opts.trailingSlash](href);
}
