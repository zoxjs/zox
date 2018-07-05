import {IResponse} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";

export class EventStreamResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    public onClose: () => void;
    private response: ServerResponse;
    private headWritten: boolean = false;
    private dataQueue: string;

    public get connected(): boolean
    {
        return !!this.response;
    }

    constructor(statusCode: number = 200, headers?: OutgoingHttpHeaders, onClose?: () => void)
    {
        this.statusCode = statusCode;
        if (typeof headers === 'object')
        {
            this.headers = headers;
        }
        if (typeof onClose === 'function')
        {
            this.onClose = onClose;
        }
    }

    public send(response: ServerResponse): void
    {
        response.writeHead(this.statusCode, Object.assign({
            'Content-Type': 'text/event-stream',
            'Cache-Control' : 'no-cache',
            'Connection' : 'keep-alive',
        }, this.headers));
        this.headWritten = true;
        if (this.dataQueue)
        {
            this.response.write(this.dataQueue);
            this.dataQueue = undefined;
        }
        response.on('close', () =>
        {
            this.response = undefined;
            if (this.onClose)
            {
                this.onClose();
            }
        });
        this.response = response;
        this.statusCode = undefined;
        this.headers = undefined;
    }

    public sendMessage(data, event?: string): void
    {
        data = JSON.stringify(data);
        data = typeof event === 'string' ?
            'event: ' + event + '\n' + 'data: ' + data + '\n\n' :
            'data: ' + data + '\n\n';
        if (this.headWritten)
        {
            this.response.write(data);
        }
        else
        {
            this.dataQueue = this.dataQueue ? this.dataQueue + data : data;
        }
    }

    public close(): void
    {
        this.response.end();
        this.response = undefined;
    }
}
