'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Athlete {
    id: string;
    name: string;
    email: string;
    athleteProfile?: {
        height: number;
        weight: number;
    };
    weeklyStats?: {
        planned: number;
        completed: number;
        completionRate: number;
    };
}

export function AthleteList() {
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchAthletes = async () => {
            try {
                const response = await axios.get('/api/v2/users/athletes/stats');
                setAthletes(response.data);
            } catch (error) {
                console.error('Failed to fetch athletes', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAthletes();
    }, []);

    const filteredAthletes = athletes.filter(athlete =>
        (athlete.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (athlete.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (loading) return <Skeleton className="h-64 w-full" />;

    if (athletes.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No athletes found. Invite some or add them to groups!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Athletes</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input
                        placeholder="Search athletes by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Esta Semana</TableHead>
                                <TableHead>Progreso</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAthletes.map((athlete) => (
                                <TableRow key={athlete.id}>
                                    <TableCell>
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>
                                                {athlete.name ? athlete.name.charAt(0) : 'A'}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium">{athlete.name || 'Unnamed'}</TableCell>
                                    <TableCell>{athlete.email}</TableCell>
                                    <TableCell>
                                        {athlete.weeklyStats ? (
                                            <span className="text-sm">
                                                {athlete.weeklyStats.completed}/{athlete.weeklyStats.planned}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">0/0</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {athlete.weeklyStats && athlete.weeklyStats.planned > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${athlete.weeklyStats.completionRate >= 80 ? 'bg-green-500' :
                                                                athlete.weeklyStats.completionRate >= 50 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                            }`}
                                                        style={{ width: `${athlete.weeklyStats.completionRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {athlete.weeklyStats.completionRate}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/athletes/${athlete.id}`}>
                                                View Profile
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {filteredAthletes.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No athletes found matching your search.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
