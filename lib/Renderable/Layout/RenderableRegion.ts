import {IRenderable, Renderable} from "../Renderable";

export class RenderableRegion extends Renderable
{
    public region: string;
    public blocks: Array<IRenderable>;

    public get content(): string
    {
        let content = '';
        for (let i = 0; i < this.blocks.length; ++i)
        {
            content += this.blocks[i].toString();
        }
        return content;
    }

    constructor(region: string, blocks?: Array<IRenderable>)
    {
        super('region');
        this.region = region;
        this.blocks = blocks ? blocks : [];
    }

    public templateCandidates()
    {
        const candidates = super.templateCandidates();
        candidates.push('region-' + this.region);
        return candidates;
    }
}
