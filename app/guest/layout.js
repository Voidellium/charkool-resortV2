import GuestHeader from '../../components/GuestHeader';

export default function GuestLayout({ children }) {
  return (
    <>
      <GuestHeader />
      <main>
        {children}
      </main>
    </>
  );
}