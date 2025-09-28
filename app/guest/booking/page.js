import { redirect } from 'next/navigation';

export default function GuestBookingPage() {
  // This route is deprecated or an alias, so we permanently redirect to the main booking page.
  redirect('/booking');

  // This return is not strictly necessary as redirect() throws an error,
  // but it satisfies the requirement for a component to return a value.
  return null;
}