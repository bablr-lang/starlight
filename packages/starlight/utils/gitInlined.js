/**
 * Git module to be used on production build results.
 * The API is based on inlined git information.
 */

export const makeAPI = (data) => {
	const trackedDocsFiles = new Map(data);

	return {
		getNewestCommitDate: (file) => {
			const timestamp = trackedDocsFiles.get(file);
			if (!timestamp) throw new Error(`Failed to retrieve the git history for file "${file}"`);
			return new Date(timestamp);
		},
	};
};
