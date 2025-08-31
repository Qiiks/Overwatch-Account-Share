import React, { useState } from 'react';
import { X, Share2, Users, Clock, Settings } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput } from '../ui/glass-input';
import { useToast } from '../../hooks/use-toast';

interface ShareAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: any;
}

const ShareAccountModal: React.FC<ShareAccountModalProps> = ({ isOpen, onClose, account }) => {
  const [shareData, setShareData] = useState({
    username: '',
    email: '',
    timeLimit: '7',
    permissions: ['login'],
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { toast } = useToast();

  const timeOptions = [
    { value: '1', label: '1 Day' },
    { value: '3', label: '3 Days' },
    { value: '7', label: '1 Week' },
    { value: '14', label: '2 Weeks' },
    { value: '30', label: '1 Month' },
    { value: '0', label: 'No Limit' }
  ];

  const permissionOptions = [
    { id: 'login', label: 'Login Access', description: 'Allow user to login to the account' },
    { id: 'settings', label: 'Settings Access', description: 'Allow user to modify game settings' },
    { id: 'friends', label: 'Friends Access', description: 'Allow user to manage friends list' },
    { id: 'competitive', label: 'Competitive Access', description: 'Allow user to play competitive matches' }
  ];

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!shareData.username && !shareData.email) {
      newErrors.recipient = 'Either username or email is required';
    }
    
    if (shareData.email && !/\S+@\S+\.\S+/.test(shareData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (shareData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Share Request Sent',
        description: `Account access has been shared successfully.`,
      });
      
      // Reset form
      setShareData({
        username: '',
        email: '',
        timeLimit: '7',
        permissions: ['login'],
        message: ''
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to share account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setShareData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePermission = (permissionId: string) => {
    setShareData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <GlassCard className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="text-2xl flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Account
          </GlassCardTitle>
          <GlassButton size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </GlassButton>
        </GlassCardHeader>
        
        <GlassCardContent>
          {account && (
            <div className="mb-6 p-4 bg-primary/5 rounded-lg">
              <h3 className="font-medium text-glass-foreground mb-1">Sharing Account:</h3>
              <p className="text-sm text-muted-foreground">{account.gamertag} • {account.rank}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="text-sm font-medium text-glass-foreground mb-3 block">
                  Recipient Username (Optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <GlassInput
                    id="username"
                    name="username"
                    placeholder="Enter username"
                    value={shareData.username}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">OR</div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-glass-foreground mb-3 block">
                  Recipient Email (Optional)
                </label>
                <GlassInput
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email address"
                  value={shareData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              {errors.recipient && (
                <p className="text-sm text-destructive mt-1">{errors.recipient}</p>
              )}
            </div>

            <div>
              <label htmlFor="timeLimit" className="text-sm font-medium text-glass-foreground mb-3 block flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Access Duration
              </label>
              <select
                id="timeLimit"
                name="timeLimit"
                value={shareData.timeLimit}
                onChange={handleChange}
                className="w-full p-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {timeOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-background text-foreground">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-glass-foreground mb-3 block flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Permissions
              </label>
              <div className="space-y-3">
                {permissionOptions.map(permission => (
                  <label key={permission.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareData.permissions.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="rounded border-input bg-glass text-primary focus:ring-primary/30 mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-glass-foreground">
                        {permission.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {permission.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.permissions && (
                <p className="text-sm text-destructive mt-1">{errors.permissions}</p>
              )}
            </div>

            <div>
              <label htmlFor="message" className="text-sm font-medium text-glass-foreground mb-3 block">
                Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Add a personal message..."
                value={shareData.message}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="flex justify-center gap-3">
              <GlassButton type="button" variant="default" onClick={onClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Sharing...' : 'Share Account'}
              </GlassButton>
            </div>
          </form>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default ShareAccountModal;