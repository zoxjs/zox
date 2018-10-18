import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {IController, MaybePromise} from "../../Controller";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import * as url from "url";
import {UrlWithParsedQuery} from "url";
import {RouteParams, routeTokens} from "../../RoutingUtility";
import {IAliasResolverService} from "./AliasResolverPluginManager";
import {IncomingMessage} from "http";
import {IResponse} from "../../Responses/IResponse";
import {ParsedUrlQuery} from "querystring";

const serviceKey = Symbol('Controller Resolver');
const pluginKey = Symbol('Controller Resolver');

export type ControllerFuncThis = {
    container: IServiceContainer
    params?: RouteParams
    query?:ParsedUrlQuery
}
export type ControllerFunc = (this: void | ControllerFuncThis, request: IncomingMessage) => MaybePromise<IResponse>
export type ControllerType = Constructor<IController> | ControllerFunc

export interface IControllerResolver
{
    tryResolveController(method: string, parsedUrl: UrlWithParsedQuery, tokens: Array<string>): IController | ControllerFunc | void;
}

export abstract class IControllerResolverPluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract defaultController: ControllerType;
    public abstract tryResolveController(method: string, requestUrl: string): IController | ControllerFunc | void;
}

@Service
export class ControllerResolverPluginManager extends IControllerResolverPluginManager implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    @Dependency
    protected aliasResolver: IAliasResolverService;

    private resolvers: Array<IControllerResolver> = [];

    public defaultController: ControllerType;

    public onResolved(): void
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IControllerResolver>, number>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        pluginDefinitions.sort((a, b) => a.data - b.data);
        for (const pluginDefinition of pluginDefinitions)
        {
            this.resolvers.push(this.container.create(pluginDefinition.pluginClass));
        }
    }

    public tryResolveController(method: string, requestUrl: string): IController | ControllerFunc | void
    {
        const parsedUrl: UrlWithParsedQuery = url.parse(decodeURI(requestUrl), true);
        const tokens = routeTokens(parsedUrl.pathname);
        for (const resolver of this.resolvers)
        {
            const controller = resolver.tryResolveController(method, parsedUrl, tokens);
            if (controller !== undefined)
            {
                return controller;
            }
        }
        const alias = this.aliasResolver.tryResolveAlias(parsedUrl, tokens);
        if (typeof alias === 'string')
        {
            return this.tryResolveController(method, alias);
        }
        if (this.defaultController)
        {
            if (isControllerClass(this.defaultController))
            {
                const controller = this.container.create(this.defaultController);
                controller.query = parsedUrl.query;
                return controller;
            }
            else if (this.defaultController.prototype)
            {
                return this.defaultController.bind({
                    container: this.container,
                    query: parsedUrl.query,
                });
            }
            else
            {
                return this.defaultController;
            }
        }
    }
}

export function ControllerResolver(priority: number)
{
    return PluginSetup<IControllerResolver>(pluginKey, priority);
}

export function isControllerClass(controller): controller is Constructor<IController>
{
    return controller.prototype && typeof controller.prototype.handle === 'function';
}

export function isControllerInstance(controller): controller is IController
{
    return controller.__proto__ && typeof controller.__proto__.handle === 'function';
}
