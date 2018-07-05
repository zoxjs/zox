import * as path from "path";
import * as fs from "fs";
import * as util from "util";

const readdirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);

export type FileInfo = {
    filePath: string
    stats: fs.Stats
}

export type FileEvent = {
    event: 'changed' | 'added' | 'removed' | 'initial'
    info: FileInfo
}

export type FileEventHandler = (e: FileEvent) => void

export function watch(directory: string, handler: FileEventHandler, ms: number): NodeJS.Timer
{
    let prev: Array<FileInfo> = undefined;
    const check = () =>
    {
        listFileStatsAsync(directory).then((next: Array<FileInfo>) =>
        {
            if (prev !== undefined)
            {
                for (const pInfo of prev)
                {
                    const nInfo = next.find(nInfo => nInfo.filePath == pInfo.filePath);
                    if (nInfo)
                    {
                        if (nInfo.stats.mtimeMs != pInfo.stats.mtimeMs)
                        {
                            handler({
                                event: 'changed',
                                info: nInfo,
                            });
                        }
                    }
                    else
                    {
                        handler({
                            event: 'removed',
                            info: pInfo,
                        });
                    }
                }
                for (const nInfo of next)
                {
                    const pInfo = prev.find(pInfo => pInfo.filePath == nInfo.filePath);
                    if (!pInfo)
                    {
                        handler({
                            event: 'added',
                            info: nInfo,
                        });
                    }
                }
            }
            else
            {
                for (const nInfo of next)
                {
                    handler({
                        event: 'initial',
                        info: nInfo,
                    });
                }
            }
            prev = next;
        }, e => console.error('Error while processing file watch events:', e));
    };
    check();
    return setInterval(check, ms);
}

export async function listFileStatsAsync(directory: string): Promise<Array<FileInfo>>
{
    let files: Array<FileInfo> = [];
    const fileList: Array<string> = await readdirAsync(directory);
    for (let i = 0; i < fileList.length; ++i)
    {
        const filePath = path.join(directory, fileList[i]);
        try
        {
            const stats: fs.Stats = await statAsync(filePath);
            const info: FileInfo = {filePath, stats};
            if (stats.isDirectory())
            {
                files = files.concat(await listFileStatsAsync(filePath));
            }
            else if (stats.isFile())
            {
                files.push(info);
            }
        }
        catch(e) {}
    }
    return files;
}
