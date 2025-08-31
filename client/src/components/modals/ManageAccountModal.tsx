import React, { useState } from 'react';
import { X, Edit3, Trash2, Users, Shield, Clock, Settings } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput } from '../ui/glass-input';
import { useToast } from '../../hooks/use-toast';

interface ManageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: any;
  onUpdate: (updatedAccount: any) => void;
  onDelete: (accountId: string) => void;
}

const ManageAccountModal: React.FC<ManageAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  account, 
  onUpdate, 
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    gamertag: account?.gamertag || '',
    rank: account?.rank || 'Bronze',
    heroes: account?.heroes || [],
    status: account?.status || 'available'
  });
  const { toast } = useToast();

  const tabs = [
    { id: 'details', label: 'Details', icon: Edit3 },
    { id: 'sharing', label: 'Sharing', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Top 500'];
  const statusOptions = ['available', 'in-use', 'maintenance'];

  const heroes = [
    'Ana', 'Ashe', 'Baptiste', 'Bastion', 'Brigitte', 'Cassidy', 'D.Va', 'Doomfist',
    'Echo', 'Genji', 'Hanzo', 'Junkrat', 'Kiriko', 'Lucio', 'Mei', 'Mercy',
    'Moira', 'Orisa', 'Pharah', 'Reaper', 'Reinhardt', 'Roadhog', 'Sigma',
    'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjorn', 'Tracer', 'Widowmaker',
    'Winston', 'Wrecking Ball', 'Zarya', 'Zenyatta'
  ];

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onUpdate({ ...account, ...formData });
      setEditMode(false);
      
      toast({
        title: 'Account Updated',
        description: 'Account details have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onDelete(account._id);
      onClose();
      
      toast({
        title: 'Account Deleted',
        description: 'The account has been permanently removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHero = (hero: string) => {
    setFormData(prev => ({
      ...prev,
      heroes: prev.heroes.includes(hero)
        ? prev.heroes.filter(h => h !== hero)
        : [...prev.heroes, hero]
    }));
  };

  const renderDetailsTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-glass-foreground">Gamertag</label>
        <GlassInput
          value={formData.gamertag}
          onChange={(e) => setFormData(prev => ({ ...prev, gamertag: e.target.value }))}
          disabled={!editMode}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-glass-foreground">Rank</label>
        <select
          value={formData.rank}
          onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
          disabled={!editMode}
          className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        >
          {ranks.map(rank => (
            <option key={rank} value={rank} className="bg-background text-foreground">
              {rank}
            </option>
          ))}
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-glass-foreground">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          disabled={!editMode}
          className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        >
          {statusOptions.map(status => (
            <option key={status} value={status} className="bg-background text-foreground">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {editMode && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-glass-foreground">Main Heroes</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {heroes.map(hero => (
              <button
                key={hero}
                type="button"
                onClick={() => toggleHero(hero)}
                className={`p-2 text-xs rounded-lg border transition-colors ${
                  formData.heroes.includes(hero)
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-glass/10 border-glass/20 text-muted-foreground hover:bg-glass/20'
                }`}
              >
                {hero}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-between pt-4">
        <GlassButton
          variant="destructive"
          onClick={handleDelete}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </GlassButton>
        
        <div className="flex gap-2">
          {editMode ? (
            <>
              <GlassButton
                variant="default"
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    gamertag: account?.gamertag || '',
                    rank: account?.rank || 'Bronze',
                    heroes: account?.heroes || [],
                    status: account?.status || 'available'
                  });
                }}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </GlassButton>
            </>
          ) : (
            <GlassButton
              variant="primary"
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Edit Details
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );

  const renderSharingTab = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-glass-foreground mb-2">Shared Access</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This account is currently shared with {account?.sharedWith?.length || 0} users
        </p>
        
        {account?.sharedWith?.length > 0 ? (
          <div className="space-y-2">
            {/* Mock shared users */}
            <div className="p-3 bg-primary/5 rounded-lg flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-glass-foreground">TeamMate#4567</p>
                <p className="text-xs text-muted-foreground">Access expires in 5 days</p>
              </div>
              <GlassButton size="sm" variant="destructive">
                Revoke
              </GlassButton>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active shares</p>
        )}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-glass-foreground">Account Security</h3>
        
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-glass-foreground">Password Security</p>
              <p className="text-xs text-muted-foreground">Last updated 30 days ago</p>
            </div>
            <GlassButton size="sm">
              Update Password
            </GlassButton>
          </div>
        </div>
        
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-glass-foreground">Sharing Permissions</p>
              <p className="text-xs text-muted-foreground">Control who can access this account</p>
            </div>
            <GlassButton size="sm">
              Manage
            </GlassButton>
          </div>
        </div>
        
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-glass-foreground">Activity Logs</p>
              <p className="text-xs text-muted-foreground">View account usage history</p>
            </div>
            <GlassButton size="sm">
              View Logs
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <GlassCard className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="text-2xl">Manage {account.gamertag}</GlassCardTitle>
          <GlassButton size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </GlassButton>
        </GlassCardHeader>
        
        <GlassCardContent className="p-0">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-glass/20 p-4">
              <nav className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-glass-foreground hover:bg-glass/10'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'details' && renderDetailsTab()}
              {activeTab === 'sharing' && renderSharingTab()}
              {activeTab === 'settings' && renderSettingsTab()}
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default ManageAccountModal;