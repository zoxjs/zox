
export function routeTokens(route: string): Array<string>
{
    const rawTokens = route.split('/');
    const tokens = [];
    for (let i = 0; i < rawTokens.length; ++i)
    {
        if (rawTokens[i].length > 0)
        {
            tokens.push(rawTokens[i]);
        }
    }
    return tokens;
}

export type RouteParams = { [key:string]: string }

export function tryMatchRoute(current: Array<string>, candidate: Array<string>): RouteParams | boolean
{
    if (current.length !== candidate.length)
    {
        return false;
    }
    let routeProperties;
    for (let i = 0; i < candidate.length; ++i)
    {
        if (candidate[i][0] === ':')
        {
            if (!routeProperties)
            {
                routeProperties = {};
            }
            routeProperties[candidate[i].substring(1)] = current[i];
        }
        else if (candidate[i] !== current[i])
        {
            return false;
        }
    }
    return routeProperties ? routeProperties : true;
}

export function tryMatchExactRoute(current: Array<string>, candidate: Array<string>): boolean
{
    if (current.length !== candidate.length)
    {
        return false;
    }
    for (let i = 0; i < candidate.length; ++i)
    {
        if (candidate[i] !== current[i])
        {
            return false;
        }
    }
    return true;
}
