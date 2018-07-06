import {Dependency, IService} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {IControllerResolverPluginManager} from "../PluginManagers/ControllerResolverPluginManager";
import {IResponse} from "../../Responses/IResponse";
import {IRenderable} from "../../Renderable/Renderable";
import {ILayoutService} from "./LayoutService";
import {IncomingMessage} from "http";
import {FileWithStats} from "../../Responses/FileResponse";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";

const mkdirAsync = util.promisify(fs.mkdir);
const statAsync = util.promisify(fs.stat);
const writeFileAsync = util.promisify(fs.writeFile);

const serviceKey = Symbol('Static Export');

export type ResponseContent = {
    url?: string
    response?: IResponse
    isSupported?: boolean
    isPage?: boolean
    content?: string | Buffer
    error?: string
}

export abstract class IStaticExportService implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract getPages(url: string): Promise<Array<ResponseContent>>;
    public abstract getContent(url: string): Promise<ResponseContent>;
    public abstract savePages(directory: string, pages: Array<ResponseContent>): Promise<void>;
}

@Service
export class StaticExportService extends IStaticExportService
{
    @Dependency
    protected controllerResolverPluginManager: IControllerResolverPluginManager;

    @Dependency
    protected layoutService: ILayoutService;

    public async getPages(url: string, items?: Array<ResponseContent>): Promise<Array<ResponseContent>>
    {
        items = items || [];
        const content = await this.getContent(url);
        items.push(content);
        if (content.error)
        {
            console.error(content.error);
        }
        else if (!content.isSupported)
        {
            console.warn('Response not supported:', content.response);
        }
        else
        {
            if (content.isPage)
            {
                const urls = getUrlsOnPage(content.content as string);
                for (const u of urls)
                {
                    if (u.startsWith('/') && !u.startsWith('//') && items.every(item => item.url !== u))
                    {
                        await this.getPages(u, items);
                    }
                }
            }
        }
        return items;
    }

    public async getContent(url: string): Promise<ResponseContent>
    {
        const controller = this.controllerResolverPluginManager.tryResolveController('GET', url);
        if (controller)
        {
            try
            {
                const result = await controller.handle({url, method: 'GET', headers: {}} as any as IncomingMessage);
                return this.getResponseContent(result, url);
            }
            catch (e)
            {
                return { url, error: `Failed to get content on page '${url}', Error: ${e}` };
            }
        }
        else
        {
            return { url, error: `Url '${url}' Not Found`};
        }
    }

    protected getResponseContent(response: IResponse, url: string): ResponseContent
    {
        const pageContent: ResponseContent = {
            url,
            response,
            isSupported: true,
            isPage: false,
        };
        if (response.statusCode !== 200)
        {
            pageContent.error = `Got status code ${response.statusCode} for url '${url}'`;
        }
        else if (isRenderResponse(response))
        {
            pageContent.content = this.layoutService.wrap(response.renderable).toString();
            pageContent.isPage = true;
        }
        else if (isJsonResponse(response))
        {
            pageContent.content = response.json;
        }
        else if (isStringResponse(response))
        {
            pageContent.content = response.responseString;
        }
        else if (isFileResponse(response))
        {
            pageContent.content = typeof response.file === 'string' ?
                fs.readFileSync(response.file) :
                fs.readFileSync(response.file.filePath);
        }
        else
        {
            pageContent.isSupported = false;
        }
        return pageContent;
    }

    public async savePages(directory: string, pages: Array<ResponseContent>): Promise<void>
    {
        await makeDirRecursive(directory);
        for (const page of pages)
        {
            if (!page.error && page.isSupported)
            {
                let dest = page.isPage ? path.join(page.url, '/index.html') : page.url;
                dest = path.join(directory, dest);
                await makeDirRecursive(path.dirname(dest));
                await writeFileAsync(dest, page.content);
            }
        }
    }
}

function isRenderResponse(response): response is { renderable: IRenderable }
{
    return response.hasOwnProperty('renderable');
}

function isJsonResponse(response): response is { json: string }
{
    return response.hasOwnProperty('json');
}

function isStringResponse(response): response is { responseString: string }
{
    return response.hasOwnProperty('responseString');
}

function isFileResponse(response): response is { file: string | FileWithStats }
{
    return response.hasOwnProperty('file');
}

export function getUrlsOnPage(page: string): Array<string>
{
    const urls: Array<string> = [];
    let start;
    let end = 0;
    while ((start = page.indexOf('href="', end + 1)) > 0)
    {
        end = page.indexOf('"', start + 6);
        if (end < 0)
        {
            break;
        }
        urls.push(page.substring(start + 6, end));
    }
    end = 0;
    while ((start = page.indexOf('src="', end + 1)) > 0)
    {
        end = page.indexOf('"', start + 5);
        if (end < 0)
        {
            break;
        }
        urls.push(page.substring(start + 5, end));
    }
    return urls;
}

export async function makeDirRecursive(directory: string): Promise<void>
{
    try
    {
        await mkdirAsync(directory);
    }
    catch (e)
    {
        if (e.code === 'ENOENT')
        {
            await makeDirRecursive(path.dirname(directory));
            await mkdirAsync(directory);
        }
        else
        {
            const stat = await statAsync(directory);
            if (!stat.isDirectory())
            {
                throw new Error(`File '${directory}' already exists, but is not a directory.`);
            }
        }
    }
}
