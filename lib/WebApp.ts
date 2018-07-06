import {Dependency, IService, ServiceContainer} from "./ServiceContainer";
import {PluginDiscovery} from "zox-plugins";
import {IPluginDiscoveryService} from "./Services/PluginDiscoveryService";
import {BootstrapOptions} from "./index";
import {ConfigService} from "./Services/ConfigService";
import {IAliasResolverService} from "./Plugins/PluginManagers/AliasResolverPluginManager";
import {UrlWithParsedQuery} from "url";
import {Route, RoutePluginManager} from "./Plugins/PluginManagers/RoutePluginManager";
import {IController, MaybePromise} from "./Controller";
import {IResponse} from "./Responses/IResponse";
import * as http from "http";
import {IncomingMessage} from "http";
import {ServicePluginManager} from "./PluginManagers/ServicePluginManager";
import {ControllerResolverPluginManager} from "./Plugins/PluginManagers/ControllerResolverPluginManager";
import {IWebServer, WebServer} from "./Plugins/Services/WebServer";

export type RouteHandlerContext = {
    container: ServiceContainer
} & IController
export type RouteHandler = (this: RouteHandlerContext, request: IncomingMessage) => MaybePromise<IResponse>

export class WebApp
{
    private readonly options: BootstrapOptions;
    private readonly container: ServiceContainer;
    private readonly pluginDiscovery: PluginDiscovery;

    constructor(options?: BootstrapOptions)
    {
        this.options = options || {};
        this.container = new ServiceContainer();
        this.pluginDiscovery = new PluginDiscovery();
        this.container.registerAs(IPluginDiscoveryService, this.pluginDiscovery);
    }

    public registerService(service: IService)
    {
        this.container.registerUnresolved(service);
    }

    public use(pluginClass: any)
    {
        this.pluginDiscovery.scan(pluginClass);
    }

    public listen(port: number)
    {
        this.container.registerUnresolved(new ConfigService(this.options.config));
        this.container.registerUnresolved(new NoAliasResolverService());
        this.pluginDiscovery.scan(RoutePluginManager);
        this.pluginDiscovery.scan(ControllerResolverPluginManager);
        this.pluginDiscovery.scan(WebServer);
        this.container.create(ServicePluginManager).registerServices();

        const server = http.createServer();
        server.on('request', this.container.get(IWebServer).handleRequestBound);
        server.listen(port);
    }

    public get(route: string, handler: RouteHandler): void
    {
        const controller = controllerWrapperFactory(handler);
        Route({ method: 'GET', route })(controller);
        this.pluginDiscovery.scan(controller);
    }

    public post(route: string, handler: RouteHandler): void
    {
        const controller = controllerWrapperFactory(handler);
        Route({ method: 'POST', route })(controller);
        this.pluginDiscovery.scan(controller);
    }

    public put(route: string, handler: RouteHandler): void
    {
        const controller = controllerWrapperFactory(handler);
        Route({ method: 'PUT', route })(controller);
        this.pluginDiscovery.scan(controller);
    }

    public delete(route: string, handler: RouteHandler): void
    {
        const controller = controllerWrapperFactory(handler);
        Route({ method: 'DELETE', route })(controller);
        this.pluginDiscovery.scan(controller);
    }
}

class NoAliasResolverService extends IAliasResolverService
{
    public tryResolveAlias(url: UrlWithParsedQuery, tokens: Array<string>): void {}
}

export function webapp(options?: BootstrapOptions): WebApp
{
    return new WebApp(options);
}

function controllerWrapperFactory(handler: (this: IController, request: IncomingMessage) => MaybePromise<IResponse>)
{
    const controllerWrapper = class ControllerWrapper implements IController
    {
        public handle(request: IncomingMessage): MaybePromise<IResponse>
        {
            throw new Error('Handler undefined');
        }
    };
    controllerWrapper.prototype.handle = handler;
    Dependency(ServiceContainer)(controllerWrapper.prototype, 'container');
    return controllerWrapper;
}
