import {IResponse} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";

export class StringResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    public responseString: string;

    constructor(responseString: string, statusCode: number = 200, headers?: OutgoingHttpHeaders)
    {
        this.responseString = responseString;
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
