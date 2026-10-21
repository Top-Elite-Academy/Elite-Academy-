import { notFound } from 'next/navigation';

/** Any unknown URL under a language prefix shows the 404 page inside the public frame. */
export default function CatchAll() {
  notFound();
}
