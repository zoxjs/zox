import {bootstrap} from "../lib";
import {IStaticExportService} from "../lib/Plugins/Services/StaticExportService";

async function start()
{
    const container = await bootstrap();
    const staticExport = container.get(IStaticExportService);
    console.log('Exporting Static Site...');
    const pages = await staticExport.getPages('/');
    await staticExport.savePages('static', pages);
    process.exit(0);
}

start().catch(err => console.error(err));
