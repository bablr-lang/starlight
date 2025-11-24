import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCollectionUrl } from './collection.js';

/**
 * @see {@link file://./collection.js} for more context about this file.
 *
 * Below are various functions to easily get paths to collections used in Starlight that rely on
 * Node.js builtins. They exist in a separate file from {@link file://./collection.js} to avoid
 * potentially importing Node.js builtins in the final bundle.
 */

export function resolveCollectionPath(collection, srcDir) {
	return resolve(fileURLToPath(srcDir), `content/${collection}`);
}

export function getCollectionPosixPath(collection, srcDir) {
	// TODO: when Astro minimum Node.js version is >= 20.13.0, refactor to use the `fileURLToPath`
	// second optional argument to enforce POSIX paths by setting `windows: false`.
	return fileURLToPath(getCollectionUrl(collection, srcDir)).replace(/\\/g, '/');
}
