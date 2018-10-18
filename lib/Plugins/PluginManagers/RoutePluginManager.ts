import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {ControllerResolver, IControllerResolver} from "./ControllerResolverPluginManager";
import {routeTokens, tryMatchRoute} from "../../RoutingUtility";
import {IController} from "../../Controller";
import {UrlWithParsedQuery} from "url";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {Dependency, IOnResolved, IServiceContainer} from "../../ServiceContainer";

const pluginKey = Symbol('route');

export type MethodNames =
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ANY' |
    'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'any' | '*'

export type RouteOptions = {
    method?: MethodNames
    route: string | RegExp
};

type ControllerData = {
    controllerClass: Constructor<IController>
    method: MethodNames
};

type ControllerDataTokens = ControllerData & {
    tokens: Array<string>
};

type ControllerDataRegExp = ControllerData & {
    regexp?: RegExp
};

@ControllerResolver(0)
export class RoutePluginManager implements IControllerResolver, IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private controllersByTokens: Array<ControllerDataTokens> = [];
    private controllersByRegExp: Array<ControllerDataRegExp> = [];

    public onResolved(): void
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IController>, RouteOptions>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            if (typeof pluginDefinition.data.route === 'string')
            {
                this.controllersByTokens.push({
                    controllerClass: pluginDefinition.pluginClass,
                    method: pluginDefinition.data.method,
                    tokens: routeTokens(pluginDefinition.data.route),
                });
            }
            else
            {
                this.controllersByRegExp.push({
                    controllerClass: pluginDefinition.pluginClass,
                    method: pluginDefinition.data.method,
                    regexp: pluginDefinition.data.route,
                });
            }
        }
    }

    public tryResolveController(method: string, parsedUrl: UrlWithParsedQuery, tokens: Array<string>): IController | void
    {
        for (const controllerData of this.controllersByTokens)
        {
            if (controllerData.method === method || controllerData.method === 'ANY')
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
        for (const controllerData of this.controllersByRegExp)
        {
            if (controllerData.method === method || controllerData.method === 'ANY')
            {
                if (controllerData.regexp.test(parsedUrl.pathname))
                {
                    const controller = this.container.create(controllerData.controllerClass);
                    controller.query = parsedUrl.query;
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
    if (options.method === '*')
    {
        options.method = 'ANY';
    }
    const upperCaseMethod: any = options.method.toUpperCase();
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'].indexOf(upperCaseMethod) < 0)
    {
        console.trace('Potentially invalid http method: ' + options.method);
    }
    options.method = upperCaseMethod;
    return PluginSetup<IController>(pluginKey, options);
}

export function Get(route: string | RegExp) { return Route({ method: 'GET', route }); }
export function Post(route: string | RegExp) { return Route({ method: 'POST', route }); }
export function Put(route: string | RegExp) { return Route({ method: 'PUT', route }); }
export function Patch(route: string | RegExp) { return Route({ method: 'PATCH', route }); }
export function Delete(route: string | RegExp) { return Route({ method: 'DELETE', route }); }
export function Head(route: string | RegExp) { return Route({ method: 'HEAD', route }); }
export function Options(route: string | RegExp) { return Route({ method: 'OPTIONS', route }); }
export function AnyMethod(route: string | RegExp) { return Route({ method: 'ANY', route }); }
