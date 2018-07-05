import {IncomingMessage} from "http";

export function contentTypeIsJson(request: IncomingMessage): boolean
{
    const contentType = request.headers['content-type'];
    return contentType.indexOf('application/json') == 0 ||
        contentType.indexOf('text/json') == 0;
}

export function getContentLength(request: IncomingMessage): number
{
    if (typeof request.headers['content-length'] === 'string')
    {
        const contentLength = Number(request.headers['content-length']);
        return isNaN(contentLength) ? -1 : contentLength;
    }
    return -1;
}

export type BodyData = Buffer | string | any;

export function getRequestBody(request: IncomingMessage, parse?: 'json' | 'string', maxLength?: number): Promise<BodyData>
{
    maxLength = maxLength || (1024 * 1024);
    let length = 0;
    const bodyChunks: Array<Buffer> = [];
    return new Promise<BodyData>((resolve, reject) =>
    {
        request
        .on('data', (chunk: Buffer) =>
        {
            length += chunk.length;
            if (length > maxLength)
            {
                request.connection.destroy();
            }
            else
            {
                bodyChunks.push(chunk);
            }
        })
        .on('end', () =>
        {
            const body = Buffer.concat(bodyChunks);
            if (parse === 'json')
            {
                try
                {
                    resolve(JSON.parse(body.toString()));
                }
                catch(e)
                {
                    reject(e);
                }
            }
            else if (parse === 'string')
            {
                resolve(body.toString());
            }
            else
            {
                resolve(body);
            }
        })
        .on('error', e => reject(e));
    });
}
