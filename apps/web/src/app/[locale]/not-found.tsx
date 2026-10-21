import { NotFoundContent } from '@/components/layout/NotFoundContent';
import { PublicShell } from '@/components/layout/PublicShell';

/** 404 for pages outside the public frame (e.g. /admin for a non-admin). */
export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundContent />
    </PublicShell>
  );
}
