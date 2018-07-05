import {IResponse} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";

export class RedirectResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    public location: string;

    constructor(location: string, statusCode: number = 303, headers?: OutgoingHttpHeaders)
    {
        this.location = location;
        this.statusCode = statusCode;
        this.headers = typeof headers == 'object' ? headers : undefined;
    }

    public send(response: ServerResponse): void
    {
        response.writeHead(this.statusCode, Object.assign({
            'Location': this.location,
        }, this.headers));
        response.end();
    }
}
