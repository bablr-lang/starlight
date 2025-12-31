import { highlightAll } from 'bedazzlr';
import cstml from '@bablr/language-en-cstml';
import esnext from '@bablr/language-en-esnext';
import json from '@bablr/language-en-json';

let languages = new Map([
	[cstml.canonicalURL, cstml],
	[esnext.canonicalURL, esnext],
	[json.canonicalURL, json],
]);

const Highlighter = () => {
	return null;
};

highlightAll(languages);

export default Highlighter;
