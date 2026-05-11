import type { Metadata } from 'next';
import { EndurixDashboard } from '@/components/endurix-test/EndurixDashboard';

export const metadata: Metadata = {
  title: 'Endurix — Coach Dashboard (Design Test)',
  description: 'Design kit test page — do not use in production.',
};

export default function EndurixTestPage() {
  return <EndurixDashboard />;
}
