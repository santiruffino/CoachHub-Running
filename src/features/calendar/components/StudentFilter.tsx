'use client';

import { useTranslations } from 'next-intl';

interface Student {
    id: string;
    name: string;
}

interface Group {
    id: string;
    name: string;
}

interface StudentFilterProps {
    students: Student[];
    groups: Group[];
    selectedStudentIds: string[];
    selectedGroupIds: string[];
    onToggleStudent: (id: string) => void;
    onToggleGroup: (id: string) => void;
    onSelectAllStudents: () => void;
    onDeselectAllStudents: () => void;
}

export function StudentFilter({
    students,
    groups,
    selectedStudentIds,
    selectedGroupIds,
    onToggleStudent,
    onToggleGroup,
    onSelectAllStudents,
    onDeselectAllStudents
}: StudentFilterProps) {
    const t = useTranslations('calendar.studentFilter');

    return (
        <div className="w-64 bg-endurix-paper dark:bg-card p-4 border border-endurix-black/10 dark:border-border h-full overflow-y-auto">
            {/* Groups Section */}
            <div className="mb-6">
                <h3
                    className="font-semibold text-endurix-black dark:text-foreground mb-2 uppercase tracking-widest text-xs"
                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                >
                    {t('groups')}
                </h3>
                <div className="space-y-2">
                    {groups.map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`group-${group.id}`}
                                checked={selectedGroupIds.includes(group.id)}
                                onChange={() => onToggleGroup(group.id)}
                                className="border-endurix-black/20 text-endurix-orange focus:ring-endurix-orange"
                            />
                            <label htmlFor={`group-${group.id}`} className="text-sm text-endurix-black dark:text-foreground cursor-pointer truncate font-medium">
                                {group.name}
                            </label>
                        </div>
                    ))}
                    {groups.length === 0 && <p className="text-xs text-muted-foreground">{t('noGroups')}</p>}
                </div>
            </div>

            <div className="border-t border-endurix-black/10 dark:border-border my-4"></div>

            {/* Students Section */}
            <div className="flex justify-between items-center mb-4">
                <h3
                    className="font-semibold text-endurix-black dark:text-foreground uppercase tracking-widest text-xs"
                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                >
                    {t('students')}
                </h3>
                <div className="text-xs space-x-2">
                    <button onClick={onSelectAllStudents} className="text-endurix-orange hover:text-endurix-orange/80 font-semibold uppercase tracking-wider">{t('all')}</button>
                    <button onClick={onDeselectAllStudents} className="text-muted-foreground hover:text-endurix-black uppercase tracking-wider">{t('none')}</button>
                </div>
            </div>
            <div className="space-y-2">
                {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id={`student-${student.id}`}
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => onToggleStudent(student.id)}
                            className="border-endurix-black/20 text-endurix-orange focus:ring-endurix-orange"
                        />
                        <label htmlFor={`student-${student.id}`} className="text-sm text-endurix-black dark:text-foreground cursor-pointer truncate">
                            {student.name || student.id}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
