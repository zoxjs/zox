import {Dependency, IService} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {IControllerResolverPluginManager} from "../PluginManagers/ControllerResolverPluginManager";
import * as util from "util";
import {IResponse} from "../../Responses/IResponse";
import {IRenderable} from "../../Renderable/Renderable";
import {ILayoutService} from "./LayoutService";
import * as fs from "fs";
import {IncomingMessage} from "http";

const serviceKey = Symbol('Static Export');

export type PageContent = string | Buffer

export abstract class IStaticExportService implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract getPageContent(url: string): PageContent | Promise<PageContent>;
}

@Service
export class StaticExportService extends IStaticExportService
{
    @Dependency
    protected controllerResolverPluginManager: IControllerResolverPluginManager;

    @Dependency
    protected layoutService: ILayoutService;

    public getPageContent(url: string): PageContent | Promise<PageContent>
    {
        const controller = this.controllerResolverPluginManager.tryResolveController('GET', url);
        if (controller)
        {
            const result = controller.handle({url} as any as IncomingMessage);
            return Promise.resolve(result).then(
            res => this.getResponseContent(res, url),
            reason =>
            {
                console.error('Failed to render static', reason);
                return '';
            });
        }
        else
        {
            return 'Not Found';
        }
    }

    protected getResponseContent(response: IResponse, url: string): PageContent
    {
        if (response.statusCode !== 200)
        {
            console.warn(`Got status code ${response.statusCode} for url '${url}'`);
        }
        if (isRenderResponse(response))
        {
            return this.layoutService.wrap(response.renderable).toString();
        }
        if (isJsonResponse(response))
        {
            return response.json;
        }
        if (isStringResponse(response))
        {
            return response.responseString;
        }
        if (isFileResponse(response))
        {
            return fs.readFileSync(response.filePath);
        }
        console.warn('Response not supported:', response);
        return '';
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

function isFileResponse(response): response is { filePath: string }
{
    return response.hasOwnProperty('filePath');
}
