import {Dependency, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {IRenderable} from "../../Renderable/Renderable";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";

const serviceKey = Symbol('Block Manager');
const pluginKey = Symbol('Block Manager');

export type BlockOptions = {
    name: string
};

export abstract class IBlockPluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract get blockList(): Array<string>;
    public abstract getBlock(name: string, content: IRenderable, blockData): IRenderable | null;
}

@Service
export class BlockPluginManager extends IBlockPluginManager
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    protected get pluginDefinitions(): Array<PluginDefinition<Constructor<IRenderable>, BlockOptions>>
    {
        return this.pluginDiscovery.getPlugins(pluginKey);
    }

    public get blockList(): Array<string>
    {
        const list: Array<string> = [];
        for (const pluginDefinition of this.pluginDefinitions)
        {
            list.push(pluginDefinition.data.name);
        }
        return list;
    }

    public getBlock(name: string, content: IRenderable, blockData): IRenderable | null
    {
        for (const pluginDefinition of this.pluginDefinitions)
        {
            if (pluginDefinition.data.name == name)
            {
                return this.container.create(pluginDefinition.pluginClass, name, content, blockData);
            }
        }
        return null;
    }
}

export function Block(options: BlockOptions)
{
    return PluginSetup<IRenderable>(pluginKey, options);
}
