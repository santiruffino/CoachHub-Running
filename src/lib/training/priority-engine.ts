export function resolveAssignmentConflicts(assignments: any[]) {
    if (!assignments || assignments.length === 0) return [];

    // Group assignments by user_id AND by scheduled_date
    const grouped = new Map<string, any[]>();
    
    assignments.forEach(assignment => {
        const key = `${assignment.user_id}_${assignment.scheduled_date}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(assignment);
    });

    const resolved: any[] = [];

    // Priority ranker helper
    // 0: Personalized
    // 1: Race A
    // 2: Race B
    // 3: Race C
    // 4: Regular (Default)
    const getPriorityScore = (assignment: any): number => {
        if (!assignment.source_group_id || !assignment.group) {
            return 0; // Personalized is top priority
        }
        if (assignment.group.group_type === 'RACE') {
            const priority = assignment.group.race_priority;
            if (priority === 'A') return 1;
            if (priority === 'B') return 2;
            if (priority === 'C') return 3;
            // Default race priority if somehow missing but it's a race
            return 3.5; 
        }
        return 4; // Regular group
    };

    // For each athlete-date combination, pick the winner
    grouped.forEach(dailyAssignments => {
        if (dailyAssignments.length === 1) {
            resolved.push(dailyAssignments[0]);
            return;
        }

        // Sort by priority score (lowest score wins)
        const sorted = [...dailyAssignments].sort((a, b) => {
            return getPriorityScore(a) - getPriorityScore(b);
        });

        // The first one is the winner
         resolved.push(sorted[0]);
         
         // Optionally, we could attach the overridden ones to the winner if UI wants to know
         // sorted[0]._overridden = sorted.slice(1);
    });

    return resolved;
}
