import {OutgoingHttpHeaders, ServerResponse} from "http";

export interface IResponse
{
    statusCode: number;
    headers: OutgoingHttpHeaders;
    send(response: ServerResponse): void;
}
