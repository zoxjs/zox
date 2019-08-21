import {OutgoingHttpHeaders, ServerResponse} from "http";

export interface IResponse
{
    statusCode: number;
    headers: OutgoingHttpHeaders;
    send(response: ServerResponse): void;
}

export function responseSender(statusCode: number = 200, headers?: OutgoingHttpHeaders, chunk?: any, encoding?: string)
{
    return (response: ServerResponse) =>
    {
        response.writeHead(statusCode, headers);
        response.end(chunk, encoding);
    };
}

export function addHeaders(base: OutgoingHttpHeaders, additional: OutgoingHttpHeaders): OutgoingHttpHeaders
{
    return additional && typeof additional === 'object' ? Object.assign(base, additional) : base;
}

export function empty(statusCode: number = 200, headers?: OutgoingHttpHeaders)
{
    return responseSender(statusCode, headers);
}

export function redirect(location: string, statusCode: number = 303, headers?: OutgoingHttpHeaders)
{
    return responseSender(statusCode, addHeaders({'Location': location}, headers));
}

export function text(responseString: string, statusCode: number = 200, headers?: OutgoingHttpHeaders)
{
    responseString = responseString == null ? '' : '' + responseString;
    return responseSender(statusCode, addHeaders({
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(responseString),
    }, headers), responseString);
}

export function json(json, statusCode: number = 200, headers?: OutgoingHttpHeaders)
{
    json = typeof json === 'string' ? json : JSON.stringify(json);
    return responseSender(statusCode, addHeaders({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json),
    }, headers), json);
}
