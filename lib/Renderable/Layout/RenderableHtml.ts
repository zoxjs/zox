import {Renderable} from "../Renderable";
import {RenderablePage} from "./RenderablePage";

export class RenderableHtml extends Renderable
{
    public title: string = 'Title';
    public html_attributes: string = '';
    public body_attributes: string = '';
    public head: string =
        '<meta charset="UTF-8">\n' +
        '<meta http-equiv="X-UA-Compatible" content="IE=edge"/>' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n';
    public styles: string = '';
    public scripts_head: string = '';
    public scripts_bottom: string = '';
    public page: RenderablePage;

    constructor(page: RenderablePage)
    {
        super('html');
        this.page = page;
    }
}
