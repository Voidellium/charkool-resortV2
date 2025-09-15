'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const Header = () => {
    const router = useRouter();

    return (
        <header className="header">
            <div className="logo">
                <img src="/logo.png" alt="Logo" />
                <span>Resort Name</span>
            </div>
            <nav className="nav">
                <span onClick={() => router.push('/guest/dashboard')}>Dashboard</span>
                <span onClick={() => router.push('/guest/history')}>History</span>
                <span onClick={() => router.push('/guest/payment')}>Payment</span>
                <span onClick={() => router.push('/guest/chat')}>Chat</span>
            </nav>
            <div className="user-info">
                <button onClick={() => router.push('/guest/profile')} className="profile-button">Profile</button>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="signout-button">Sign Out</button>
            </div>
            <style jsx>{`
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #f7f7f7;
                    padding: 1rem 2rem;
                    border-bottom: 1px solid #e0e0e0;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    color: #333;
                }
                .logo {
                    display: flex;
                    align-items: center;
                    font-weight: bold;
                    font-size: 1.5rem;
                }
                .logo img {
                    height: 40px;
                    margin-right: 10px;
                }
                .nav {
                    display: flex;
                    gap: 2rem;
                }
                .nav span {
                    cursor: pointer;
                    font-size: 1rem;
                    color: #555;
                    transition: color 0.2s ease-in-out;
                }
                .nav span:hover {
                    color: #000;
                }
                .user-info {
                    display: flex;
                    gap: 1rem;
                }
                .profile-button, .signout-button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: background-color 0.2s ease-in-out;
                }
                .profile-button {
                    background-color: #ffc107;
                    color: #333;
                }
                .profile-button:hover {
                    background-color: #e0a800;
                }
                .signout-button {
                    background-color: #dc3545;
                    color: white;
                }
                .signout-button:hover {
                    background-color: #c82333;
                }
            `}</style>
        </header>
    );
};

export default function Profile() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [preferences, setPreferences] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/guest/me');
                if (!res.ok) throw new Error('Failed to fetch user');
                const data = await res.json();
                setUser(data.guest);
                setName(data.guest.name);
                setEmail(data.guest.email);
                setPreferences(data.guest.preferences || '');
            } catch (err) {
                console.error(err);
                router.push('/login');
            }
        }
        fetchUser();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, preferences }),
            });

            if (res.ok) {
                setSuccess('Profile updated successfully');
                setUser({ ...user, name, email, preferences });
            } else {
                const data = await res.json();
                setError(data.error || 'Update failed');
            }
        } catch (err) {
            setError('Something went wrong');
        }
    };

    if (!user) {
        return (
            <div className="loading-container">
                <p>Loading...</p>
                <style jsx>{`
                    .loading-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-size: 1.5rem;
                        color: #555;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <Header />
            <main className="main-content">
                <h1>User Profile</h1>
                <div className="profile-card">
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="name">Name:</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="email">Email:</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="preferences">Preferences:</label>
                            <textarea
                                id="preferences"
                                value={preferences}
                                onChange={(e) => setPreferences(e.target.value)}
                                placeholder="e.g., Non-smoking room, late checkout"
                                className="form-textarea"
                            />
                        </div>
                        <button type="submit" className="submit-button">
                            Update Profile
                        </button>
                    </form>
                    {error && <p className="message error">{error}</p>}
                    {success && <p className="message success">{success}</p>}
                </div>
            </main>

            <style jsx>{`
                .profile-container {
                    background-color: #f0f2f5;
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .main-content {
                    padding: 2rem;
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 1.5rem;
                    border-bottom: 2px solid #ffc107;
                    padding-bottom: 0.5rem;
                }
                .profile-card {
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 2rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }
                .profile-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                }
                .form-label {
                    font-size: 1rem;
                    font-weight: 600;
                    color: #555;
                    margin-bottom: 0.5rem;
                }
                .form-input, .form-textarea {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #e0e0e0;
                    border-radius: 5px;
                    font-size: 1rem;
                    transition: border-color 0.2s ease-in-out;
                }
                .form-input:focus, .form-textarea:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }
                .form-textarea {
                    resize: vertical;
                    min-height: 100px;
                }
                .submit-button {
                    padding: 12px 24px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1.1rem;
                    font-weight: 500;
                    transition: background-color 0.2s ease-in-out;
                    align-self: flex-start;
                }
                .submit-button:hover {
                    background-color: #0056b3;
                }
                .message {
                    margin-top: 1rem;
                    padding: 1rem;
                    border-radius: 5px;
                    font-weight: 500;
                }
                .message.success {
                    background-color: #d4edda;
                    color: #155724;
                }
                .message.error {
                    background-color: #f8d7da;
                    color: #721c24;
                }
            `}</style>
        </div>
    );
}