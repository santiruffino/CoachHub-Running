import { Button } from '@/components/ui/button'; // Assuming shadcn UI or similar exists
// If not, I'll use a standard HTML button or check components folder first. I will check components folder in next step if needed, but for now assuming project setup is standard. 
// Step 310 showed "components" folder.
import { Loader2 } from 'lucide-react';

interface ConnectStravaButtonProps {
    onConnect: () => void;
    loading?: boolean;
}

export function ConnectStravaButton({ onConnect, loading }: ConnectStravaButtonProps) {
    return (
        <Button
            onClick={onConnect}
            disabled={loading}
            className="bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold"
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Connect with Strava
        </Button>
    );
}
