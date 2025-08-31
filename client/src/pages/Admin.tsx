import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Database, Settings, AlertTriangle, Activity, UserCheck, UserX, UserPlus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DotGrid from '../components/DotGrid';
import Navigation from '../components/Navigation';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '../components/ui/glass-card';
import { GlassButton } from '../components/ui/glass-button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';

interface UserData {
  _id: string;
  username: string;
  email: string;
  joinDate: string;
  accountsOwned: number;
  status: 'active' | 'suspended' | 'pending';
  lastLogin: string;
}

interface LogData {
  _id: string;
  message: string;
  level: string;
  timestamp: string;
}

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  role: z.enum(['User', 'Admin'], { required_error: 'Please select a role' }),
});

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<LogData[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalAccounts: 0,
    flaggedActivities: 0
  });
  const [loading, setLoading] = useState(true);
  const [enableRegistrations, setEnableRegistrations] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'User',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [userResponse, statsResponse, usersResponse, logsResponse, registrationResponse] = await Promise.all([
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/logs', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/registration-status', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (!userResponse.ok || !statsResponse.ok || !usersResponse.ok || !logsResponse.ok || !registrationResponse.ok) {
          throw new Error('Failed to fetch admin data');
        }

        const userData = await userResponse.json();
        if (!userData.data || !userData.data.isAdmin) {
          toast({
            title: 'Access Denied',
            description: 'You do not have administrator privileges.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        setUser(userData.data);
        setStats(await statsResponse.json());
        setUsers(await usersResponse.json());
        setLogs(await logsResponse.json());
        setEnableRegistrations(await registrationResponse.json());

      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to load admin panel data.",
          variant: "destructive",
        });
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-400/30">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/20 text-red-400 border-red-400/30">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-400/30">Pending</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const handleUserAction = async (userId: string, status: string) => {
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => u._id === userId ? updatedUser : u));
        toast({
          title: 'User Updated',
          description: `User ${updatedUser.username} has been ${status}.`,
        });
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to update user status.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRegistrations = async () => {
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch('/api/admin/toggle-registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !enableRegistrations }),
      });

      if (response.ok) {
        setEnableRegistrations(!enableRegistrations);
        toast({
          title: 'Registration Settings Updated',
          description: `User registrations are now ${!enableRegistrations ? 'enabled' : 'disabled'}.`,
        });
      } else {
        throw new Error('Failed to toggle registrations');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to update registration settings.',
        variant: 'destructive',
      });
    }
  };

  const onSubmitCreateUser = async (values: z.infer<typeof createUserSchema>) => {
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers([...users, newUser]);
        form.reset();
        toast({
          title: 'User Created',
          description: `User ${newUser.username} has been created successfully.`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <DotGrid />
        <div className="animate-pulse text-primary">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <DotGrid />
      <Navigation user={user} onLogout={handleLogout} />
      
      <main className="relative z-10 pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bebas tracking-wide text-glass-foreground mb-2">
              ADMIN PANEL
            </h1>
            <p className="text-muted-foreground">
              System administration and user management dashboard.
            </p>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Total Users</GlassCardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-primary">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered accounts</p>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Active Users</GlassCardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-primary">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Total Accounts</GlassCardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-primary">{stats.totalAccounts}</div>
                <p className="text-xs text-muted-foreground">Shared game accounts</p>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Flagged Activities</GlassCardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-yellow-400">{stats.flaggedActivities}</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 mb-8">
            <GlassButton variant="primary" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Settings
            </GlassButton>
            <GlassButton variant="default" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Audit
            </GlassButton>
            <GlassButton variant="default" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Backup
            </GlassButton>
          </div>

          {/* Registration Settings */}
          <div className="mb-8">
            <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-6">
              REGISTRATION SETTINGS
            </h2>
            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-glass-foreground">Enable Registrations</h3>
                    <p className="text-sm text-muted-foreground">Allow new users to register accounts</p>
                  </div>
                  <Switch
                    checked={enableRegistrations}
                    onCheckedChange={handleToggleRegistrations}
                  />
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* User Management */}
          <div className="mb-8">
            <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-6">
              USER MANAGEMENT
            </h2>

            {/* Create User Form */}
            <GlassCard className="mb-6">
              <GlassCardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-glass-foreground">Create New User</h3>
                </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitCreateUser)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="User">User</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <GlassButton type="submit" className="w-full md:w-auto">
                      Create User
                    </GlassButton>
                  </form>
                </Form>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="space-y-4">
                  {users.map((userData) => (
                    <div key={userData._id} className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-glass-foreground">{userData.username}</h3>
                          <p className="text-sm text-muted-foreground">{userData.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined: {userData.joinDate} • {userData.accountsOwned} accounts • Last login: {userData.lastLogin}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusBadge(userData.status)}
                        
                        <div className="flex gap-2">
                          {userData.status !== 'suspended' && (
                            <GlassButton
                              size="sm"
                              variant="default"
                              onClick={() => handleUserAction(userData._id, 'suspended')}
                              className="flex items-center gap-1"
                            >
                              <UserX className="h-3 w-3" />
                              Suspend
                            </GlassButton>
                          )}
                          
                          {userData.status === 'suspended' && (
                            <GlassButton
                              size="sm"
                              variant="primary"
                              onClick={() => handleUserAction(userData._id, 'active')}
                              className="flex items-center gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              Activate
                            </GlassButton>
                          )}
                          
                          <GlassButton
                            size="sm"
                            onClick={() => navigate(`/user/${userData._id}`)}
                          >
                            Details
                          </GlassButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* System Logs */}
          <div>
            <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-6">
              RECENT SYSTEM ACTIVITIES
            </h2>
            
            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="space-y-4">
                  {logs.slice(0, 5).map(log => (
                    <div key={log._id} className="flex items-center gap-4 p-3 rounded-lg bg-primary/5">
                      {log.level === 'warn' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                      {log.level === 'info' && <Shield className="h-5 w-5 text-green-400" />}
                      {log.level === 'error' && <AlertTriangle className="h-5 w-5 text-red-400" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;