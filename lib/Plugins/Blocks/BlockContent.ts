import {RenderableBlock} from "../../Renderable/Layout/RenderableBlock";
import {Block} from "../PluginManagers/BlockPluginManager";
import {IRenderable} from "../../Renderable/Renderable";

@Block({
    name: 'content'
})
export class BlockContent extends RenderableBlock
{
    public content: IRenderable;

    constructor(block: string, content: IRenderable, settings?)
    {
        super(block, content, settings);
        this.content = content;
    }

    public templateCandidates()
    {
        const candidates = super.templateCandidates();
        if (this.content.type !== undefined)
        {
            candidates.push('block-' + this.block + '-' + this.content.type);
        }
        return candidates;
    }
}

@Block({
    name: 'pure-content'
})
export class BlockPureContent implements IRenderable
{
    public type?: string;
    public content: IRenderable;

    constructor(block: string, content: IRenderable)
    {
        this.content = content;
    }

    public toString()
    {
        return this.content.toString();
    }
}
