import * as http from "http";
import * as path from "path";
import * as WebSocket from "ws";
import {Socket} from "net";
import {Constructor, PluginDiscovery} from "zox-plugins";
import {IPluginDiscoveryService} from "./Services/PluginDiscoveryService";
import {IServiceContainer, ServiceContainer} from "./ServiceContainer";
import {ServicePluginManager} from "./PluginManagers/ServicePluginManager";
import {IWebServer} from "./Plugins/Services/WebServer";
import {IControllerResolverPluginManager} from "./Plugins/PluginManagers/ControllerResolverPluginManager";
import {DefaultController} from "./DefaultController";
import {IWebSocketControllerManager} from "./Plugins/Services/WebSocketControllerManager";
import {ConfigService} from "./Services/ConfigService";
import {IController} from "./Controller";

export type BootstrapOptions = {
    log?: boolean
    config?: {
        defaultsPath?: string
        overridesPath?: string
        useCache?: boolean
        warnIfMissing?: boolean
    }
    node_modules?: boolean
    staticPages?: boolean
    graphql?: boolean
    projectPlugins?: boolean
    forceResolve?: boolean
    defaultController?: Constructor<IController>
}

export async function bootstrap(options?: BootstrapOptions): Promise<ServiceContainer>
{
    options = options || {};
    options.log = options.log !== false;
    if (options.defaultController === undefined)
    {
        options.defaultController = DefaultController;
    }

    if (options.log) console.log('Loading Plugins...');

    const pluginDiscovery = new PluginDiscovery();

    const relativeToCwd = path.relative(process.cwd(), __dirname);

    if (options.node_modules)
    {
        await pluginDiscovery.scanNodeModules();
    }
    else
    {
        await pluginDiscovery.scanProject(path.join(relativeToCwd, '..'));
    }

    if (options.staticPages)
    {
        await pluginDiscovery.scanDirectory(path.join(relativeToCwd, 'OptionalPlugins/StaticPages'));
    }

    if (options.graphql)
    {
        await pluginDiscovery.scanDirectory(path.join(relativeToCwd, 'OptionalPlugins/GraphQL'));
    }

    if (options.projectPlugins)
    {
        await pluginDiscovery.scanProject();
    }

    const container = new ServiceContainer();
    container.registerAs(IPluginDiscoveryService, pluginDiscovery);

    if (options.log) console.log('Initializing...');

    container.registerUnresolved(new ConfigService(options.config));

    container.create(ServicePluginManager).registerServices(options.forceResolve !== false);

    container.get(IControllerResolverPluginManager).defaultController = options.defaultController;

    return container;
}

export function startServer(container: IServiceContainer, port: number = 8080): http.Server
{
    const server = http.createServer();
    setupRequestHandler(server, container.get(IWebServer));
    setupWebSocketHandler(server, container.get(IWebSocketControllerManager));
    server.listen(port);
    return server;
}

export function startWebServer(container: IServiceContainer, port: number = 8080): http.Server
{
    const server = http.createServer();
    setupRequestHandler(server, container.get(IWebServer));
    server.listen(port);
    return server;
}

export function startWebSocketServer(container: IServiceContainer, port: number = 8080): http.Server
{
    const server = http.createServer();
    setupWebSocketHandler(server, container.get(IWebSocketControllerManager));
    server.listen(port);
    return server;
}

export function setupRequestHandler(server: http.Server, webServer: IWebServer): void
{
    server.on('request', webServer.handleRequestBound);
}

export function setupWebSocketHandler(
    server: http.Server,
    webSocketControllerManager: IWebSocketControllerManager
): WebSocket.Server
{
    const wsServer = new WebSocket.Server({
        noServer: true,
        perMessageDeflate: false,
    });
    server.on('upgrade', (request: http.IncomingMessage, socket: Socket, head: Buffer) =>
    {
        if (request.headers.upgrade === 'websocket')
        {
            const controller = webSocketControllerManager.getController(request.url);
            if (controller && (!controller.validate || controller.validate(request)))
            {
                wsServer.handleUpgrade(request, socket, head, (ws: WebSocket) =>
                {
                    controller.handle(request, ws);
                });
            }
            else
            {
                socket.end();
            }
        }
        else
        {
            socket.end();
        }
    });
    return wsServer;
}
