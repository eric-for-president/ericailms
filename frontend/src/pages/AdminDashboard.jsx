import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Users, Mail, Trash2, Copy, Check, UserPlus, Shield } from 'lucide-react';

const AdminDashboard = () => {
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copiedToken, setCopiedToken] = useState(null);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('student');
    const [inviteExpiry, setInviteExpiry] = useState(48);

    const API_URL = 'http://localhost:5173/api/admin'; // Adjust to your backend URL

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
        setLoading(false);
    };

    // Fetch invitations
    const fetchInvitations = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/invitations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setInvitations(data.invitations);
            }
        } catch (error) {
            console.error('Error fetching invitations:', error);
        }
        setLoading(false);
    };

    // Generate invitation
    const generateInvitation = async () => {
        if (!inviteEmail) {
            alert('Please enter an email');
            return;
        }
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/invitations/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole,
                    expiresInHours: inviteExpiry
                })
            });
            const data = await response.json();
            if (data.success) {
                alert('Invitation created! Link copied to clipboard.');
                navigator.clipboard.writeText(data.inviteLink);
                setInviteEmail('');
                setInviteRole('student');
                setInviteExpiry(48);
                fetchInvitations();
            } else {
                alert(data.message || 'Failed to create invitation');
            }
        } catch (error) {
            console.error('Error generating invitation:', error);
            alert('Error generating invitation');
        }
    };

    const copyInviteLink = (link, token) => {
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                alert('User deleted successfully');
                fetchUsers();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const revokeInvitation = async (token) => {
        if (!window.confirm('Revoke this invitation?')) return;
        try {
            const authToken = await getToken();
            const response = await fetch(`${API_URL}/invitations/${token}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();
            if (data.success) {
                alert('Invitation revoked');
                fetchInvitations();
            }
        } catch (error) {
            console.error('Error revoking invitation:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'invitations') fetchInvitations();
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                        <Shield className="w-10 h-10 text-blue-600" />
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-600">Manage users and invitations</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            activeTab === 'users'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Users className="w-5 h-5" />
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('invitations')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            activeTab === 'invitations'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Mail className="w-5 h-5" />
                        Invitations
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {activeTab === 'users' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">All Users ({users.length})</h2>
                            {loading ? (
                                <p className="text-gray-500">Loading...</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="text-left py-4 px-4 font-semibold text-gray-700">Name</th>
                                            <th className="text-left py-4 px-4 font-semibold text-gray-700">Email</th>
                                            <th className="text-left py-4 px-4 font-semibold text-gray-700">Role</th>
                                            <th className="text-left py-4 px-4 font-semibold text-gray-700">Verified</th>
                                            <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {users.map((user) => (
                                            <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-4 px-4">{user.name}</td>
                                                <td className="py-4 px-4 text-gray-600">{user.email}</td>
                                                <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                    user.role === 'educator' ? 'bg-green-100 text-green-700' :
                                        'bg-blue-100 text-blue-700'
                            }`}>
                              {user.role}
                            </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    {user.emailVerified ?
                                                        <span className="text-green-600 font-medium">✓ Verified</span> :
                                                        <span className="text-orange-600 font-medium">Pending</span>
                                                    }
                                                </td>
                                                <td className="py-4 px-4">
                                                    <button
                                                        onClick={() => deleteUser(user._id)}
                                                        className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'invitations' && (
                        <div>
                            {/* Invitation Form */}
                            <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                                    <UserPlus className="w-6 h-6" />
                                    Generate New Invitation
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="student">Student</option>
                                                <option value="educator">Educator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Expires In (hours)</label>
                                            <input
                                                type="number"
                                                value={inviteExpiry}
                                                onChange={(e) => setInviteExpiry(parseInt(e.target.value) || 48)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={generateInvitation}
                                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
                                    >
                                        Generate Invitation Link
                                    </button>
                                </div>
                            </div>

                            {/* Invitations List */}
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                All Invitations ({invitations.length})
                            </h2>
                            {loading ? (
                                <p className="text-gray-500">Loading...</p>
                            ) : (
                                <div className="space-y-4">
                                    {invitations.map((inv) => (
                                        <div
                                            key={inv.token}
                                            className={`p-6 rounded-xl border-2 ${
                                                inv.used ? 'bg-gray-50 border-gray-300' :
                                                    inv.expired ? 'bg-red-50 border-red-300' :
                                                        'bg-green-50 border-green-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-gray-800 text-lg">{inv.email}</p>
                                                    <p className="text-sm text-gray-600">
                                                        Role: <span className="font-medium">{inv.role}</span>
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => copyInviteLink(inv.inviteLink, inv.token)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                    >
                                                        {copiedToken === inv.token ? (
                                                            <><Check className="w-4 h-4" /> Copied!</>
                                                        ) : (
                                                            <><Copy className="w-4 h-4" /> Copy Link</>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => revokeInvitation(inv.token)}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 text-sm">
                        <span className={`px-3 py-1 rounded-full font-medium ${
                            inv.used ? 'bg-gray-200 text-gray-700' :
                                inv.expired ? 'bg-red-200 text-red-700' :
                                    'bg-green-200 text-green-700'
                        }`}>
                          {inv.used ? '✓ Used' : inv.expired ? '✗ Expired' : '✓ Active'}
                        </span>
                                                <span className="text-gray-600">
                          Expires: {new Date(inv.expiresAt).toLocaleString()}
                        </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;