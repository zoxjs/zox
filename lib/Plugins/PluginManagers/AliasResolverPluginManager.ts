import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";
import {UrlWithParsedQuery} from "url";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";

const serviceKey = Symbol('Alias Resolver Manager');
const pluginKey = Symbol('Alias Resolver Manager');

export interface IAliasResolver
{
    tryResolveAlias(url: UrlWithParsedQuery, tokens: Array<string>): string | void;
}

export abstract class IAliasResolverService implements IService, IAliasResolver
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract tryResolveAlias(url: UrlWithParsedQuery, tokens: Array<string>): string | void;
}

@Service
export class AliasResolverPluginManager extends IAliasResolverService implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private resolvers: Array<IAliasResolver> = [];

    public onResolved(): void
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IAliasResolver>>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            this.resolvers.push(this.container.create(pluginDefinition.pluginClass));
        }
    }

    public tryResolveAlias(url: UrlWithParsedQuery, tokens: Array<string>): string | undefined
    {
        for (const resolver of this.resolvers)
        {
            const res = resolver.tryResolveAlias(url, tokens);
            if (typeof res === 'string')
            {
                return res;
            }
        }
    }
}

export const AliasResolver = PluginSetup<IAliasResolver>(pluginKey);
