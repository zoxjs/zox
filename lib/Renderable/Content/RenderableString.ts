import {Renderable} from "../Renderable";

export class RenderableString extends Renderable
{
    public str: string;

    constructor(str: string)
    {
        super('string');
        this.str = str;
    }

    public toString()
    {
        return this.str;
    }
}
