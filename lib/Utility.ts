import * as fs from "fs";
import * as path from "path";

export function listFilesSync(directory: string): Array<string>
{
    let files: Array<string> = [];
    const fileList = fs.readdirSync(directory);
    for (let i = 0; i < fileList.length; ++i)
    {
        const file = path.join(directory, fileList[i]);
        try
        {
            const stat = fs.statSync(file);
            if (stat.isDirectory())
            {
                files = files.concat(listFilesSync(file));
            }
            else if (stat.isFile())
            {
                files.push(file);
            }
        }
        catch(e) {}
    }
    return files;
}

export function safeAssign(target, ...sources)
{
    for (const source of sources)
    {
        if (source != null)
        {
            const props = Object.getOwnPropertyNames(source);
            for (const key of props)
            {
                if (Object.prototype.hasOwnProperty.call(source, key))
                {
                    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
                }
            }
            const symbols = Object.getOwnPropertySymbols(source);
            for (const key of symbols)
            {
                if (Object.prototype.hasOwnProperty.call(source, key))
                {
                    Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
                }
            }
        }
    }
    return target;
}
