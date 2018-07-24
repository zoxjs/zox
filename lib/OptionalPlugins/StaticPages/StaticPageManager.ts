import {UrlWithParsedQuery} from "url";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import * as path from "path";
import * as fs from "fs";
import {IncomingMessage} from "http";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {IConfigService, loadYamlOrJsonFile} from "../../Services/ConfigService";
import {IPropertyDecoratorPluginManager} from "../../Plugins/PluginManagers/PropertyDecoratorPluginManager";
import {listFilesSync} from "../../Utility";
import {routeTokens, tryMatchExactRoute} from "../../RoutingUtility";
import {FileEvent, watch} from "../../Misc/FileWatch";
import {ControllerResolver, IControllerResolver} from "../../Plugins/PluginManagers/ControllerResolverPluginManager";
import {IController} from "../../Controller";
import {IRenderable} from "../../Renderable/Renderable";
import {RenderableStaticPage} from "../../Renderable/Content/RenderableStaticPage";
import {IResponse} from "../../Responses/IResponse";
import {RenderResponse} from "../../Responses/RenderResponse";

const pageParserManagerServiceKey = Symbol('Static Page Parser Manager');
const pageTypeServiceKey = Symbol('Static Page Type');
const pageTypePluginKey = Symbol('Static Page Type');
const pageParserPluginKey = Symbol('Static Page Parser');

export const pageNameKey = Symbol('Page Name');

type StaticPageOptions = {
    pages: string
    partials: string
}

export type StaticPageParserInfo = {
    parser: IStaticPageParser
    extensions: Array<string>
}

export type StaticPageData = {
    [pageNameKey]?: string
    type: string
    title: string
    urlTokens: Array<string>
    url: string
    date?: Date
    include: Array<string> | { [key:string]: string }
}

export interface IStaticPageParser
{
    parsePage(page: string, directory: string, filePath: string): StaticPageData | void;
}


export abstract class IStaticPageParserPluginManager implements IService
{
    get serviceKey(): symbol
    {
        return pageParserManagerServiceKey;
    }

    public abstract get pages(): Array<StaticPageData>;
}

@Service
export class StaticPageParserPluginManager extends IStaticPageParserPluginManager implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    @Dependency
    protected config: IConfigService;

    @Dependency
    protected propertyDecoratorPluginManager: IPropertyDecoratorPluginManager;

    private options: StaticPageOptions;

    private _pages: Array<StaticPageData>;
    private _partials: { [key:string]: any };

    public get pages(): Array<StaticPageData>
    {
        return this._pages || (this._pages = this.loadPages());
    }

    private _pageParserInfoList: Array<StaticPageParserInfo>;

    private get pageParserInfoList(): Array<StaticPageParserInfo>
    {
        if (!this._pageParserInfoList)
        {
            this._pageParserInfoList = [];
            const pluginDefinitions: Array<PluginDefinition<Constructor<IStaticPageParser>, Array<string>>>
                = this.pluginDiscovery.getPlugins(pageParserPluginKey);
            for (const pluginDefinition of pluginDefinitions)
            {
                this._pageParserInfoList.push({
                    parser: this.container.create(pluginDefinition.pluginClass),
                    extensions: pluginDefinition.data,
                });
            }
        }
        return this._pageParserInfoList;
    }

    private loadPages(): Array<StaticPageData>
    {
        const pages: Array<StaticPageData> = [];
        const filePaths = listFilesSync(this.options.pages);
        for (const filePath of filePaths)
        {
            const ext = path.extname(filePath).substring(1);
            let parsed = false;
            for (const pageParserInfo of this.pageParserInfoList)
            {
                if (pageParserInfo.extensions.indexOf(ext) >= 0)
                {
                    const file = fs.readFileSync(filePath, 'utf8');
                    const pageData = pageParserInfo.parser.parsePage(file, this.options.pages, filePath);
                    if (pageData)
                    {
                        this.propertyDecoratorPluginManager.decorateProperties(pageData);
                        if (pageData.title !== undefined)
                        {
                            pageData.title = String(pageData.title);
                        }
                        else
                        {
                            pageData.title = path.basename(filePath, '.' + ext);
                        }
                        if (pageData[pageNameKey] === undefined)
                        {
                            pageData[pageNameKey] = urlAlias(pageData.title);
                        }
                        if (pageData.date)
                        {
                            pageData.date = new Date(pageData.date);
                        }
                        if (!pageData.url)
                        {
                            const dirPath = path.dirname(path.relative(this.options.pages, filePath));
                            if (dirPath !== '.')
                            {
                                pageData.url = dirPath + '/' + urlAlias(pageData.title);
                            }
                            else
                            {
                                pageData.url = urlAlias(pageData.title);
                            }
                        }
                        const qIndex = pageData.url.indexOf('?');
                        if (qIndex >= 0)
                        {
                            pageData.url.substring(0, qIndex);
                            console.warn("Url contains an invalid character '?' on page: " + filePath);
                        }
                        pageData.urlTokens = routeTokens(pageData.url as any);
                        this.applyIncludes(pageData);
                        pages.push(pageData);
                    }
                    parsed = true;
                    break;
                }
            }
            if (!parsed)
            {
                console.warn('Page type is not supported: ' + filePath);
            }
        }
        return pages;
    }

    private applyIncludes(pageData)
    {
        if (pageData.include)
        {
            const includes = pageData.include;
            if (Array.isArray(includes))
            {
                for (const partialPath of includes)
                {
                    const filePath = path.join(this.options.partials, partialPath);
                    const data = this.getPartial(filePath);
                    if (data !== undefined)
                    {
                        if (typeof data === 'object' && !Array.isArray(data))
                        {
                            this.applyIncludes(data);
                            Object.assign(pageData, data);
                        }
                    }
                }
            }
            else if (typeof includes === 'object')
            {
                const keys = Object.getOwnPropertyNames(includes);
                for (const key of keys)
                {
                    const filePath = path.join(this.options.partials, includes[key]);
                    const data = this.getPartial(filePath);
                    if (data !== undefined)
                    {
                        if (typeof data === 'object' && !Array.isArray(data))
                        {
                            this.applyIncludes(data);
                        }
                        pageData[key] = data;
                    }
                }
            }
        }
    }

    private getPartial(filePath: string): any
    {
        if (!this._partials)
        {
            this._partials = {};
        }
        if (!(filePath in this._partials))
        {
            const data = loadYamlOrJsonFile(filePath);
            this.propertyDecoratorPluginManager.decorateProperties(data);
            this._partials[filePath] = data;
            return data;
        }
        return this._partials[filePath];
    }

    public onResolved()
    {
        this.options = this.config.getConfig('static.page');
        this.options.pages = this.options.pages || 'pages/root';
        this.options.partials = this.options.partials || path.join(this.options.pages, '../partials');
        if (this.config.getGlobalConfig().watch)
        {
            const handleEvent = (e: FileEvent) =>
            {
                if (e.event != 'initial')
                {
                    this._partials = this._pages = null;
                }
            };
            watch(this.options.pages, handleEvent, 500);
            watch(this.options.partials, handleEvent, 500);
        }
        this._pages = this.loadPages();
    }
}

