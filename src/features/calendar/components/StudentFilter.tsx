'use client';

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
    return (
        <div className="w-64 bg-white p-4 rounded-lg shadow-sm h-full overflow-y-auto">
            {/* Groups Section */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Groups</h3>
                <div className="space-y-2">
                    {groups.map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`group-${group.id}`}
                                checked={selectedGroupIds.includes(group.id)}
                                onChange={() => onToggleGroup(group.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`group-${group.id}`} className="text-sm text-gray-700 cursor-pointer truncate font-medium">
                                {group.name}
                            </label>
                        </div>
                    ))}
                    {groups.length === 0 && <p className="text-xs text-gray-400">No groups found.</p>}
                </div>
            </div>

            <div className="border-t border-gray-100 my-4"></div>

            {/* Students Section */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Students</h3>
                <div className="text-xs space-x-2">
                    <button onClick={onSelectAllStudents} className="text-blue-600 hover:text-blue-800">All</button>
                    <button onClick={onDeselectAllStudents} className="text-gray-500 hover:text-gray-700">None</button>
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
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`student-${student.id}`} className="text-sm text-gray-700 cursor-pointer truncate">
                            {student.name || student.id}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
