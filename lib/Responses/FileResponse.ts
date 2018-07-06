import {IResponse} from "./IResponse";
import {OutgoingHttpHeaders, ServerResponse} from "http";
import * as path from "path";
import * as fs from "fs";
import * as mime from "mime";

export type FileWithStats = {
    filePath: string
    stats: fs.Stats
}

export class FileResponse implements IResponse
{
    public statusCode: number;
    public headers: OutgoingHttpHeaders;
    private readonly file: string | FileWithStats;
    private readonly inline: boolean;
    private readonly setContentDisposition: boolean;

    constructor(
        file: string | FileWithStats,
        inline: boolean = false,
        statusCode: number = 200,
        headers?: OutgoingHttpHeaders,
        setContentDisposition?: boolean)
    {
        this.file = file;
        this.inline = inline;
        this.statusCode = statusCode;
        this.headers = typeof headers == 'object' ? headers : undefined;
        this.setContentDisposition = setContentDisposition != false;
    }

    public send(response: ServerResponse): void
    {
        if (typeof this.file === 'string')
        {
            fs.stat(this.file, (err, stats) =>
            {
                if (err)
                {
                    console.log('File not found', this.file);
                    response.writeHead(404);
                    response.end();
                }
                else
                {
                    this.sendFile(response, {filePath: this.file as string, stats});
                }
            });
        }
        else
        {
            this.sendFile(response, this.file);
        }
    }

    private sendFile(response: ServerResponse, file: FileWithStats)
    {
        const mimeType = mime.getType(file.filePath);
        const headers = {
            'Content-Type': mimeType,
            'Content-Length': file.stats.size,
        };
        if (this.setContentDisposition)
        {
            headers['Content-Disposition'] =
                `${(this.inline ? 'inline' : 'attachment')}; filename="${path.basename(file.filePath)}"`;
        }
        response.writeHead(this.statusCode, Object.assign(headers, this.headers));
        const readStream = fs.createReadStream(file.filePath);
        readStream.pipe(response);
    }
}
