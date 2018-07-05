import {Dependency, IOnResolved, IService} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {listFilesSync} from "../../Utility";
import * as path from "path";
import * as fs from "fs";
import {IConfigService} from "../../Services/ConfigService";
import {IRenderEngine, IRenderEnginePluginManager, RenderEngineInfo} from "../PluginManagers/RenderEnginePluginManager";
import {watch} from "../../Misc/FileWatch";

const serviceKey = Symbol('Render');

type ResolvedTemplate = {
    templateFile: string
    renderEngine: IRenderEngine
}

type RenderConfig = {
    directory?: string
}

export abstract class IRenderService implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract render(templateCandidates: Array<string>, data): string;
}

@Service
export class RenderService extends IRenderService implements IOnResolved
{
    @Dependency
    protected config: IConfigService;

    @Dependency
    protected renderEnginePluginManager: IRenderEnginePluginManager;

    private renderEngineInfoList: Array<RenderEngineInfo>;
    private directory: string;
    private compileCache: { [templateFile:string]: (data) => string } = {};
    private templateListCache: Array<string>;
    private debug: boolean;

    public onResolved(): void
    {
        const globalConfig = this.config.getGlobalConfig();
        const config: RenderConfig = this.config.getConfig('render');
        this.directory = typeof config.directory === 'string' ? config.directory : 'templates';
        this.debug = globalConfig.debug;
        if (globalConfig.watch)
        {
            watch(this.directory, (e) => {
                switch (e.event)
                {
                    case 'added':
                        this.templateListCache = undefined;
                        break;
                    case 'changed':
                        this.compileCache[e.info.filePath] = undefined;
                        break;
                    case 'removed':
                        this.templateListCache = undefined;
                        this.compileCache[e.info.filePath] = undefined;
                        break;
                }
            }, 500);
        }
        this.renderEngineInfoList = this.renderEnginePluginManager.renderEngineInfoList;
    }

    public render(templateCandidates: Array<string>, data): string
    {
        const resolvedTemplate = this.resolveTemplate(templateCandidates);
        let result: string;
        let candidatesDebug: string;
        if (this.debug)
        {
            candidatesDebug = templateCandidates.map(candidate => `\n * ${candidate}`).join('');
            candidatesDebug = '<!-- Candidates: ' + candidatesDebug + ' -->';
        }
        if (resolvedTemplate)
        {
            let template;
            if (this.compileCache[resolvedTemplate.templateFile])
            {
                template = this.compileCache[resolvedTemplate.templateFile];
            }
            else
            {
                try
                {
                    const templateString = fs.readFileSync(resolvedTemplate.templateFile, 'utf8');
                    template = resolvedTemplate.renderEngine.compile(templateString, resolvedTemplate.templateFile);
                    this.compileCache[resolvedTemplate.templateFile] = template;
                }
                catch (e)
                {
                    console.error('Failed to load template:', resolvedTemplate.templateFile, '\n', e.toString());
                    return '';
                }
            }
            result = template(data);
            if (this.debug)
            {
                const sourceDebug = `\n<!-- OUTPUT FROM: ${resolvedTemplate.templateFile} -->\n`;
                result = candidatesDebug + sourceDebug + result + `\n<!-- END FROM: ${resolvedTemplate.templateFile} -->`;
            }
        }
        else
        {
            if (this.debug)
            {
                result = candidatesDebug + '\n<!-- NO TEMPLATE FOUND -->';
            }
            else
            {
                result = '';
            }
        }
        return result;
    }

    private resolveTemplate(candidates: Array<string>): ResolvedTemplate | false
    {
        if (!this.templateListCache)
        {
            this.templateListCache = listFilesSync(this.directory);
        }
        for (let c = candidates.length - 1; c >= 0; --c)
        {
            const candidate = candidates[c];
            for (const template of this.templateListCache)
            {
                const basename = path.basename(template);
                if (basename.startsWith(candidate))
                {
                    const templateExt = basename.slice(candidate.length + 1);
                    for (const renderEngineInfo of this.renderEngineInfoList)
                    {
                        if (renderEngineInfo.extensions.indexOf(templateExt) >= 0)
                        {
                            return {
                                templateFile: template,
                                renderEngine: renderEngineInfo.renderEngine,
                            };
                        }
                    }
                }
            }
        }
        return false;
    }
}
