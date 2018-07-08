import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {$metadata, IRenderable} from "../../Renderable/Renderable";
import {PageRegions, RenderablePage} from "../../Renderable/Layout/RenderablePage";
import {RenderableHtml} from "../../Renderable/Layout/RenderableHtml";
import {GlobalConfig, IConfigService, loadYamlOrJsonFile} from "../../Services/ConfigService";
import {RenderableRegion} from "../../Renderable/Layout/RenderableRegion";
import {IBlockPluginManager} from "../PluginManagers/BlockPluginManager";
import {RenderableBlock} from "../../Renderable/Layout/RenderableBlock";
import * as path from "path";
import {watch} from "../../Misc/FileWatch";
import {IPropertyDecoratorPluginManager} from "../PluginManagers/PropertyDecoratorPluginManager";
import {listFilesSync} from "../../Utility";

const serviceKey = Symbol('Layout');

export type SiteConfig = {
    siteName?: string
    favicon?: string
    lang?: string
}

export type BlocksConfig = {
    [region:string]: Array<string>
}

export type BlocksDataConfig = {
    directory: string
}

export type LibraryOptions = {
    scripts?: Array<{
        src?: string
        head?: boolean
        attrs?: { [attr:string]: string | null }
    }>
    styles?: Array<{
        href?: string
        attrs?: { [attr:string]: string | null }
    }>
}

export type LibraryConfig = {
    [library:string]: LibraryOptions
}

export abstract class ILayoutService implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract wrap(renderable: IRenderable): IRenderable;
}

@Service
export class LayoutService extends ILayoutService implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected config: IConfigService;

    @Dependency
    protected blockPluginManager: IBlockPluginManager;

    @Dependency
    protected propertyDecoratorPluginManager: IPropertyDecoratorPluginManager;

    private globalConfig: GlobalConfig;
    private siteConfig: SiteConfig;
    private blocksConfig: BlocksConfig;
    private blocksDataConfig: BlocksDataConfig;
    private libraryConfig: LibraryConfig;

    private blocks: { [name:string]: any } = {};

    public onResolved(): void
    {
        this.globalConfig = this.config.getGlobalConfig();
        this.siteConfig = this.config.getConfig('site');
        this.blocksConfig = this.config.getConfig('blocks');
        this.blocksDataConfig = this.config.getConfig('blocks.data');
        this.libraryConfig = this.config.getConfig('library');
        if (this.siteConfig.favicon && this.siteConfig.favicon[0] != '/')
        {
            this.siteConfig.favicon = '/' + this.siteConfig.favicon;
        }
        if (!this.siteConfig.lang)
        {
            this.siteConfig.lang = 'en';
        }
        if (this.blocksDataConfig.directory != null)
        {
            const filePaths = listFilesSync(this.blocksDataConfig.directory);
            for (const filePath of filePaths)
            {
                const blockName = path.basename(filePath, path.extname(filePath));
                this.blocks[blockName] = loadYamlOrJsonFile(filePath);
                this.propertyDecoratorPluginManager.decorateProperties(this.blocks[blockName]);
            }
            watch(this.blocksDataConfig.directory, e =>
            {
                const blockName = path.basename(e.info.filePath, path.extname(e.info.filePath));
                switch (e.event)
                {
                    case 'added':
                    case 'changed':
                        this.blocks[blockName] = loadYamlOrJsonFile(e.info.filePath);
                        this.propertyDecoratorPluginManager.decorateProperties(this.blocks[blockName]);
                        break;
                    case 'removed':
                        this.blocks[blockName] = undefined;
                        break;
                }
            }, 500);
        }
    }

    public wrap(content: IRenderable): IRenderable
    {
        if (content.type === 'html')
        {
            return content;
        }
        let page;
        if (content.type === 'page')
        {
            page = content;
        }
        else
        {
            // Load page regions
            const regions: PageRegions = {};
            for (const region in this.blocksConfig)
            {
                regions[region] = this.container.create(RenderableRegion, region);
                for (const blockName of this.blocksConfig[region])
                {
                    const blockData = this.blocks[blockName];
                    let block = this.blockPluginManager.getBlock(blockName, content, blockData);
                    if (!block)
                    {
                        block = this.container.create(RenderableBlock, blockName);
                        Object.assign(block, blockData);
                    }
                    regions[region].blocks.push(block);
                }
            }
            page = this.container.create(RenderablePage, regions);
        }

        // Load page metadata
        const html = this.container.create(RenderableHtml, page);
        html.title = content[$metadata] && content[$metadata].title ?
            content[$metadata].title + ' | ' + this.siteConfig.siteName :
            content.title ?
                content.title + ' | ' + this.siteConfig.siteName :
                this.siteConfig.siteName;
        if (this.siteConfig.favicon)
        {
            html.head += `<link rel="icon" href="${this.siteConfig.favicon}">\n`;
        }
        html.html_attributes += `lang="${this.siteConfig.lang}"`;

        const loadedLibraries = [];
        if (this.libraryConfig.global)
        {
            loadedLibraries.push('global');
            loadLibrary(html, this.libraryConfig.global);
        }
        const hasLibraries = content[$metadata] &&
            content[$metadata].libraries &&
            content[$metadata].libraries.length > 0;
        if (hasLibraries)
        {
            for (const library of content[$metadata].libraries)
            {
                if (this.libraryConfig[library] && loadedLibraries.indexOf(library) == -1)
                {
                    loadedLibraries.push(library);
                    loadLibrary(html, this.libraryConfig[library]);
                }
            }
        }
        else if (!this.libraryConfig.global && this.libraryConfig.default)
        {
            loadLibrary(html, this.libraryConfig.default);
        }

        if (content[$metadata] && content[$metadata].head)
        {
            html.head += content[$metadata].head + '\n';
        }
        if (content[$metadata] && content[$metadata].meta)
        {
            for (const meta of content[$metadata].meta)
            {
                const attrList = Object.getOwnPropertyNames(meta);
                let attrs = '';
                for (const attr of attrList)
                {
                    attrs += ` ${attr}="${meta[attr]}"`;
                }
                html.head += `<meta${attrs}>\n`;
            }
        }

        return html;
    }
}

function loadLibrary(html: RenderableHtml, library: LibraryOptions)
{
    if (library.styles)
    {
        for (const style of library.styles)
        {
            const href = style.href.includes('//') ? style.href : '/' + style.href;
            const attributes = buildAttributes(style.attrs);
            html.styles += `<link rel="stylesheet" href="${href}" ${attributes}>\n`;
        }
    }
    if (library.scripts)
    {
        for (const script of library.scripts)
        {
            const src = script.src.includes('//') ? script.src : '/' + script.src;
            const attributes = buildAttributes(script.attrs);
            const tag = `<script src="${src}" ${attributes}></script>\n`;
            if (script.head)
            {
                html.scripts_head += tag;
            }
            else
            {
                html.scripts_bottom += tag;
            }
            html.head += `<link rel="preload" href="${src}" as="script">\n`;
        }
    }
}

function buildAttributes(attributes?: { [attr:string]: string | null }): string
{
    if (!attributes)
    {
        return '';
    }
    let res = '';
    const attributeNames = Object.getOwnPropertyNames(attributes);
    for (const name of attributeNames)
    {
        if (attributes[name] != null)
        {
            res += ' ' + name + '=' + attributes[name];
        }
        else
        {
            res += ' ' + name;
        }
    }
    return res;
}
