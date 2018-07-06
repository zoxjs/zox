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
        const options: ServerConfig = this.config.getConfig('server');
        const publicFiles = typeof options.publicFiles === 'string' ? options.publicFiles : null;

        let filePath = decodeURI(request.url);
        if (filePath.startsWith('/~/'))
        {
            filePath = filePath.substring(3);
            filePath = path.join('node_modules', filePath);
        }
        else
        {
            filePath = path.join(publicFiles, filePath);
        }

        try
        {
            let stats: fs.Stats = await statAsync(filePath);
            if (stats.isDirectory())
            {
                stats = undefined;
                try
                {
                    let stats = await statAsync(path.join(filePath, 'index.html'));
                }
                catch (e) {}
                if (stats == undefined)
                {
                    try
                    {
                        let stats = await statAsync(path.join(filePath, 'index.htm'));
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
                return new FileResponse({filePath, stats}, false, 200, headers);
            }
        }
        catch (e) {}
        console.log('Route not found', request.url);
        return this.container.create(RenderResponse, 'Not Found', 404);
    }
}
