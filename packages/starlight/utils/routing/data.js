import project from 'virtual:starlight/project-context';
import config from 'virtual:starlight/user-config';
import { generateToC } from '../generateToC';
import { getNewestCommitDate } from 'virtual:starlight/git-info';
import { getPrevNextLinks, getSidebar } from '../navigation';
import { ensureTrailingSlash } from '../path';
import { getRouteBySlugParam, normalizeCollectionEntry } from '.';

import { formatPath } from '../format-path';
import { useTranslations } from '../translations';
import { BuiltInDefaultLocale } from '../i18n';
import { getEntry } from 'astro:content';
import { getCollectionPathFromRoot } from '../collection';
import { getHead } from '../head';

export async function getRoute(context) {
	return (
		('slug' in context.params && getRouteBySlugParam(context.params.slug)) ||
		(await get404Route(context.locals))
	);
}

export function useRouteData(context, route, { Content, headings }) {
	const routeData = generateRouteData({ props: { ...route, headings }, context });
	return { ...routeData, Content };
}

export function generateRouteData({ props, context }) {
	const { entry, locale, lang } = props;
	const sidebar = getSidebar(context.url.pathname, locale);
	const siteTitle = getSiteTitle(lang);
	return {
		...props,
		siteTitle,
		siteTitleHref: getSiteTitleHref(locale),
		sidebar,
		hasSidebar: entry.data.template !== 'splash',
		pagination: getPrevNextLinks(sidebar, config.pagination, entry.data),
		toc: getToC(props),
		lastUpdated: getLastUpdated(props),
		editUrl: getEditUrl(props),
		head: getHead(props, context, siteTitle),
	};
}

export function getToC({ entry, lang, headings }) {
	const tocConfig =
		entry.data.template === 'splash'
			? false
			: entry.data.tableOfContents !== undefined
				? entry.data.tableOfContents
				: config.tableOfContents;
	if (!tocConfig) return;
	const t = useTranslations(lang);
	return {
		...tocConfig,
		items: generateToC(headings, { ...tocConfig, title: t('tableOfContents.overview') }),
	};
}

function getLastUpdated({ entry }) {
	const { lastUpdated: frontmatterLastUpdated } = entry.data;
	const { lastUpdated: configLastUpdated } = config;

	if (frontmatterLastUpdated ?? configLastUpdated) {
		try {
			return frontmatterLastUpdated instanceof Date
				? frontmatterLastUpdated
				: getNewestCommitDate(entry.filePath);
		} catch {
			// If the git command fails, ignore the error.
			return undefined;
		}
	}

	return undefined;
}

function getEditUrl({ entry }) {
	const { editUrl } = entry.data;
	// If frontmatter value is false, editing is disabled for this page.
	if (editUrl === false) return;

	let url;
	if (typeof editUrl === 'string') {
		// If a URL was provided in frontmatter, use that.
		url = editUrl;
	} else if (config.editLink.baseUrl) {
		// If a base URL was added in Starlight config, synthesize the edit URL from it.
		url = ensureTrailingSlash(config.editLink.baseUrl) + entry.filePath;
	}
	return url ? new URL(url) : undefined;
}

/** Get the site title for a given language. **/
export function getSiteTitle(lang) {
	const defaultLang = config.defaultLocale.lang;
	if (lang && config.title[lang]) {
		return config.title[lang];
	}
	return config.title[defaultLang];
}

export function getSiteTitleHref(locale) {
	return formatPath(locale || '/');
}

/** Generate a route object for Starlight’s 404 page. */
async function get404Route(locals) {
	const { lang = BuiltInDefaultLocale.lang, dir = BuiltInDefaultLocale.dir } =
		config.defaultLocale || {};
	let locale = config.defaultLocale?.locale;
	if (locale === 'root') locale = undefined;

	const entryMeta = { dir, lang, locale };

	const fallbackEntry = {
		slug: '404',
		id: '404',
		body: '',
		collection: 'docs',
		data: {
			title: '404',
			template: 'splash',
			editUrl: false,
			head: [],
			hero: { tagline: locals.t('404.text'), actions: [] },
			pagefind: false,
			sidebar: { hidden: false, attrs: {} },
			draft: false,
		},
		filePath: `${getCollectionPathFromRoot('docs', project)}/404.cstml`,
	};

	const userEntry = await getEntry('docs', '404');
	const entry = userEntry ? normalizeCollectionEntry(userEntry) : fallbackEntry;
	return { ...entryMeta, entryMeta, entry, id: entry.id, slug: entry.slug };
}
