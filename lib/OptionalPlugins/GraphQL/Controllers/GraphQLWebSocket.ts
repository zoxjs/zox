import {Dependency} from "../../../ServiceContainer";
import {WebSocketController} from "../../../WebSocketController";
import {WebSocketRoute} from "../../../Plugins/PluginManagers/WebSocketRoutePluginManager";
import {IGraphQLService} from "../GraphQLService";
import * as WebSocket from "ws";
import {parse} from "graphql";

type GraphQLWebSocketRequest = {
    id: string | number
    type: 'query' | 'queryId' | 'sub' | 'subId' | 'subCancel'
    query: string
    operation?: string
    variables?: any
}

type ActiveSubscription = {
    id: number | string
    ct: () => void
}

@WebSocketRoute('/graphql')
export class GraphQLWebSocket extends WebSocketController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    private subs: Array<ActiveSubscription> = [];

    protected init(): void
    {
        console.log('GraphQL start web socket');
    }

    protected onMessage(data: WebSocket.Data): void
    {
        if (typeof data !== 'string')
        {
            data = data.toString();
        }
        const req: GraphQLWebSocketRequest = JSON.parse(data);
        switch(req.type)
        {
            case 'sub':
                let cancellationToken: () => void;
                this.graphQLService.subscribe({
                    document: parse(req.query),
                    variableValues: req.variables,
                    contextValue: this.graphQLService.getContext(this.request),
                }, e =>
                {
                    if (this.ws.readyState === WebSocket.OPEN)
                    {
                        e.id = req.id;
                        this.send(e);
                    }
                    else if (this.ws.readyState !== WebSocket.CONNECTING)
                    {
                        cancellationToken();
                    }
                }).then(
                    ct => {
                        cancellationToken = ct;
                        this.subs.push({ id: req.id, ct: ct });
                    },
                    console.warn);
                break;
            case 'subId':
                if (this.graphQLService.hasQuery(req.query))
                {
                    let cancellationToken: () => void;
                    this.graphQLService.subscribe({
                        queryId: req.query,
                        operationName: req.operation,
                        variableValues: req.variables,
                        contextValue: this.graphQLService.getContext(this.request),
                    }, e =>
                    {
                        if (this.ws.readyState === WebSocket.OPEN)
                        {
                            e.id = req.id;
                            this.send(e);
                        }
                        else if (this.ws.readyState !== WebSocket.CONNECTING)
                        {
                            cancellationToken();
                        }
                    }).then(
                        ct => {
                            cancellationToken = ct;
                            this.subs.push({ id: req.id, ct: ct });
                        },
                        console.warn);
                }
                else
                {
                    this.send({ error: 'Query does not exist: ' + req.query, id: req.id });
                }
                break;
            case 'subCancel':
                let found = false;
                for (let i = 0; i < this.subs.length; ++i)
                {
                    if (this.subs[i].id === req.id)
                    {
                        this.subs[i].ct();
                        this.subs.splice(i, 1);
                        found = true;
                        break;
                    }
                }
                if (!found)
                {
                    this.send({ done: true, id: req.id, msg: 'Subscription not found' });
                }
                break;
            case 'query':
                this.graphQLService.run(
                    req.query,
                    undefined,
                    this.graphQLService.getContext(this.request),
                    req.variables,
                )
                .then(result =>
                {
                    if (this.ws.readyState === WebSocket.OPEN)
                    {
                        this.send({ id: req.id, value: result });
                    }
                },
                console.warn);
                break;
            case 'queryId':
                if (this.graphQLService.hasQuery(req.query))
                {
                    const res = this.graphQLService.execute(
                        req.query,
                        undefined,
                        this.graphQLService.getContext(this.request),
                        req.variables,
                        req.operation,
                    );
                    Promise.resolve(res).then(result =>
                    {
                        if (this.ws.readyState === WebSocket.OPEN)
                        {
                            this.send({ id: req.id, value: result });
                        }
                    },
                    console.warn);
                }
                else
                {
                    this.send({ error: 'Query does not exist: ' + req.query, id: req.id });
                }
                break;
            default:
                this.send({ error: 'Invalid message', id: req.id });
                console.warn('Invalid message:', req);
                break;
        }
    }
}

/*

var sock = new WebSocket('ws://localhost:8080/graphql');
sock.addEventListener('message', e => console.log(e), false);

sock.send(JSON.stringify({type:'sub', query:'subscription{demo}'}));
sock.send(JSON.stringify({type:'sub', query:'subscription{demo}', id:0}));
sock.send(JSON.stringify({type:'subCancel', id:0}));
sock.send(JSON.stringify({type:'subId', query:'sub.demo'}));
sock.send(JSON.stringify({type:'subId', query:'sub.demo', id:1}));
sock.send(JSON.stringify({type:'subCancel', id:1}));

sock.close();

 */
