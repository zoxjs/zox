import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {IWebSocketController} from "../../WebSocketController";
import {routeTokens, tryMatchRoute} from "../../RoutingUtility";
import * as url from "url";
import {UrlWithParsedQuery} from "url";
import {Constructor} from "zox-plugins";
import {IWebSocketRoutePluginManager} from "../PluginManagers/WebSocketRoutePluginManager";

const serviceKey = Symbol('Web Socket Controller Manager');

export type WebSocketControllerData = {
    handler: Constructor<IWebSocketController>
    tokens: Array<string>
};

export abstract class IWebSocketControllerManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract defaultController: Constructor<IWebSocketController>;
    public abstract getController(requestUrl: string): IWebSocketController | null;
}

@Service
export class WebSocketControllerManager extends IWebSocketControllerManager implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected routePluginManager: IWebSocketRoutePluginManager;

    private controllers: Array<WebSocketControllerData> = [];

    public defaultController: Constructor<IWebSocketController>;

    public onResolved(): void
    {
        this.controllers = this.routePluginManager.getControllersData();
    }

    public getController(requestUrl: string): IWebSocketController | null
    {
        const parsedUrl: UrlWithParsedQuery = url.parse(decodeURI(requestUrl), true);
        const tokens = routeTokens(parsedUrl.pathname);
        for (const controllerData of this.controllers)
        {
            const match = tryMatchRoute(tokens, controllerData.tokens);
            if (match !== false)
            {
                const controller = this.container.create(controllerData.handler);
                controller.query = parsedUrl.query;
                if (match !== true)
                {
                    controller.params = match;
                }
                return controller;
            }
        }
        if (this.defaultController)
        {
            const controller = this.container.create(this.defaultController);
            controller.query = parsedUrl.query;
            return controller;
        }
        return null;
    }
}
