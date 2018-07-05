import {IController, JsonController, MaybePromise} from "../../../Controller";
import {IncomingMessage} from "http";
import {Route} from "../../../Plugins/PluginManagers/RoutePluginManager";
import {IGraphQLService} from "../GraphQLService";
import {IResponse} from "../../../Responses/IResponse";
import {JsonResponse} from "../../../Responses/JsonResponse";
import {Dependency} from "../../../ServiceContainer";
import {ParsedUrlQuery} from "querystring";
import {RouteParams} from "../../../RoutingUtility";

@Route({
    route: '/graphql'
})
export class GraphQLGet implements IController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    public query: ParsedUrlQuery;

    public handle(request: IncomingMessage): IResponse | Promise<IResponse>
    {
        if ('query' in this.query)
        {
            let variables;
            if ('variables' in this.query)
            {
                variables = JSON.parse(this.query['variables'] as string);
            }
            return this.graphQLService.run(
                this.query['query'] as string,
                undefined,
                this.graphQLService.getContext(request),
                variables,
            )
            .then(result => new JsonResponse(result));
        }
        return new JsonResponse({ status: 'Error', error: 'Missing query parameter' });
    }
}

@Route({
    method: 'post',
    route: '/graphql'
})
export class GraphQLPost extends JsonController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    public handleJson(request: IncomingMessage, query): IResponse | Promise<IResponse>
    {
        return this.graphQLService.run(
            query.query,
            undefined,
            this.graphQLService.getContext(request),
            query.variables,
            query.operation,
        )
        .then(result => new JsonResponse(result));
    }
}

@Route({
    route: '/gql/:id'
})
@Route({
    route: '/gql/:id/:op'
})
export class GraphQLGetPredefined implements IController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    public params: RouteParams;
    public query: ParsedUrlQuery;

    public handle(request: IncomingMessage): IResponse | Promise<IResponse>
    {
        if (this.graphQLService.hasQuery(this.params.id))
        {
            let variables;
            if ('variables' in this.query)
            {
                variables = JSON.parse(this.query['variables'] as string);
            }
            const res = this.graphQLService.execute(
                this.params.id,
                undefined,
                this.graphQLService.getContext(request),
                variables,
                this.params.op,
            );
            return Promise.resolve(res).then(result => new JsonResponse(result));
        }
        return new JsonResponse({ errors: [ { message: 'Query does not exist: ' + this.params.id }] });
    }
}

@Route({
    method: 'post',
    route: '/gql/:id'
})
@Route({
    method: 'post',
    route: '/gql/:id/:op'
})
export class GraphQLPostPredefined extends JsonController
{
    @Dependency
    protected graphQLService: IGraphQLService;

    public params: RouteParams;

    public handleJson(request: IncomingMessage, variables): MaybePromise<IResponse>
    {
        if (this.graphQLService.hasQuery(this.params.id))
        {
            const res = this.graphQLService.execute(
                this.params.id,
                undefined,
                this.graphQLService.getContext(request),
                variables,
                this.params.op,
            );
            return Promise.resolve(res).then(result => new JsonResponse(result));
        }
        return new JsonResponse({ errors: [ { message: 'Query does not exist: ' + this.params.id }] });
    }

    public handleInvalidRequest(request: IncomingMessage, reason: string): MaybePromise<IResponse>
    {
        return new JsonResponse({ errors: [ { message: reason }] }, 400);
    }
}
