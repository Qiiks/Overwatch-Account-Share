import React, { useState } from 'react';
import { X, Settings, Shield, Bell, Eye, EyeOff } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput } from '../ui/glass-input';
import { useToast } from '../../hooks/use-toast';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [generalSettings, setGeneralSettings] = useState({
    username: 'CurrentUser',
    email: 'user@example.com',
    timezone: 'UTC',
    language: 'en'
  });
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    sessionTimeout: '30'
  });
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showOnlineStatus: true,
    allowFriendRequests: true,
    shareGameActivity: true
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    shareRequests: true,
    accountUpdates: true,
    securityAlerts: true,
    marketingEmails: false
  });
  const { toast } = useToast();

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye }
  ];

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Settings Updated',
        description: 'Your account settings have been saved successfully.',
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Username</label>
        <GlassInput
          value={generalSettings.username}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, username: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Email</label>
        <GlassInput
          type="email"
          value={generalSettings.email}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Timezone</label>
        <select
          value={generalSettings.timezone}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
          className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="UTC">UTC</option>
          <option value="EST">EST</option>
          <option value="PST">PST</option>
          <option value="GMT">GMT</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Language</label>
        <select
          value={generalSettings.language}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, language: e.target.value }))}
          className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Current Password</label>
        <div className="relative">
          <GlassInput
            type={showCurrentPassword ? 'text' : 'password'}
            value={securitySettings.currentPassword}
            onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">New Password</label>
        <div className="relative">
          <GlassInput
            type={showNewPassword ? 'text' : 'password'}
            value={securitySettings.newPassword}
            onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Confirm New Password</label>
        <GlassInput
          type="password"
          value={securitySettings.confirmPassword}
          onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
        />
      </div>

      <div>
        <label className="flex items-center space-x-2 cursor-pointer mb-3 block">
          <input
            type="checkbox"
            checked={securitySettings.twoFactorEnabled}
            onChange={(e) => setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
            className="rounded border-input bg-glass text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-glass-foreground">Enable Two-Factor Authentication</span>
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Session Timeout (minutes)</label>
        <select
          value={securitySettings.sessionTimeout}
          onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
          className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
        </select>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      {Object.entries(notificationSettings).map(([key, value]) => (
        <label key={key} className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-glass-foreground">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </span>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
            className="rounded border-input bg-glass text-primary focus:ring-primary/30"
          />
        </label>
      ))}
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-glass-foreground mb-3 block">Profile Visibility</label>
        <select
          value={privacySettings.profileVisibility}
          onChange={(e) => setPrivacySettings(prev => ({ ...prev, profileVisibility: e.target.value }))}
          className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="public">Public</option>
          <option value="friends">Friends Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      {Object.entries(privacySettings).filter(([key]) => key !== 'profileVisibility').map(([key, value]) => (
        <label key={key} className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-glass-foreground">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </span>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setPrivacySettings(prev => ({ ...prev, [key]: e.target.checked }))}
            className="rounded border-input bg-glass text-primary focus:ring-primary/30"
          />
        </label>
      ))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <GlassCard className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="text-2xl">Account Settings</GlassCardTitle>
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
              {activeTab === 'general' && renderGeneralTab()}
              {activeTab === 'security' && renderSecurityTab()}
              {activeTab === 'notifications' && renderNotificationsTab()}
              {activeTab === 'privacy' && renderPrivacyTab()}
              
              <div className="flex justify-center gap-3 mt-6 pt-6 border-t border-glass/20">
                <GlassButton type="button" variant="default" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton type="button" variant="primary" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default AccountSettingsModal;