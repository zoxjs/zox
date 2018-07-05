import {bootstrap, startServer} from "../lib";

bootstrap().then(container =>
{
    startServer(container);
    console.log('Started');
});
