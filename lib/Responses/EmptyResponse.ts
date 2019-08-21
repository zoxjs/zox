import {IResponse, responseSender} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";

export class EmptyResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;

    constructor(statusCode: number = 200, headers?: OutgoingHttpHeaders)
    {
        this.statusCode = statusCode;
        this.headers = typeof headers == 'object' ? headers : undefined;
    }

    public send(response: ServerResponse): void
    {
        response.writeHead(this.statusCode, this.headers);
        response.end();
    }
}

// export function empty(statusCode: number = 200, headers?: OutgoingHttpHeaders)
// {
//     return () => new EmptyResponse(statusCode, headers);
// }

// export function empty(statusCode: number = 200, headers?: OutgoingHttpHeaders)
// {
//     return (response: ServerResponse) =>
//     {
//         response.writeHead(statusCode, headers);
//         response.end();
//     };
// }

export function empty(statusCode: number = 200, headers?: OutgoingHttpHeaders)
{
    return responseSender(statusCode, headers);
}
