import {IResponse, responseSender} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";

export class JsonResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    private readonly json: string;

    constructor(json, statusCode: number = 200, headers?: OutgoingHttpHeaders)
    {
        this.json = typeof json === 'string' ? json : JSON.stringify(json);
        this.statusCode = statusCode;
        this.headers = typeof headers == 'object' ? headers : undefined;
    }

    public send(response: ServerResponse): void
    {
        response.writeHead(this.statusCode, Object.assign({
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(this.json),
        }, this.headers));
        response.end(this.json);
    }
}

// export function json(json, statusCode: number = 200, headers?: OutgoingHttpHeaders)
// {
//     return () => new JsonResponse(json, statusCode, headers);
// }

// export function json(json, statusCode: number = 200, headers?: OutgoingHttpHeaders)
// {
//     json = typeof json === 'string' ? json : JSON.stringify(json);
//     return (response: ServerResponse) =>
//     {
//         response.writeHead(statusCode, Object.assign({
//             'Content-Type': 'application/json',
//             'Content-Length': Buffer.byteLength(json),
//         }, headers));
//         response.end(json);
//     };
// }

export function json(json, statusCode: number = 200, headers?: OutgoingHttpHeaders)
{
    json = typeof json === 'string' ? json : JSON.stringify(json);
    return responseSender(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json),
    }, json);
}
