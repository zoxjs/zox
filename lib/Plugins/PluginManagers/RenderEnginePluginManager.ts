import {Dependency, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";

const serviceKey = Symbol('Render Engine Manager');
const pluginKey = Symbol('Render Engine Manager');

export type RenderEngineInfo = {
    renderEngine: IRenderEngine
    extensions: Array<string>
}

export interface IRenderEngine
{
    compile(template: string, filename?: string): (data) => string;
}

export abstract class IRenderEnginePluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract get renderEngineInfoList(): Array<RenderEngineInfo>;
}

@Service
export class RenderEnginePluginManager extends IRenderEnginePluginManager
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private _renderEngineInfoList: Array<RenderEngineInfo>;

    public get renderEngineInfoList(): Array<RenderEngineInfo>
    {
        if (!this._renderEngineInfoList)
        {
            this._renderEngineInfoList = [];
            const pluginDefinitions: Array<PluginDefinition<Constructor<IRenderEngine>, Array<string>>>
                = this.pluginDiscovery.getPlugins(pluginKey);
            for (const pluginDefinition of pluginDefinitions)
            {
                this._renderEngineInfoList.push({
                    renderEngine: this.container.create(pluginDefinition.pluginClass),
                    extensions: pluginDefinition.data,
                });
            }
        }
        return this._renderEngineInfoList;
    }
}

export function RenderEngine(...extensions: Array<string>)
{
    return PluginSetup<IRenderEngine>(pluginKey, extensions);
}
