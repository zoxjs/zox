import {IResponse} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";
import {IRenderable} from "../Renderable/Renderable";
import {Dependency} from "../ServiceContainer";
import {ILayoutService} from "../Plugins/Services/LayoutService";

export class RenderResponse implements IResponse
{
    @Dependency
    protected layoutService: ILayoutService;

    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    public renderable: IRenderable;

    constructor(renderable: IRenderable, statusCode: number = 200, headers?: OutgoingHttpHeaders)
    {
        this.renderable = renderable;
        this.statusCode = statusCode;
        this.headers = typeof headers == 'object' ? headers : undefined;
    }

    public send(response: ServerResponse): void
    {
        const renderable = this.layoutService.wrap(this.renderable);
        const html = renderable.toString();
        response.writeHead(this.statusCode, Object.assign({
            'Content-Type': 'text/html',
            'Content-Length': Buffer.byteLength(html),
        }, this.headers));
        response.end(html);
    }
}
