import {Dependency, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {IncomingMessage, ServerResponse} from "http";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {MaybePromise} from "../../Controller";

const serviceKey = Symbol('Middleware');
const pluginKey = Symbol('Middleware');

export type MiddlewareFunc = (request: IncomingMessage, response: ServerResponse) => MaybePromise<boolean | void>

export interface IMiddlewareResolver
{
    resolve(): MaybePromise<MiddlewareFunc>;
}

export abstract class IMiddlewarePluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract get hasMiddleware(): boolean;
    public abstract resolve(): Promise<void>;
    public abstract execMiddleware(request: IncomingMessage, response: ServerResponse): Promise<boolean | void>;
}

@Service
export class MiddlewarePluginManager extends IMiddlewarePluginManager
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private middleware: Array<MiddlewareFunc> = [];

    public get hasMiddleware(): boolean
    {
        return !!this.middleware.length;
    }

    public async resolve(): Promise<void>
    {
        this.middleware.length = 0;
        const pluginDefinitions: Array<PluginDefinition<Constructor<IMiddlewareResolver> | MiddlewareFunc>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            if (isMiddlewareClass(pluginDefinition.pluginClass))
            {
                this.middleware.push(await this.container.create(pluginDefinition.pluginClass).resolve());
            }
            else
            {
                this.middleware.push(pluginDefinition.pluginClass);
            }
        }
    }

    public async execMiddleware(request: IncomingMessage, response: ServerResponse): Promise<boolean | void>
    {
        for (const middleware of this.middleware)
        {
            try
            {
                const res = await middleware(request, response);
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

export function isMiddlewareClass(obj): obj is Constructor<IMiddlewareResolver>
{
    return obj.prototype && typeof obj.prototype.resolve === 'function';
}

export const Middleware: (plugin: Constructor<IMiddlewareResolver> | MiddlewareFunc) => void = PluginSetup(pluginKey);