@ControllerResolver(10)
export class StaticPageControllerResolver implements IControllerResolver
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected manager: IStaticPageParserPluginManager;

    public tryResolveController(method: string, parsedUrl: UrlWithParsedQuery, tokens: Array<string>): IController | void
    {
        if (method == 'GET')
        {
            for (const page of this.manager.pages)
            {
                if (tryMatchExactRoute(tokens, page.urlTokens))
                {
                    const controller = this.container.create(StaticPageController);
                    controller.pageData = page;
                    return controller;
                }
            }
        }
    }
}

export function StaticPageParser(...extensions: Array<string>)
{
    return PluginSetup<IStaticPageParser>(pageParserPluginKey, extensions);
}

export abstract class IStaticPageTypePluginManager implements IService
{
    get serviceKey(): symbol
    {
        return pageTypeServiceKey;
    }

    public abstract getRenderablePageType(type: string): Constructor<IRenderable>;
}

@Service
export class StaticPageTypePluginManager extends IStaticPageTypePluginManager
{
    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    public getRenderablePageType(type: string | undefined): Constructor<IRenderable>
    {
        if (typeof type === 'string')
        {
            const pluginDefinitions: Array<PluginDefinition<Constructor<IRenderable>, string>>
                = this.pluginDiscovery.getPlugins(pageTypePluginKey);
            for (const pluginDefinition of pluginDefinitions)
            {
                if (pluginDefinition.data == type)
                {
                    return pluginDefinition.pluginClass;
                }
            }
        }
        return RenderableStaticPage;
    }
}

export function StaticPageType(...extensions: Array<string>)
{
    return PluginSetup<IRenderable>(pageTypePluginKey, extensions);
}

export class StaticPageController implements IController
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected staticPageTypePluginManager: IStaticPageTypePluginManager;

    public pageData;

    public handle(request: IncomingMessage): IResponse | Promise<IResponse>
    {
        const pageType = this.staticPageTypePluginManager.getRenderablePageType(this.pageData.type);
        const page = this.container.create(pageType, this.pageData);
        return this.container.create(RenderResponse, page);
    }
}

export function urlAlias(str: string): string
{
    return str
    .toLowerCase()
    .replace(/[^\w ]+/g,'')
    .replace(/ +/g,'-');
}
