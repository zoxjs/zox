import {IService} from "../ServiceContainer";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

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

    public abstract getConfig(configName: string): any;
    public abstract getGlobalConfig(): GlobalConfig;
    public abstract setConfig(configName: string, config: any): void;
}

export class ConfigService extends IConfigService
{
    private readonly basePath: string;
    private readonly useCache: boolean;
    private readonly cache: { [key:string]: any };
    private readonly warnIfMissing: boolean;

    constructor(basePath: string = 'config', useCache: boolean = true, warnIfMissing: boolean = true)
    {
        super();
        this.basePath = basePath;
        this.useCache = useCache;
        this.warnIfMissing = warnIfMissing;
        if (useCache)
        {
            this.cache = {};
        }
    }

    public getConfig(configName: string): any
    {
        if (this.useCache && configName in this.cache)
        {
            return this.cache[configName];
        }
        else
        {
            const filePath = path.join(this.basePath, configName);
            let config = loadYamlOrJsonFile(filePath);
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
        const filePath = path.join(this.basePath, configName + '.json');
        fs.writeFileSync(filePath, JSON.stringify(config));
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
