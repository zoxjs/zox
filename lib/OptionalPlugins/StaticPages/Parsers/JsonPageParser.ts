import {IStaticPageParser, StaticPageData, StaticPageParser} from "../StaticPageManager";

@StaticPageParser('json')
export class JsonPageParser implements IStaticPageParser
{
    public parsePage(page: string, directory: string, filePath: string)
    {
        return JSON.parse(page) as StaticPageData;
    }
}
