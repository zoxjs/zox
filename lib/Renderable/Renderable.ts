import {IRenderService} from "../Plugins/Services/RenderService";
import {Dependency} from "../ServiceContainer";

export const $metadata = Symbol('Metadata');

export type RenderingMetadata = {
    title?: string
    libraries?: Array<string>
    head?: string
    meta?: Array<{[attr:string]: string}>
    [key:string]: any
}

export interface IRenderable
{
    type?: string
    title?: string
    [$metadata]?: RenderingMetadata
    [key:string]: any;
}

export class Renderable implements IRenderable
{
    @Dependency
    protected renderService: IRenderService;

    public type?: string;
    public title?: string;
    public [$metadata]?: RenderingMetadata;
    [key:string]: any;

    constructor(type?: string)
    {
        if (typeof type !== undefined)
        {
            this.type = type;
        }
    }

    public toString()
    {
        const candidates = this.templateCandidates();
        return this.renderService.render(candidates, this);
    }

    public templateCandidates(): Array<string>
    {
        return typeof this.type === 'string' ? [this.type] : [];
    }
}
