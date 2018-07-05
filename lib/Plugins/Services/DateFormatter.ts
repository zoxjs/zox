import {Service} from "../../PluginManagers/ServicePluginManager";
import {Dependency, IOnResolved, IService} from "../../ServiceContainer";
import {IConfigService} from "../../Services/ConfigService";

const serviceKey = Symbol('Date Formatter');

export type DateMasks = { [key:string]: string }

export type DateI18n = {
    dayNamesShort: [string, string, string, string, string, string, string]
    dayNamesLong: [string, string, string, string, string, string, string]
    monthNamesShort: [string, string, string, string, string, string, string, string, string, string, string, string]
    monthNamesLong: [string, string, string, string, string, string, string, string, string, string, string, string]
}

export abstract class IDateFormatter implements IService
{
    get serviceKey(): symbol
    {
        return serviceKey;
    }

    public abstract masks: DateMasks;
    public abstract i18n: DateI18n;
    public abstract i18nMap: { [lang:string]: DateI18n };
    public abstract formatDate(date?: Date | string | number, mask?: string, i18n?: DateI18n | string, utc?: boolean): string;
}

const token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
const timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
const timezoneClip = /[^-+\dA-Z]/g;

@Service
export class DateFormatter extends IDateFormatter implements IOnResolved
{
    @Dependency
    protected config: IConfigService;

    public masks: DateMasks = {
        default:        'ddd mmm dd yyyy HH:MM:ss',
        standard:       'dddd, mmmm dS, yyyy, h:MM:ss TT',
        log:            'yyyy-mm-dd--HH-MM-ss',
        shortDate:      'm/d/yy',
        mediumDate:     'mmm d, yyyy',
        longDate:       'mmmm d, yyyy',
        fullDate:       'dddd, mmmm d, yyyy',
        shortTime:      'h:MM TT',
        mediumTime:     'h:MM:ss TT',
        longTime:       'h:MM:ss TT Z',
        isoDate:        'yyyy-mm-dd',
        isoTime:        'HH:MM:ss',
        isoDateTime:    'yyyy-mm-dd\'T\'HH:MM:ss',
        isoUtcDateTime: 'UTC:yyyy-mm-dd\'T\'HH:MM:ss\'Z\''
    };

    public i18n: DateI18n = {
        dayNamesShort: [
            'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
        ],
        dayNamesLong: [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
        ],
        monthNamesShort: [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
        monthNamesLong: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
    };

    public i18nMap: { [lang:string]: DateI18n };

    public onResolved(): void
    {
        const customMasks = this.config.getConfig('date.formats');
        Object.assign(this.masks, customMasks);
    }

    private getI18n(lang: string): DateI18n
    {
        if (!this.i18nMap)
        {
            this.i18nMap = {};
        }
        if (lang in this.i18nMap)
        {
            return this.i18nMap[lang] || this.i18n;
        }
        const res = this.config.getConfig('date/' + lang) as DateI18n;
        if (!Array.isArray(res.dayNamesShort) ||
            !Array.isArray(res.dayNamesShort) ||
            !Array.isArray(res.dayNamesShort) ||
            !Array.isArray(res.dayNamesShort))
        {
            console.warn('Invalid date i18n config: date/' + lang);
            this.i18nMap[lang] = undefined;
        }
        else
        {
            return this.i18nMap[lang] = res;
        }
    }

    public formatDate(date?: Date | string | number, mask?: string, i18n?: DateI18n | string, utc?: boolean): string
    {
        date = date != null ? new Date(date) : new Date;
        // @ts-ignore
        if (isNaN(date))
        {
            throw SyntaxError('invalid date');
        }

        mask = String(this.masks[mask] || mask || this.masks['default']);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == 'UTC:')
        {
            mask = mask.slice(4);
            utc = true;
        }

        i18n = i18n == null ? this.i18n :
            typeof i18n === 'object' ? i18n :
                this.getI18n(i18n);

        const
            _ = utc ? 'getUTC' : 'get',
            d = date[_ + 'Date'](),
            D = date[_ + 'Day'](),
            m = date[_ + 'Month'](),
            y = date[_ + 'FullYear'](),
            H = date[_ + 'Hours'](),
            M = date[_ + 'Minutes'](),
            s = date[_ + 'Seconds'](),
            L = date[_ + 'Milliseconds'](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d:    d,
                dd:   pad(d),
                ddd:  i18n.dayNamesShort[D],
                dddd: i18n.dayNamesLong[D],
                m:    m + 1,
                mm:   pad(m + 1),
                mmm:  i18n.monthNamesShort[m],
                mmmm: i18n.monthNamesLong[m],
                yy:   String(y).slice(2),
                yyyy: y,
                h:    H % 12 || 12,
                hh:   pad(H % 12 || 12),
                H:    H,
                HH:   pad(H),
                M:    M,
                MM:   pad(M),
                s:    s,
                ss:   pad(s),
                l:    pad(L, 3),
                L:    pad(L > 99 ? Math.round(L / 10) : L),
                t:    H < 12 ? 'a'  : 'p',
                tt:   H < 12 ? 'am' : 'pm',
                T:    H < 12 ? 'A'  : 'P',
                TT:   H < 12 ? 'AM' : 'PM',
                Z:    utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
                o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S:    ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10 ? d % 10 : 0)]
            };

        return mask.replace(token, (a) =>
            a in flags ? flags[a] : a.slice(1, a.length - 1)
        );
    }
}

export function pad(val: string | number, len?: number)
{
    val = String(val);
    len = len || 2;
    while (val.length < len)
    {
        val = '0' + val;
    }
    return val;
}
