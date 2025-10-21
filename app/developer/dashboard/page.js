'use client';
import { signOut } from 'next-auth/react';
import { useNavigationGuard } from '../../../hooks/useNavigationGuard.simple';
import { NavigationConfirmationModal } from '../../../components/CustomModals';

export default function DeveloperDashboard() {
  // Logout Navigation Guard
  const navigationGuard = useNavigationGuard({
    shouldPreventNavigation: () => true,
    onNavigationAttempt: () => {
      console.log('Developer Dashboard: Navigation attempt detected, showing logout confirmation');
    },
    customAction: () => signOut({ callbackUrl: '/login' }),
    context: 'logout',
    message: 'Are you sure you want to log out of your Developer dashboard?'
  });
  return (
    <div className="developer-dashboard">
      <h1>Developer Dashboard</h1>
      <p>Manage system configurations, logs, and developer-level settings.</p>

      <style jsx>{`
        .developer-dashboard {
          padding: 4rem 2rem;
          font-family: Arial, sans-serif;
        }
      `}</style>

      {/* Logout Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context="logout"
        message={navigationGuard.message}
      />
    </div>
  )
}
