import {IService} from "../ServiceContainer";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export type ConfigOptions = {
    defaultsPath?: string
    overridesPath?: string
    useCache?: boolean
    warnIfMissing?: boolean
}

export type GlobalConfig = {
    cache: boolean
    watch: boolean
    debug: boolean
}

const serviceKey = Symbol('Config');

export abstract class IConfigService implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract getConfig(configName: string, invalidateCache?: boolean): any;
    public abstract getGlobalConfig(): GlobalConfig;
    public abstract setConfig(configName: string, config: any): void;
}

export class ConfigService implements IConfigService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    private readonly defaultsPath: string;
    private readonly overridesPath: string;
    private readonly useCache: boolean;
    private readonly cache: { [key:string]: any };
    private readonly warnIfMissing: boolean;

    constructor(options?: ConfigOptions)
    {
        options = options || {};
        this.defaultsPath = options.defaultsPath || 'config';
        this.overridesPath = options.overridesPath;
        this.useCache = options.useCache !== false;
        this.warnIfMissing = options.warnIfMissing !== false;
        if (this.useCache)
        {
            this.cache = {};
        }
    }

    public getConfig(configName: string, invalidateCache?: boolean): any
    {
        if (!invalidateCache && this.useCache && configName in this.cache)
        {
            return this.cache[configName];
        }
        else
        {
            let config = undefined;
            if (this.overridesPath)
            {
                config = loadYamlOrJsonFile(path.join(this.overridesPath, configName));
            }
            if (config === undefined)
            {
                config = loadYamlOrJsonFile(path.join(this.defaultsPath, configName));
            }
            if (config === undefined)
            {
                if (this.warnIfMissing)
                {
                    console.warn('Config file does not exist:', configName);
                }
                config = {};
            }
            if (this.useCache)
            {
                this.cache[configName] = config;
            }
            return config;
        }
    }

    public setConfig(configName: string, config: any): void
    {
        const filePath = path.join(this.overridesPath || this.defaultsPath, configName);
        if (fs.existsSync(filePath + '.json'))
        {
            fs.writeFileSync(filePath + '.json', JSON.stringify(config));
        }
        else if (fs.existsSync(filePath + '.yml'))
        {
            fs.writeFileSync(filePath + '.yml', yaml.safeDump(config));
        }
        else
        {
            fs.writeFileSync(filePath + '.yaml', yaml.safeDump(config));
        }
        if (this.useCache)
        {
            this.cache[configName] = config;
        }
    }

    public getGlobalConfig(): GlobalConfig
    {
        const config: GlobalConfig = this.getConfig('global');
        if (config.cache === undefined)
        {
            config.cache = true;
        }
        if (config.watch === undefined)
        {
            config.watch = false;
        }
        if (config.debug === undefined)
        {
            config.debug = false;
        }
        return config;
    }
}

export function loadYamlOrJsonFile(filePath: string): any
{
    for (const ext of ['.yaml', '.yml'])
    {
        try
        {
            const thisPath = filePath.endsWith(ext) ? filePath : filePath + ext;
            const file = fs.readFileSync(thisPath, 'utf8');
            try
            {
                return yaml.safeLoad(file);
            }
            catch(e)
            {
                console.warn('Failed to parse yaml file:', filePath, '\n', e.toString());
            }
        }
        catch(e) {}
    }
    try
    {
        const thisPath = filePath.endsWith('.json') ? filePath : filePath + '.json';
        const file = fs.readFileSync(thisPath, 'utf8');
        try
        {
            return JSON.parse(file);
        }
        catch(e)
        {
            console.warn('Failed to parse json file:', filePath, '\n', e.toString());
        }
    }
    catch(e) {}
}
