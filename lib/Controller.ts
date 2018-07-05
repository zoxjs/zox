import {IncomingMessage} from "http";
import {IResponse} from "./Responses/IResponse";
import {ParsedUrlQuery} from "querystring";
import * as querystring from "querystring";
import {RouteParams} from "./RoutingUtility";
import {IRenderable} from "./Renderable/Renderable";
import {RenderResponse} from "./Responses/RenderResponse";
import {Dependency, IServiceContainer} from "./ServiceContainer";
import {contentTypeIsJson, getContentLength, getRequestBody} from "./RequestUtility";
import {JsonResponse} from "./Responses/JsonResponse";
import {StringResponse} from "./Responses/StringResponse";

export type MaybePromise<T> = T | Promise<T>;

export interface IController
{
    params?: RouteParams;
    query?: ParsedUrlQuery;
    handle(request: IncomingMessage): MaybePromise<IResponse>;
}

export abstract class JsonController implements IController
{
    protected maxBodySize?: number;

    public handle(request: IncomingMessage): MaybePromise<IResponse>
    {
        if (contentTypeIsJson(request) && getContentLength(request) > 0)
        {
            return getRequestBody(request, 'json', this.maxBodySize)
            .then(
                json => this.handleJson(request, json),
                reason => this.handleInvalidRequest(request, reason.toString())
            );
        }
        else
        {
            return this.handleInvalidRequest(request, 'Invalid body content.');
        }
    }

    public abstract handleJson(request: IncomingMessage, json): MaybePromise<IResponse>;

    public handleInvalidRequest(request: IncomingMessage, reason: string): MaybePromise<IResponse>
    {
        return new JsonResponse({ error: reason }, 400);
    }
}

export abstract class PageController implements IController
{
    @Dependency
    protected container: IServiceContainer;

    public handle(request: IncomingMessage): MaybePromise<IResponse>
    {
        const result = this.page(request);
        return Promise.resolve(result).then(res => this.container.create(RenderResponse, res));
    }

    public abstract page(request: IncomingMessage): MaybePromise<IRenderable>;
}

export abstract class FormController implements IController
{
    protected maxBodySize?: number;

    public handle(request: IncomingMessage): MaybePromise<IResponse>
    {
        if (request.headers['content-type'] === 'application/x-www-form-urlencoded' &&
            getContentLength(request) > 0)
        {
            return getRequestBody(request, 'string', this.maxBodySize)
            .then(
                body => this.handleForm(request, querystring.parse(body)),
                reason => this.handleInvalidForm(request, reason.toString())
            );
        }
        else
        {
            return this.handleInvalidForm(request, 'Invalid body content.');
        }
    }

    public abstract handleForm(request: IncomingMessage, form): MaybePromise<IResponse>;

    public handleInvalidForm(request: IncomingMessage, reason: string): MaybePromise<IResponse>
    {
        return new StringResponse(reason, 400);
    }
}

export abstract class FormPageController implements IController
{
    @Dependency
    protected container: IServiceContainer;

    protected maxBodySize?: number;

    public handle(request: IncomingMessage): MaybePromise<IResponse>
    {
        if (request.method === 'GET')
        {
            const result = this.page(request);
            return Promise.resolve(result).then(res => this.container.create(RenderResponse, res));
        }
        else
        {
            if (request.headers['content-type'] === 'application/x-www-form-urlencoded' &&
                getContentLength(request) > 0)
            {
                return getRequestBody(request, 'string', this.maxBodySize)
                .then(
                    body => this.page(request, querystring.parse(body)),
                    reason => this.page(request, undefined, reason.toString())
                )
                .then(res => this.container.create(RenderResponse, res));
            }
            else
            {
                const result = this.page(request, undefined, 'Invalid body content.');
                return Promise.resolve(result).then(res => this.container.create(RenderResponse, res));
            }
        }
    }

    public abstract page(request: IncomingMessage, form?, error?: string): MaybePromise<IRenderable>;
}
