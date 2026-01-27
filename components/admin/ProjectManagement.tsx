import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { AdminProject } from '../../types';

interface UserOption {
    id: string;
    email: string;
}

const ProjectManagement: React.FC = () => {
    const { state } = useAppState();
    const [projects, setProjects] = useState<AdminProject[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Search/filter
    const [searchTerm, setSearchTerm] = useState('');

    // Reassign modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
    const [newUserId, setNewUserId] = useState('');

    const fetchProjects = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('admin_get_all_projects');

            if (error) throw error;
            setProjects(data || []);
        } catch (e) {
            console.error("Failed to fetch projects:", e);
            setError(e instanceof Error ? e.message : "Failed to load projects. Make sure you have admin privileges.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.functions.invoke('get-users', { method: 'GET' });

            if (error) throw error;
            setUsers((data.users || []).map((u: { id: string; email: string }) => ({ id: u.id, email: u.email })));
        } catch (e) {
            console.error("Failed to fetch users:", e);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchUsers();
    }, []);

    const openReassignModal = (project: AdminProject) => {
        setSelectedProject(project);
        setNewUserId(project.user_id);
        setIsModalOpen(true);
        setError(null);
        setSuccessMessage(null);
    };

    const handleReassign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject || !newUserId) return;

        // Prevent reassigning to same user
        if (newUserId === selectedProject.user_id) {
            setError("Project is already assigned to this user.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('admin_reassign_project', {
                p_project_id: selectedProject.id,
                p_new_user_id: newUserId
            });

            if (error) throw error;

            const result = data as { success?: boolean; maps_updated?: number; error?: string } | null;
            if (result?.success) {
                const targetUser = users.find(u => u.id === newUserId);
                setSuccessMessage(`Project "${selectedProject.project_name}" reassigned to ${targetUser?.email || 'new user'}. ${result.maps_updated} map(s) updated.`);
                setIsModalOpen(false);
                fetchProjects(); // Refresh list
            } else {
                throw new Error(result?.error || 'Reassignment failed');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Reassignment failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter projects by search term
    const filteredProjects = useMemo(() => {
        if (!searchTerm.trim()) return projects;
        const term = searchTerm.toLowerCase();
        return projects.filter(p =>
            p.project_name.toLowerCase().includes(term) ||
            p.domain?.toLowerCase().includes(term) ||
            p.user_email?.toLowerCase().includes(term)
        );
    }, [projects, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Project Management</h3>
                <div className="flex gap-2">
                    <Input
                        placeholder="Search projects or users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64 text-sm"
                    />
                    <Button className="text-xs py-2" onClick={fetchProjects} variant="secondary">
                        {isLoading ? <Loader className="w-4 h-4" /> : 'Refresh'}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded text-sm text-red-300">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-3 bg-green-900/20 border border-green-700/50 rounded text-sm text-green-300">
                    {successMessage}
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 bg-gray-800/50 border border-blue-500/30">
                    <h4 className="text-xs uppercase text-blue-400 font-bold">Total Projects</h4>
                    <p className="text-2xl font-bold text-white">{projects.length}</p>
                </Card>
                <Card className="p-4 bg-gray-800/50 border border-purple-500/30">
                    <h4 className="text-xs uppercase text-purple-400 font-bold">Total Maps</h4>
                    <p className="text-2xl font-bold text-white">
                        {projects.reduce((sum, p) => sum + (p.map_count || 0), 0)}
                    </p>
                </Card>
                <Card className="p-4 bg-gray-800/50 border border-green-500/30">
                    <h4 className="text-xs uppercase text-green-400 font-bold">Unique Users</h4>
                    <p className="text-2xl font-bold text-white">
                        {new Set(projects.map(p => p.user_id)).size}
                    </p>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 text-gray-200 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3">Project Name</th>
                                <th className="px-4 py-3">Domain</th>
                                <th className="px-4 py-3">Owner</th>
                                <th className="px-4 py-3 text-center">Maps</th>
                                <th className="px-4 py-3">Created</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center">
                                        <Loader className="w-6 h-6 mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center italic">
                                        {searchTerm ? 'No projects match your search.' : 'No projects found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map(project => (
                                    <tr key={project.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-white font-medium">
                                            {project.project_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            {project.domain || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-blue-300">{project.user_email || 'Unknown'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">
                                                {project.map_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openReassignModal(project)}
                                                className="text-blue-400 hover:text-blue-300 text-xs underline"
                                            >
                                                Reassign
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Reassign Modal */}
            {isModalOpen && selectedProject && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
                    <Card className="w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">Reassign Project</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            Reassign "<span className="text-white font-medium">{selectedProject.project_name}</span>" to a different user.
                            This will also update ownership of all {selectedProject.map_count || 0} topical map(s).
                        </p>

                        <form onSubmit={handleReassign} className="space-y-4">
                            <div>
                                <Label>Current Owner</Label>
                                <Input
                                    value={selectedProject.user_email || 'Unknown'}
                                    disabled
                                    className="bg-gray-700/50"
                                />
                            </div>
                            <div>
                                <Label>New Owner</Label>
                                <Select
                                    value={newUserId}
                                    onChange={e => setNewUserId(e.target.value)}
                                    required
                                >
                                    <option value="">Select a user...</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.email} {user.id === selectedProject.user_id ? '(current)' : ''}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {error && (
                                <div className="p-2 bg-red-900/20 border border-red-700/50 rounded text-xs text-red-300">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || !newUserId || newUserId === selectedProject.user_id}>
                                    {isSubmitting ? <Loader className="w-4 h-4" /> : 'Reassign Project'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ProjectManagement;
