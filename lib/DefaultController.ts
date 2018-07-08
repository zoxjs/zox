import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import {IncomingMessage} from "http";
import {IController} from "./Controller";
import {IResponse} from "./Responses/IResponse";
import {FileResponse} from "./Responses/FileResponse";
import {Dependency, IServiceContainer} from "./ServiceContainer";
import {IConfigService} from "./Services/ConfigService";
import {ServerConfig} from "./Plugins/Services/WebServer";
import {EmptyResponse} from "./Responses/EmptyResponse";
import {RenderResponse} from "./Responses/RenderResponse";

const statAsync = util.promisify(fs.stat);

export class DefaultController implements IController
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected config: IConfigService;

    public async handle(request: IncomingMessage): Promise<IResponse>
    {
        let filePath = decodeURI(request.url);
        if (filePath.startsWith('/$/'))
        {
            filePath = filePath.substring(3);
            filePath = path.join('node_modules', filePath);
            const res = await tryServeFile(request, filePath, true);
            if (res != undefined)
            {
                return res;
            }
        }
        else
        {
            const options: ServerConfig = this.config.getConfig('server');
            if (options.publicFiles != null)
            {
                const publicFiles = typeof options.publicFiles === 'string' ?
                        [options.publicFiles] :
                        options.publicFiles;
                for (const publicDir of publicFiles)
                {
                    const publicPath = path.join(publicDir, filePath);
                    const res = await tryServeFile(request, publicPath, false);
                    if (res != undefined)
                    {
                        return res;
                    }
                }
            }
        }
        console.log('Route not found', request.url);
        return this.container.create(RenderResponse, 'Not Found', 404);
    }
}

export async function tryServeFile(request: IncomingMessage, filePath: string, isNodeModule: boolean): Promise<IResponse | undefined>
{
    let isHtml = filePath.endsWith('.html') || filePath.endsWith('.htm');
    try
    {
        let stats: fs.Stats = await statAsync(filePath);
        if (!isNodeModule && stats.isDirectory())
        {
            stats = undefined;
            try
            {
                const indexPath = path.join(filePath, 'index.html');
                stats = await statAsync(indexPath);
                filePath = indexPath;
                isHtml = true;
            }
            catch (e) {}
            if (stats == undefined)
            {
                try
                {
                    const indexPath = path.join(filePath, 'index.htm');
                    stats = await statAsync(indexPath);
                    filePath = indexPath;
                    isHtml = true;
                }
                catch (e) {}
            }
        }
        if (stats != undefined && stats.isFile())
        {
            const headers = {
                'ETag': '"' + stats.ctimeMs.toString() + '"',
            };
            if (request.headers['if-none-match'] == headers.ETag)
            {
                return new EmptyResponse(304, headers);
            }
            return new FileResponse({filePath, stats}, false, 200, headers, !isHtml);
        }
    }
    catch (e) {}
}
