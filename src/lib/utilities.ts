export function getAdjustedDateFromString(raw: string) 
{
    return new Date(raw + 'T00:00:00');
}