import "reflect-metadata";

export interface IService
{
    readonly serviceKey: symbol;
}

export type AbstractConstructor<T> = Function & { prototype: T };
export type Constructor<T, A extends any[]> = { new (...args: A): T };
export type ServiceReference<TService extends IService = any> = symbol | AbstractConstructor<TService>;

const serviceKey = Symbol('Service Container');
export const dependenciesKey = Symbol('Dependency');

export interface IOnResolved
{
    onResolved(): void;
}

export function hasOnResolved(obj): obj is IOnResolved
{
    return obj && typeof obj === 'object' && typeof obj['onResolved'] === 'function';
}

export abstract class IServiceContainer implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract register(service: IService): void;
    public abstract registerAs(key: ServiceReference<IService>, service): void;
    public abstract registerUnresolved(service: IService): void;
    public abstract registerUnresolvedAs(key: ServiceReference<IService>, service): void;
    public abstract get<TService extends IService = any>(key: ServiceReference<TService>, optional?: boolean): TService | undefined;
    public abstract resolve(target, triggerOnResolved?: boolean): void;
    public abstract create<T, A extends any[]>(targetClass: Constructor<T, A>, ...args: A): T;
}

export class ServiceContainer extends IServiceContainer
{
    private services = {};
    private unresolvedServices = {};

    constructor()
    {
        super();
        this.register(this);
    }

    public register(service: IService): void
    {
        if (this.services.hasOwnProperty(service.serviceKey))
        {
            console.warn(`Overriding service "${service.serviceKey.toString().slice(7,-1)}"`);
        }
        this.services[service.serviceKey] = service;
    }

    public registerAs(key: ServiceReference<IService>, service): void
    {
        const k: symbol = typeof key === 'symbol' ? key : key.prototype.serviceKey;
        if (this.services.hasOwnProperty(k))
        {
            console.warn(`Overriding service "${k.toString().slice(7,-1)}"`);
        }
        this.services[k] = service;
    }

    public registerUnresolved(service: IService): void
    {
        if (this.services.hasOwnProperty(service.serviceKey))
        {
            console.warn(`Service "${service.serviceKey.toString().slice(7,-1)}" is already registered`);
        }
        else
        {
            if (this.unresolvedServices.hasOwnProperty(service.serviceKey))
            {
                console.warn(`Overriding service "${service.serviceKey.toString().slice(7,-1)}"`);
            }
            this.unresolvedServices[service.serviceKey] = service;
        }
    }

    public registerUnresolvedAs(key: ServiceReference<IService>, service): void
    {
        const k: symbol = typeof key === 'symbol' ? key : key.prototype.serviceKey;
        if (this.services.hasOwnProperty(k))
        {
            console.warn(`Service "${k.toString().slice(7,-1)}" is already registered`);
        }
        else
        {
            if (this.unresolvedServices.hasOwnProperty(k))
            {
                console.warn(`Overriding service "${k.toString().slice(7,-1)}"`);
            }
            this.unresolvedServices[k] = service;
        }
    }

    public get<TService extends IService = any>(key: ServiceReference<TService>, optional?: boolean): TService | undefined
    {
        const k: symbol = typeof key === 'symbol' ? key : key.prototype.serviceKey;
        if (this.services.hasOwnProperty(k))
        {
            return this.services[k];
        }
        else if (this.unresolvedServices.hasOwnProperty(k))
        {
            this.resolve(this.unresolvedServices[k], true);
            this.services[k] = this.unresolvedServices[k];
            delete this.unresolvedServices[k];
            return this.services[k];
        }
        if (optional)
        {
            return;
        }
        throw new Error(`Service "${k.toString().slice(7,-1)}" is not registered`);
    }

    public resolve(target, triggerOnResolved: boolean = false): void
    {
        if (dependenciesKey in target)
        {
            let dependencyInfo = target[dependenciesKey];
            do
            {
                const properties = Object.getOwnPropertyNames(dependencyInfo.dependencies);
                for (const key of properties)
                {
                    target[key] = this.get(dependencyInfo.dependencies[key]);
                }
                const symbols = Object.getOwnPropertySymbols(dependencyInfo.dependencies);
                for (const key of symbols)
                {
                    target[key] = this.get(dependencyInfo.dependencies[key]);
                }
                dependencyInfo = dependencyInfo.subDependencies;
            }
            while (dependencyInfo);
        }
        if (triggerOnResolved && hasOnResolved(target))
        {
            target.onResolved();
        }
    }

    public create<T, A extends any[]>(targetClass: Constructor<T, A>, ...args: A): T
    {
        const instance = new targetClass(...args);
        this.resolve(instance);
        if (hasOnResolved(instance))
        {
            instance.onResolved();
        }
        return instance;
    }
}

export function Dependency(dependency: ServiceReference): (target: any, property: string | symbol) => void;

export function Dependency(target: any, property?: string | symbol): void;

export function Dependency(depOrTarget: ServiceReference | any, property?: string | symbol): void | any
{
    if (typeof property === 'string' || typeof property === 'symbol')
    {
        const dependency: AbstractConstructor<IService> =
            Reflect.getMetadata("design:type", depOrTarget, property);
        addDependency(dependency, depOrTarget, property);
    }
    else
    {
        return function(target, property: string)
        {
            addDependency(depOrTarget, target, property);
        }
    }
}

function addDependency(dependency: ServiceReference, target: any, property: string | symbol)
{
    // console.log(`${typeof dependency === 'symbol' ? dependency.toString().slice(7,-1) : dependency.name
    //     } required by ${target.constructor.name}`);
    if (!target.hasOwnProperty(dependenciesKey))
    {
        target[dependenciesKey] = {
            subDependencies: dependenciesKey in target ? target[dependenciesKey] : undefined,
            dependencies: {}
        };
    }
    target[dependenciesKey].dependencies[property] =
        typeof dependency === 'symbol' ? dependency : dependency.prototype.serviceKey;
}
