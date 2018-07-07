import {IPluginDiscovery, PluginDefinition} from "zox-plugins";
import {IService} from "../ServiceContainer";

export const serviceKey = Symbol('Plugin Discovery');

export abstract class IPluginDiscoveryService implements IService, IPluginDiscovery
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract getPlugins(pluginName: symbol): Array<PluginDefinition>;
    public abstract scan(obj: any): void;
    public abstract scanModule(moduleExports: any): void;
    public abstract scanDirectory(directory: string): Promise<void>;
    public abstract scanProject(directory: string): Promise<void>;
    public abstract scanNodeModules(directory: string): Promise<void>;
    public abstract clear(): void;
}
