import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {Constructor, PluginDefinition, PluginSetup} from "zox-plugins";

const serviceKey = Symbol('Property Decorator');
const pluginKey = Symbol('Property Decorator');

export interface IPropertyDecorator
{
    decorate(property);
}

export abstract class IPropertyDecoratorPluginManager implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract decorateProperties(obj): void;
}

@Service
export class PropertyDecoratorPluginManager extends IPropertyDecoratorPluginManager implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    private decorators: { [decorator:string]: IPropertyDecorator } = {};

    public onResolved(): void
    {
        const pluginDefinitions: Array<PluginDefinition<Constructor<IPropertyDecorator>, string>>
            = this.pluginDiscovery.getPlugins(pluginKey);
        for (const pluginDefinition of pluginDefinitions)
        {
            this.decorators[pluginDefinition.data] = this.container.create(pluginDefinition.pluginClass);
        }
    }

    public decorateProperties(obj): void
    {
        const keys = Object.keys(obj);
        for (const key of keys)
        {
            let property = obj[key];
            if (key.includes('.'))
            {
                const parts = key.split('.');
                const resultKey = parts[0];
                if (keys.indexOf(resultKey) == -1)
                {
                    for (let i = 1; i < parts.length; ++i)
                    {
                        const decorator = parts[i];
                        if (decorator in this.decorators)
                        {
                            property = this.decorators[decorator].decorate(property);
                        }
                        else
                        {
                            console.warn('Unknown property decorator:', decorator);
                        }
                    }
                    obj[resultKey] = property;
                    obj[key] = undefined;
                }
            }
            if (property != null && typeof property == 'object')
            {
                this.decorateProperties(property);
            }
        }
    }
}

export function PropertyDecorator(decorator: string)
{
    return PluginSetup<IPropertyDecorator>(pluginKey, decorator);
}
