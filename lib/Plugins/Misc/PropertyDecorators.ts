import {IPropertyDecorator, PropertyDecorator} from "../PluginManagers/PropertyDecoratorPluginManager";
import * as marked from "marked";

@PropertyDecorator('md')
export class MarkdownPropertyDecorator implements IPropertyDecorator
{
    public decorate(property: string): string
    {
        return marked(property);
    }
}

@PropertyDecorator('nl2br')
export class NL2BRPropertyDecorator implements IPropertyDecorator
{
    public decorate(property: string): string
    {
        return property.replace(/(?:\r\n|\r|\n)/g, '<br>');
    }
}

@PropertyDecorator('upper')
export class UpperPropertyDecorator implements IPropertyDecorator
{
    public decorate(property: string): string
    {
        return property.toUpperCase();
    }
}

@PropertyDecorator('lower')
export class LowerPropertyDecorator implements IPropertyDecorator
{
    public decorate(property: string): string
    {
        return property.toLowerCase();
    }
}

@PropertyDecorator('date')
export class DatePropertyDecorator implements IPropertyDecorator
{
    public decorate(property: string): Date
    {
        return new Date(property);
    }
}

export type SortOptions = {
    items: Array<any>
    sortBy: string
    order?: string | 'ASC' | 'DSC'
}

@PropertyDecorator('sort')
export class SortPropertyDecorator implements IPropertyDecorator
{
    public decorate(property: SortOptions): Array<any>
    {
        property.order = property.order ? property.order.toUpperCase() : 'ASC';
        const orderAsc = property.order != 'DSC';
        return property.items.sort((a, b) =>
            typeof a[property.sortBy] == 'string' ? (
                    a[property.sortBy].localeCompare(b[property.sortBy]) * (orderAsc ? 1 : -1)
                ) :
                orderAsc ?
                    a[property.sortBy] - b[property.sortBy] :
                    b[property.sortBy] - a[property.sortBy]
        );
    }
}

@PropertyDecorator('reverse')
export class ReversePropertyDecorator implements IPropertyDecorator
{
    public decorate(property: Array<any>): Array<any>
    {
        return property.reverse();
    }
}
