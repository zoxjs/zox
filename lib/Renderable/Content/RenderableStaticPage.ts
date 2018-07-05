import {$metadata, Renderable} from "../Renderable";
import {safeAssign} from "../../Utility";
import {pageNameKey, StaticPageData} from "../../OptionalPlugins/StaticPages/StaticPageManager";

export class RenderableStaticPage extends Renderable
{
    public readonly [pageNameKey]: string;
    public readonly title: string;
    public readonly date: Date;
    public readonly url: string;
    public readonly body: string;
    public readonly __head: string;
    public readonly meta: Array<{[attr:string]: string}>;

    constructor(data: StaticPageData)
    {
        super();
        safeAssign(this, data);
        if (this.__head || this.meta)
        {
            this[$metadata] = {};
            if (this.__head)
            {
                this[$metadata].head = this.__head;
            }
            if (this.meta)
            {
                this[$metadata].meta = this.meta;
            }
        }
    }

    public templateCandidates()
    {
        const candidates = ['static-page'];
        if (this.type && this.type !== this[pageNameKey])
        {
            candidates.push('static-page-' + this.type);
        }
        candidates.push('static-page-' + this[pageNameKey]);
        if (this.type)
        {
            candidates.push('static-page-' + this[pageNameKey] + '-' + this.type);
        }
        return candidates;
    }
}
