import { NotFoundContent } from '@/components/layout/NotFoundContent';

/** Unknown public URL: rendered inside the public header and footer (spec §2). */
export default function NotFound() {
  return <NotFoundContent />;
}
