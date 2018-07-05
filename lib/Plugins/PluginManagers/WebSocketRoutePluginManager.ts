import {Dependency, IService} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {routeTokens} from "../../RoutingUtility";
import {WebSocketControllerData} from "../Services/WebSocketControllerManager";
import {IWebSocketController} from "../../WebSocketController";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";

const serviceKey = Symbol('Web Socket Route Manager');
const pluginKey = Symbol('web.socket.route');

export abstract class IWebSocketRoutePluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract getControllersData(): Array<WebSocketControllerData>;
}

@Service
export class WebSocketRoutePluginManager extends IWebSocketRoutePluginManager
{
    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    public getControllersData(): Array<WebSocketControllerData>
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IWebSocketController>, string>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        const plugins: Array<WebSocketControllerData> = [];
        for (const pluginDefinition of pluginDefinitions)
        {
            plugins.push({
                handler: pluginDefinition.pluginClass,
                tokens: routeTokens(pluginDefinition.data),
            });
        }
        return plugins;
    }
}

export function WebSocketRoute(route: string)
{
    return PluginSetup<IWebSocketController>(pluginKey, route);
}
