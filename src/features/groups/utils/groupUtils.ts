import { Group } from '@/interfaces/group';
import { subMonths, isAfter, parseISO } from 'date-fns';

/**
 * A group is considered active if:
 * 1. It is a REGULAR group (no race date logic applies).
 * 2. It is a RACE group and the race_date is in the future.
 * 3. It is a RACE group and the race_date was within the last month.
 */
export function isGroupActive(group: Group): boolean {
    // If manually archived, it's never active
    if (group.is_archived) {
        return false;
    }

    if (group.group_type !== 'RACE' || !group.race_date) {
        return true;
    }

    const raceDate = parseISO(group.race_date);
    const oneMonthAgo = subMonths(new Date(), 1);

    // If race date is after one month ago, it's still active
    return isAfter(raceDate, oneMonthAgo);
}

/**
 * A race is considered "upcoming or recent" for the dashboard if:
 * 1. It is NOT manually archived.
 * 2. It is in the future OR it happened within the last month.
 */
export function isRaceRelevant(group: Group): boolean {
    if (group.is_archived || group.group_type !== 'RACE' || !group.race_date) {
        return false;
    }

    const raceDate = parseISO(group.race_date);
    const oneMonthAgo = subMonths(new Date(), 1);

    return isAfter(raceDate, oneMonthAgo);
}
