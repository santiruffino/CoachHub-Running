import api from '@/lib/axios';
import { WorkoutMatch } from '../types';

/**
 * Matching Service
 * 
 * Handles workout matching operations between planned workouts and completed activities.
 */
class MatchingService {
    /**
     * Get match data for a training assignment
     * @param assignmentId - Training assignment ID
     * @param activityId - Optional manual activity ID to match with
     */
    async getMatch(assignmentId: string, activityId?: string): Promise<WorkoutMatch> {
        try {
            const url = `/v2/trainings/assignments/${assignmentId}/match${activityId ? `?activityId=${activityId}` : ''
                }`;

            const response = await api.get(url);
            return response.data;
        } catch (error: any) {
            console.error('Failed to fetch workout match:', error);
            throw error;
        }
    }

    /**
     * Get candidate activities for matching
     */
    async getCandidateActivities(assignmentId: string): Promise<any[]> {
        try {
            const response = await api.get(`/v2/trainings/assignments/${assignmentId}/candidates`);
            return response.data;
        } catch (error: any) {
            console.error('Failed to fetch candidate activities:', error);
            return [];
        }
    }

    async getCandidateAssignments(activityId: string): Promise<any[]> {
        try {
            const response = await api.get(`/v2/activities/${activityId}/candidates`);
            return response.data;
        } catch (error: any) {
            console.error('Failed to fetch candidate assignments:', error);
            return [];
        }
    }

    async linkActivity(assignmentId: string, activityId: string): Promise<void> {
        try {
            await api.post(`/v2/trainings/assignments/${assignmentId}/link`, { activityId });
        } catch (error: any) {
            console.error('Failed to link activity:', error);
            throw error;
        }
    }

    async unlinkActivity(assignmentId: string): Promise<void> {
        try {
            await api.delete(`/v2/trainings/assignments/${assignmentId}/link`);
        } catch (error: any) {
            console.error('Failed to unlink activity:', error);
            throw error;
        }
    }

    /**
     * Get match color based on score
     */
    getMatchColor(score: number): string {
        if (score >= 85) return 'green';
        if (score >= 70) return 'yellow';
        return 'red';
    }

    /**
     * Get match category label
     */
    getMatchCategory(score: number): string {
        if (score >= 85) return 'Excelente';
        if (score >= 70) return 'Bueno';
        if (score >= 50) return 'Regular';
        return 'Bajo';
    }

    /**
     * Format percentage difference
     */
    formatDifference(diff: number): string {
        const sign = diff >= 0 ? '+' : '';
        return `${sign}${diff.toFixed(1)}%`;
    }
}

export const matchingService = new MatchingService();
