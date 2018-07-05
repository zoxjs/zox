import {IncomingMessage} from "http";
import * as WebSocket from "ws";
import {ParsedUrlQuery} from "querystring";
import {RouteParams} from "./RoutingUtility";

export interface IWebSocketController
{
    params?: RouteParams;
    query: ParsedUrlQuery;
    request: IncomingMessage;
    ws: WebSocket;
    validate?(request: IncomingMessage): boolean;
    handle(request: IncomingMessage, ws: WebSocket): void;
}

export abstract class WebSocketController implements IWebSocketController
{
    public params?: RouteParams;
    public query: ParsedUrlQuery;
    public request: IncomingMessage;
    public ws: WebSocket;
    public handle(request: IncomingMessage, ws: WebSocket): void
    {
        this.request = request;
        this.ws = ws;
        this.init();
        ws.on('message', this.onMessage.bind(this));
    }
    protected abstract init(): void;
    protected abstract onMessage(data: WebSocket.Data): void;
    protected queryStr(key: string): string
    {
        const val = this.query[key];
        if (typeof val !== 'undefined')
        {
            return Array.isArray(val) ? val.join() : val;
        }
        return '';
    }
    protected hasQuery(key: string): boolean
    {
        return typeof this.query[key] !== 'undefined';
    }
    protected send(data?: any)
    {
        this.ws.send(JSON.stringify(data));
    }
}
