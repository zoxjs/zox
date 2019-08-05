import {Dependency, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {IncomingMessage, ServerResponse} from "http";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {IController, MaybePromise} from "../../Controller";

const serviceKey = Symbol('Controller Extensions');
const pluginKey = Symbol('Controller Extensions');

export type ControllerPreparationFunc = (request: IncomingMessage, response: ServerResponse) => MaybePromise<boolean | void>

export interface IControllerPreparationResolver
{
    resolve(): MaybePromise<ControllerPreparationFunc>;
}

export abstract class IControllerPreparationPluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract hasMiddleware(controller: IController): boolean;
    public abstract resolve(): Promise<void>;
    public abstract execMiddleware(request: IncomingMessage, response: ServerResponse): Promise<boolean | void>;
}

@Service
export class ControllerExtensionsPluginManager extends IControllerPreparationPluginManager
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private extensions: Array<ControllerPreparationFunc> = [];

    public hasMiddleware(controller: IController): boolean
    {
        return !!this.extensions.length;
    }

    public async resolve(): Promise<void>
    {
        this.extensions.length = 0;
        const pluginDefinitions: Array<PluginDefinition<Constructor<IControllerPreparationResolver> | ControllerPreparationFunc>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            if (isControllerMiddlewareClass(pluginDefinition.pluginClass))
            {
                this.extensions.push(await this.container.create(pluginDefinition.pluginClass).resolve());
            }
            else
            {
                this.extensions.push(pluginDefinition.pluginClass);
            }
        }
    }

    public async execMiddleware(request: IncomingMessage, response: ServerResponse): Promise<boolean | void>
    {
        for (const extension of this.extensions) {

            try
            {
                const res = await extension(request, response);
                if (res !== undefined)
                {
                    return true;
                }
            }
            catch (e)
            {
                console.error('Middleware error:', e);
                response.writeHead(500);
                response.end();
                return true;
            }
        }
    }
}

export function isControllerMiddlewareClass(obj): obj is Constructor<IControllerPreparationResolver>
{
    return obj.prototype && typeof obj.prototype.resolve === 'function';
}

export const ControllerMiddleware: (plugin: Constructor<IControllerPreparationResolver> | ControllerPreparationFunc) => void = PluginSetup(pluginKey);
