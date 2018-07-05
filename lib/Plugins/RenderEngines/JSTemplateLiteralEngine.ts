import {IRenderEngine, RenderEngine} from "../PluginManagers/RenderEnginePluginManager";
import {Dependency} from "../../ServiceContainer";
import {IConfigService} from "../../Services/ConfigService";

type JsHtmlConfig = {
    try_catch?: boolean
}

@RenderEngine('js.html')
export class JSTemplateLiteralEngine implements IRenderEngine
{
    @Dependency
    protected config: IConfigService;

    private tryCatch: boolean;

    public onResolved(): void
    {
        const options: JsHtmlConfig = this.config.getConfig('js.html');
        this.tryCatch = !!options.try_catch;
    }

    public compile(template: string, filename: string): (data) => string
    {
        try
        {
            let func = `return this\`${template}\``;
            if (this.tryCatch)
            {
                func = `try{${func}}catch(e){console.error(String.raw\` Template: ${filename}\` + '\\n', e);return '';}`;
            }
            return new Function('_', func).bind(processTemplate);
        }
        catch (e)
        {
            console.error(` Template: ${filename}\n`, e);
            return () => '';
        }
    }
}

const processTemplate = (strings: Array<string>, ...args): string =>
{
    let res = '';
    for (let i = 0; i < strings.length; ++i)
    {
        if (i > 0)
        {
            const arg = args[i - 1];
            if (arg !== undefined && arg !== null)
            {
                res += arg;
            }
        }
        res += strings[i];
    }
    return res;
};
