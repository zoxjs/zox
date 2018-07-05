import {IPluginSource, PluginDefinition} from "zox-plugins";
import {IService} from "../ServiceContainer";

export const serviceKey = Symbol('Plugin Discovery');

export abstract class IPluginDiscoveryService implements IService, IPluginSource
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract getPlugins(pluginName: symbol): Array<PluginDefinition>;
}
