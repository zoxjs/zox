import {Dependency, IService, IServiceContainer} from "../ServiceContainer";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {IPluginDiscoveryService} from "../Services/PluginDiscoveryService";

const serviceKey = Symbol('Service Plugin Manager');
const pluginKey = Symbol('Service');

export abstract class IServicePluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract registerServices(forceResolve?: boolean): void;
    public abstract forceResolveServices(): void;
}

export class ServicePluginManager extends IServicePluginManager
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    public registerServices(forceResolve?: boolean): void
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IService>>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            this.container.registerUnresolved(new pluginDefinition.pluginClass());
        }
        if (forceResolve == true)
        {
            this.forceResolveServices();
        }
    }

    public forceResolveServices()
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IService>>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            this.container.get(pluginDefinition.pluginClass.prototype.serviceKey);
        }
    }
}

export const Service = PluginSetup<IService>(pluginKey);
