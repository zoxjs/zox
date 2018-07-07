import {$metadata, IRenderable, RenderingMetadata} from "../Renderable";

export class PureRenderableList implements IRenderable
{
    type?: string;
    title?: string;
    [$metadata]?: RenderingMetadata;

    public items: Array<IRenderable>;

    constructor(items?: Array<IRenderable>)
    {
        this.items = items ? items : [];
    }

    public toString()
    {
        let content = '';
        for (let i = 0; i < this.items.length; ++i)
        {
            content += this.items[i].toString();
        }
        return content;
    }
}
