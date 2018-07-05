import {IRenderable, Renderable} from "../Renderable";
import {safeAssign} from "../../Utility";

export class RenderableBlock extends Renderable
{
    public block?: string;

    constructor(block?: string, content?: IRenderable, settings?)
    {
        super('block');
        if (block !== undefined)
        {
            this.block = block;
        }
        if (typeof settings === 'object')
        {
            safeAssign(this, settings);
        }
    }

    public templateCandidates()
    {
        const candidates = super.templateCandidates();
        if (this.block !== undefined)
        {
            candidates.push('block-' + this.block);
        }
        return candidates;
    }
}

export abstract class ConditionallyRenderableBlock extends RenderableBlock
{
    public toString()
    {
        return this.show() ? super.toString() : '';
    }

    public abstract show(): boolean;
}
