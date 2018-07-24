import {IStaticPageParser, StaticPageData, StaticPageParser} from "../StaticPageManager";
import * as yaml from "js-yaml";
import * as marked from "marked";

export type MarkdownPageData = {
    body: string
} & StaticPageData;

@StaticPageParser('md')
export class MarkdownPageParser implements IStaticPageParser
{
    public parsePage(page: string, directory: string, filePath: string)
    {
        const matchStart = /---(\r\n|\r|\n)/.exec(page);
        const matchEnd = /(\r\n|\r|\n)---(\r\n|\r|\n)/.exec(page);
        if (matchStart && matchEnd)
        {
            const propsString = page.substring(matchStart.index + matchStart[0].length, matchEnd.index);
            const pageData = yaml.safeLoad(propsString) as MarkdownPageData;
            pageData.body = marked(page.substring(matchEnd.index + matchEnd[0].length));
            return pageData;
        }
        console.warn('Missing metadata on page:', filePath);
    }
}
