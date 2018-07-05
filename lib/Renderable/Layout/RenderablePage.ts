import {Renderable} from "../Renderable";
import {RenderableRegion} from "./RenderableRegion";

export type PageRegions = { [region:string]: RenderableRegion }

export class RenderablePage extends Renderable
{
    constructor(regions: PageRegions)
    {
        super('page');
        Object.assign(this, regions);
    }
}
