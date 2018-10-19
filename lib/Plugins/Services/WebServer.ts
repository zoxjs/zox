import {IncomingMessage, ServerResponse} from "http";
import {Dependency, IOnResolved, IService} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {StringResponse} from "../../Responses/StringResponse";
import {IConfigService} from "../../Services/ConfigService";
import {IControllerResolverPluginManager, isControllerInstance} from "../PluginManagers/ControllerResolverPluginManager";

const serviceKey = Symbol('WebServer');

export type ServerConfig = {
    publicFiles?: string | Array<string>
    trustedHosts?: Array<string>
}

export abstract class IWebServer implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract get handleRequestBound(): (request: IncomingMessage, response: ServerResponse) => void;
    public abstract handleRequest(request: IncomingMessage, response: ServerResponse): void;
}

@Service
export class WebServer extends IWebServer implements IOnResolved
{
    @Dependency
    protected controllerResolverPluginManager: IControllerResolverPluginManager;

    @Dependency
    protected config: IConfigService;

    private trustedHosts: Array<string>;

    public onResolved(): void
    {
        const options: ServerConfig = this.config.getConfig('server');
        this.trustedHosts = options.trustedHosts;
    }

    public get handleRequestBound(): (request: IncomingMessage, response: ServerResponse) => void
    {
        return this.handleRequest.bind(this);
    }

    public handleRequest(request: IncomingMessage, response: ServerResponse): void
    {
        if (this.trustedHosts && this.trustedHosts.indexOf(request.headers.host) < 0)
        {
            console.warn('Untrusted host:', request.headers.host);
            response.writeHead(500);
            response.end();
            return;
        }
        const controller = this.controllerResolverPluginManager.tryResolveController(request.method, request.url);
        if (controller)
        {
            let result;
            try
            {
                result = isControllerInstance(controller) ?
                    controller.handle(request) :
                    controller(request);
            }
            catch (e)
            {
                console.error('Controller error:', e);
                response.writeHead(500);
                response.end();
                return;
            }
            Promise.resolve(result)
            .then(res => {
                res.send(response);
            }, e =>
            {
                console.error('Controller error:', e);
                response.writeHead(500);
                response.end();
            }).catch(e =>
            {
                console.error('Failed to send a response:', e);
                response.writeHead(500);
                response.end();
            });
        }
        else
        {
            console.log('Route not found', request.url);
            new StringResponse('Not Found', 404).send(response);
        }
    }
}
