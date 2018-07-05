import {Dependency, IOnResolved, IService, IServiceContainer} from "../../ServiceContainer";
import {Service} from "../../PluginManagers/ServicePluginManager";
import {execute, graphql, GraphQLSchema, introspectionQuery, parse, validate} from "graphql";
import {DocumentNode, ExecutableDefinitionNode} from "graphql/language/ast";
import {ExecutionResult} from "graphql/execution/execute";
import {MaybePromise} from "graphql/jsutils/MaybePromise";
import {GraphQLFieldResolver} from "graphql/type/definition";
import Maybe from "graphql/tsutils/Maybe";
import {assembleSchema} from "graphql-plugins/lib/SchemaAssembler";
import {IPluginDiscoveryService} from "../../Services/PluginDiscoveryService";
import {CancellationToken, SubscribeArgs, SubscriptionManager} from "graphql-plugins/lib/SubscriptionManager";
import * as fs from "fs";
import * as path from "path";
import {listFilesSync} from "../../Utility";
import {IConfigService} from "../../Services/ConfigService";
import {IncomingMessage} from "http";

const serviceKey = Symbol('GraphQL');

type GraphQLConfig = {
    directory?: string
}

export type SubscribeArgsId = {
    queryId?: string
    document?: DocumentNode
    rootValue?: any
    contextValue?: any
    variableValues?: Maybe<{ [key: string]: any }>
    operationName?: Maybe<string>
    fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
    subscribeFieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
}

export abstract class IGraphQLService implements IService
{
    public get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract hasQuery(queryId: string): boolean;
    public abstract execute(
        queryId: string,
        rootValue?: any,
        contextValue?: any,
        variableValues?: Maybe<{ [key: string]: any }>,
        operationName?: Maybe<string>,
        fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
    ): MaybePromise<ExecutionResult>;
    public abstract run(
        query: string,
        rootValue?: any,
        contextValue?: any,
        variableValues?: Maybe<{ [key: string]: any }>,
        operationName?: Maybe<string>,
        fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
    ): Promise<ExecutionResult>;
    public abstract subscribe(args: SubscribeArgsId, feedHandler: (any) => void): Promise<CancellationToken>;
    public abstract unsubscribeAll(): void;

    public contextGenerator?: (request: IncomingMessage) => any;
    public abstract getContext(request: IncomingMessage): any;
}

@Service
export class GraphQLService extends IGraphQLService implements IOnResolved
{
    @Dependency
    protected container: IServiceContainer;

    @Dependency
    protected pluginDiscovery: IPluginDiscoveryService;

    @Dependency
    protected config: IConfigService;

    private schema: GraphQLSchema;
    private subscriptionManager: SubscriptionManager;
    private queries: { [id:string]: DocumentNode } = {};
    private defaultOperations: { [id:string]: string } = {};

    public onResolved(): void
    {
        // Load schema
        const schemaInfo = assembleSchema(this.pluginDiscovery, {
            decorate: resolver => this.container.resolve(resolver, true)
        });
        this.schema = schemaInfo.schema;

        // Save for debug
        graphql(this.schema, introspectionQuery).then(data =>
        {
            fs.writeFile('graphql.schema.json', JSON.stringify(data), err =>
            {
                if (err)
                {
                    console.error(err);
                }
            });
        });

        // Load prepared queries
        const config: GraphQLConfig = this.config.getConfig('graphql');
        if (config && config.directory)
        {
            const queryFiles = listFilesSync(config.directory);
            for (const queryFile of queryFiles)
            {
                const source = fs.readFileSync(queryFile, 'utf8');
                let document: DocumentNode;
                try
                {
                    document = parse(source);
                }
                catch (err)
                {
                    console.error('Invalid query:', queryFile, '\n ', err);
                    continue;
                }
                const validationErrors = validate(this.schema, document);
                if (validationErrors.length > 0)
                {
                    console.warn('Bad query:', queryFile, '\n ', validationErrors);
                }
                else
                {
                    const id = path.basename(queryFile, '.graphql');
                    this.queries[id] = document;
                    this.defaultOperations[id] = defaultOperationName(document);
                }
            }
        }
    }

    public hasQuery(queryId: string): boolean
    {
        return this.queries.hasOwnProperty(queryId);
    }

    public execute(
        queryId: string,
        rootValue?: any,
        contextValue?: any,
        variableValues?: Maybe<{ [key: string]: any }>,
        operationName?: Maybe<string>,
        fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
    ): MaybePromise<ExecutionResult>
    {
        if (!this.queries.hasOwnProperty(queryId))
        {
            throw new Error('Invalid query id: ' + queryId);
        }
        if (operationName === undefined)
        {
            operationName = this.defaultOperations[queryId];
        }
        return execute(
            this.schema,
            this.queries[queryId],
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver
        );
    }

    public run(
        query: string,
        rootValue?: any,
        contextValue?: any,
        variableValues?: Maybe<{ [key: string]: any }>,
        operationName?: Maybe<string>,
        fieldResolver?: Maybe<GraphQLFieldResolver<any, any>>
    ): Promise<ExecutionResult>
    {
        return graphql(
            this.schema,
            query,
            rootValue,
            contextValue,
            variableValues,
            operationName,
            fieldResolver
        );
    }

    public subscribe(args: SubscribeArgsId, feedHandler: (any) => void): Promise<CancellationToken>
    {
        if (!this.subscriptionManager)
        {
            this.subscriptionManager = new SubscriptionManager(this.schema);
        }
        if (args.queryId)
        {
            if (!this.hasQuery(args.queryId))
            {
                throw new Error('invalid query id: ' + args.queryId);
            }
            args.document = this.queries[args.queryId];
            if (args.operationName === undefined)
            {
                args.operationName = this.defaultOperations[args.queryId];
            }
        }
        return this.subscriptionManager.subscribe(args as SubscribeArgs, feedHandler);
    }

    public unsubscribeAll(): void
    {
        this.subscriptionManager.unsubscribeAll();
    }

    public getContext(request: IncomingMessage): any
    {
        return this.contextGenerator ? this.contextGenerator(request) : undefined;
    }
}

function defaultOperationName(document: DocumentNode): string
{
    const definitions = document.definitions as ReadonlyArray<ExecutableDefinitionNode>;
    if (definitions.length == 1)
    {
        return undefined;
    }
    else
    {
        for (const definition of definitions)
        {
            if (definition.name && definition.name.value == 'default')
            {
                return 'default';
            }
        }
        return definitions[0].name.value;
    }
}
