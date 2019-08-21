import {addHeaders, IResponse, responseSender} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";

export class StringResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    public responseString: string;

    constructor(responseString: string, statusCode: number = 200, headers?: OutgoingHttpHeaders)
    {
        this.responseString = responseString == null ? '' : '' + responseString;
        this.statusCode = statusCode;
        this.headers = typeof headers == 'object' ? headers : undefined;
    }

    public send(response: ServerResponse): void
    {
        response.writeHead(this.statusCode, Object.assign({
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(this.responseString),
        }, this.headers));
        response.end(this.responseString);
    }
}

// export function text(responseString: string, statusCode: number = 200, headers?: OutgoingHttpHeaders)
// {
//     return () => new StringResponse(responseString, statusCode, headers);
// }

// export function text(responseString: string, statusCode: number = 200, headers?: OutgoingHttpHeaders)
// {
//     responseString = responseString == null ? '' : '' + responseString;
//     return (response: ServerResponse) =>
//     {
//         response.writeHead(statusCode, Object.assign({
//             'Content-Type': 'text/plain',
//             'Content-Length': Buffer.byteLength(responseString),
//         }, headers));
//         response.end(responseString);
//     };
// }

export function text(responseString: string, statusCode: number = 200, headers?: OutgoingHttpHeaders)
{
    responseString = responseString == null ? '' : '' + responseString;
    return responseSender(statusCode, addHeaders({
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(responseString),
    }, headers), responseString);
}
