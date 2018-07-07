# Zox.js

Develop React apps, Static sites and GraphQL schemas.

Use this command to get started with a new project:

```bash
npm i zox zox-plugins
```

Add support for GraphQL:

```bash
npm i graphql-plugins
```

Use handlebars templates:

```bash
npm i zox-handlebars
```

### A simple controller

Controllers implement a `handle()` method that returns a `Response` object
which will be in charge of sending the HTTP response.

```ts
@Route({
    route: '/page/hello-world'
})
export class MyPage implements IController
{
    public handle(): IResponse
    {
        return new StringResponse('Hello World');
    }
}
```

### Page controller

A `PageController` is a base controller class
that returns our page in a `RenderResponse`.
As the name suggests this class will render our template
and add the required js, css and meta tags,
before sending the response.

```ts
@Route({
    route: '/page/hello-world'
})
export class MyPage extends PageController
{
    public page()
    {
        const renderable = this.container.create(
            Renderable,
            'my-template-name'
        );
        renderable.text = 'Hello World';
        return renderable;
    }
}
```

### A simple API

Creating API endpoints is as simple as
creating a controller that returns a `JsonResponse`.

```ts
@Route({
    route: '/api/user/:id'
})
export class MyApi extends Controller
{
    public handle(): IResponse
    {
        const data = users.find(u => u.id == this.params.id);
        return new JsonResponse(data);
    }
}
```

### GraphQL resolvers

With GraphQL we get to explicitly define types of
inputs and outputs of our endpoints.

```ts
@Query('user(id: ID!): User', UserDef)
export class UserQuery extends ResolverBase
{
    public resolve(root, args, context): Array<UserData>
    {
        return users.find(u => u.id == args.id);
    }
}
```

### React SPA

You can simply return a `ReactRenderable` with your `App` component
and continue with your regular React workflow.

```ts
@Route({
    route: '/react/hello-world'
})
export class MyReactPage extends PageController
{
    public page()
    {
        return this.container.create(
            ReactRenderable,
            <App text='Hello World' />
        );
    }
}
```
