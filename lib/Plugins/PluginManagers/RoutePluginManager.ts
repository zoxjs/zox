import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {ControllerResolver, IControllerResolver} from "./ControllerResolverPluginManager";
import {routeTokens, tryMatchRoute} from "../../RoutingUtility";
import {IController} from "../../Controller";
import {UrlWithParsedQuery} from "url";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {Dependency, IOnResolved, IServiceContainer} from "../../ServiceContainer";

const pluginKey = Symbol('route');

export type RouteOptions = {
    route: string
    method?:
        'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' |
        'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
};

export type ControllerData = {
    controllerClass: Constructor<IController>
    tokens: Array<string>
    method: string
};

@ControllerResolver(0)
export class RoutePluginManager implements IControllerResolver, IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private controllers: Array<ControllerData> = [];

    public onResolved(): void
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IController>, RouteOptions>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            this.controllers.push({
                controllerClass: pluginDefinition.pluginClass,
                tokens: routeTokens(pluginDefinition.data.route),
                method: pluginDefinition.data.method.toUpperCase(),
            });
        }
    }

    public tryResolveController(method: string, parsedUrl: UrlWithParsedQuery, tokens: Array<string>): IController | void
    {
        for (const controllerData of this.controllers)
        {
            if (controllerData.method === method)
            {
                const match = tryMatchRoute(tokens, controllerData.tokens);
                if (match !== false)
                {
                    const controller = this.container.create(controllerData.controllerClass);
                    controller.query = parsedUrl.query;
                    if (match !== true)
                    {
                        controller.params = match;
                    }
                    return controller;
                }
            }
        }
    }
}

export function Route(options: RouteOptions)
{
    if (!options.method)
    {
        options.method = 'GET';
    }
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].indexOf(options.method.toUpperCase()) < 0)
    {
        console.trace('Potentially invalid http method: ' + options.method);
    }
    return PluginSetup<IController>(pluginKey, options);
}
