import {IStaticPageParser, StaticPageData, StaticPageParser} from "../StaticPageManager";
import * as yaml from "js-yaml";

@StaticPageParser('yaml', 'yml')
export class YamlPageParser implements IStaticPageParser
{
    public parsePage(page: string, directory: string, filePath: string)
    {
        return yaml.safeLoad(page) as StaticPageData;
    }
}
