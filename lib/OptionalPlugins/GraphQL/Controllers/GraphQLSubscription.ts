import {IController} from "../../../Controller";
import {Route} from "../../../Plugins/PluginManagers/RoutePluginManager";
import {IGraphQLService, SubscribeArgsId} from "../GraphQLService";
import {IncomingMessage} from "http";
import {IResponse} from "../../../Responses/IResponse";
import {JsonResponse} from "../../../Responses/JsonResponse";
import {Dependency} from "../../../ServiceContainer";
import {EventStreamResponse} from "../../../Responses/EventStreamResponse";
import {parse} from "graphql";
import {ParsedUrlQuery} from "querystring";
import {RouteParams} from "../../../RoutingUtility";

function subscriptionEventStream(args: SubscribeArgsId): Promise<IResponse>
{
    let eventStream: EventStreamResponse;
    return this.graphQLService.subscribe(args, e =>
    {
        eventStream.sendMessage(e);
    })
    .then(ct =>
        {
            eventStream = new EventStreamResponse();
            eventStream.onClose = ct;
            return eventStream;
        },
        err =>
        {
            return new JsonResponse({ status: 'Error', error: err.message });
        });
}

@Route({
    route: '/graphql/subscribe'
})
export class GraphQLEventStream implements IController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    public query: ParsedUrlQuery;

    public handle(request: IncomingMessage): IResponse | Promise<IResponse>
    {
        console.log('GraphQL start subscription');
        if ('query' in this.query)
        {
            const document = parse(this.query['query'] as string);
            let variables;
            if ('variables' in this.query)
            {
                variables = JSON.parse(this.query['variables'] as string);
            }
            return subscriptionEventStream({
                document,
                variableValues: variables,
                contextValue: this.graphQLService.getContext(request),
            });
        }
        return new JsonResponse({ status: 'Error', error: 'Missing query parameter' });
    }
}

@Route({
    route: '/gql/sub/:id'
})
@Route({
    route: '/gql/sub/:id/:op'
})
export class GraphQLPredefinedEventStream implements IController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    public params: RouteParams;
    public query: ParsedUrlQuery;

    public handle(request: IncomingMessage): IResponse | Promise<IResponse>
    {
        if (this.graphQLService.hasQuery(this.params.id))
        {
            return subscriptionEventStream({
                queryId: this.params.id,
                variableValues: this.query,
                contextValue: this.graphQLService.getContext(request),
                operationName: this.params.op,
            });
        }
        return new JsonResponse({ status: 'Error', error: 'Query does not exist: ' + this.params.id });
    }
}

/*

var evtSource = new EventSource('/graphql/subscribe?query=subscription{demo}');

var evtSource = new EventSource('/gql/sub/sub.demo');
evtSource.addEventListener('message', e => console.log(e), false);

evtSource.close();

 */
