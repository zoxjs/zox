import {$metadata, IRenderable, Renderable, RenderingMetadata} from "../Renderable";

export type Link = {
    title: string
    url: string
}

export type PagerOptions = {
    currentPageNumber?: number
    first?: Link
    prev?: Link
    current?: Link
    next?: Link
    last?: Link
}

export class RenderableView extends Renderable
{
    public items: Array<IRenderable>;
    private readonly mode: string;
    private readonly pager?: PagerOptions;

    constructor(mode?: string, items?: Array<IRenderable>, pager?: PagerOptions)
    {
        super('view');
        this.items = Array.isArray(items) ? items : [];
        this.mode = mode;
        this.pager = pager;
    }

    public templateCandidates()
    {
        const candidates = super.templateCandidates();
        if (this.mode)
        {
            candidates.push('view-' + this.mode);
        }
        return candidates;
    }

    get [$metadata]() {
        let res: RenderingMetadata = undefined;
        for (const item of this.items)
        {
            if (item[$metadata] && item[$metadata].libraries)
            {
                if (!res)
                {
                    res = { libraries: item[$metadata].libraries };
                }
                else
                {
                    res.libraries = res.libraries.concat(item[$metadata].libraries);
                }
            }
        }
        return res;
    }
}
