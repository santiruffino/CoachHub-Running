import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import api from '@/lib/axios'; // Or use usersService if available, but for now direct axios or import service

interface AddMemberModalProps {
    groupId: string;
    currentMemberIds: string[];
    open: boolean;
    onClose: () => void;
    onAdded: () => void;
}

export function AddMemberModal({ groupId, currentMemberIds, open, onClose, onAdded }: AddMemberModalProps) {
    const [athletes, setAthletes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedId, setSelectedId] = useState<string>('');

    useEffect(() => {
        if (open) {
            setLoading(true);
            api.get('/v2/users/athletes')
                .then(res => {
                    const available = res.data.filter((a: any) => !currentMemberIds.includes(a.id));
                    setAthletes(available);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, currentMemberIds]);

    const handleSubmit = async () => {
        if (!selectedId) return;
        try {
            setSubmitting(true);
            await api.post(`/v2/groups/${groupId}/members`, { athleteId: selectedId });
            onAdded();
            onClose();
        } catch (error) {
            console.error('Failed to add member', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Athlete to Group</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-orange-500" /></div>
                ) : (
                    <div className="py-4">
                        {athletes.length === 0 ? (
                            <p className="text-center text-gray-500">No available athletes to add.</p>
                        ) : (
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-gray-700">Select Athlete</label>
                                <select
                                    className="w-full border rounded p-2"
                                    value={selectedId}
                                    onChange={(e) => setSelectedId(e.target.value)}
                                >
                                    <option value="">Select an athlete...</option>
                                    {athletes.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name || a.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || !selectedId}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Member
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
