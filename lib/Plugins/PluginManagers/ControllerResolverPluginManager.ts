import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {IController} from "../../Controller";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import * as url from "url";
import {UrlWithParsedQuery} from "url";
import {routeTokens} from "../../RoutingUtility";
import {IAliasResolverService} from "./AliasResolverPluginManager";

const serviceKey = Symbol('Controller Resolver');
const pluginKey = Symbol('Controller Resolver');

export interface IControllerResolver
{
    tryResolveController(method: string, parsedUrl: UrlWithParsedQuery, tokens: Array<string>): IController | void;
}

export abstract class IControllerResolverPluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract defaultController: Constructor<IController>;
    public abstract tryResolveController(method: string, requestUrl: string): IController | void;
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

    public defaultController: Constructor<IController>;

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

    public tryResolveController(method: string, requestUrl: string): IController | void
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
            const controller = this.container.create(this.defaultController);
            controller.query = parsedUrl.query;
            return controller;
        }
    }
}

export function ControllerResolver(priority: number)
{
    return PluginSetup<IControllerResolver>(pluginKey, priority);
}
