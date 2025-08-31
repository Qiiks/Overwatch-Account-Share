import React, { useState } from 'react';
import { X, User, Shield, Gamepad2 } from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../ui/glass-card';
import { GlassButton } from '../ui/glass-button';
import { GlassInput } from '../ui/glass-input';
import { useToast } from '../../hooks/use-toast';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountData: any) => void;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    gamertag: '',
    email: '',
    password: '',
    rank: 'Bronze',
    mainHeroes: [] as string[],
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const { toast } = useToast();

  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster', 'Top 500'];
  const heroes = [
    'Ana', 'Ashe', 'Baptiste', 'Bastion', 'Brigitte', 'Cassidy', 'D.Va', 'Doomfist',
    'Echo', 'Genji', 'Hanzo', 'Junkrat', 'Kiriko', 'Lucio', 'Mei', 'Mercy',
    'Moira', 'Orisa', 'Pharah', 'Reaper', 'Reinhardt', 'Roadhog', 'Sigma',
    'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjorn', 'Tracer', 'Widowmaker',
    'Winston', 'Wrecking Ball', 'Zarya', 'Zenyatta'
  ];

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.gamertag) {
      newErrors.gamertag = 'Gamertag is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to add an account.',
          variant: 'destructive',
        });
        return;
      }

      const requestData = {
        battleTag: formData.gamertag,
        accountEmail: formData.email,
        accountPassword: formData.password,
        rank: formData.rank,
        mainHeroes: formData.mainHeroes,
        notes: formData.notes
      };

      const response = await fetch('/api/overwatch/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add account');
      }

      const savedAccount = await response.json();

      onSubmit(savedAccount);
      toast({
        title: 'Account Added',
        description: 'Your Overwatch account has been successfully added and saved.',
      });

      // Reset form
      setFormData({
        gamertag: '',
        email: '',
        password: '',
        rank: 'Bronze',
        mainHeroes: [],
        notes: ''
      });
      onClose();
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleHero = (hero: string) => {
    setFormData(prev => ({
      ...prev,
      mainHeroes: prev.mainHeroes.includes(hero)
        ? prev.mainHeroes.filter(h => h !== hero)
        : [...prev.mainHeroes, hero]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <GlassCard className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <GlassCardHeader className="flex flex-row items-center justify-between">
          <GlassCardTitle className="text-2xl">Add New Account</GlassCardTitle>
          <GlassButton size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </GlassButton>
        </GlassCardHeader>
        
        <GlassCardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gamertag" className="text-sm font-medium text-glass-foreground mb-3 block">
                  Gamertag
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <GlassInput
                    id="gamertag"
                    name="gamertag"
                    placeholder="YourGamertag#1234"
                    value={formData.gamertag}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
                {errors.gamertag && (
                  <p className="text-sm text-destructive mt-1">{errors.gamertag}</p>
                )}
              </div>

              <div>
                <label htmlFor="rank" className="text-sm font-medium text-glass-foreground mb-3 block">
                  Current Rank
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    id="rank"
                    name="rank"
                    value={formData.rank}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 bg-glass/10 border border-glass/20 rounded-lg text-glass-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {ranks.map(rank => (
                      <option key={rank} value={rank} className="bg-background text-foreground">
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-glass-foreground mb-3 block">
                Account Email
              </label>
              <GlassInput
                id="email"
                name="email"
                type="email"
                placeholder="account@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-glass-foreground mb-3 block">
                Account Password
              </label>
              <GlassInput
                id="password"
                name="password"
                type="password"
                placeholder="Account password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                This will be encrypted and stored securely for account sharing.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-glass-foreground mb-3 block flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Main Heroes (select up to 3)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {heroes.map(hero => (
                  <button
                    key={hero}
                    type="button"
                    onClick={() => toggleHero(hero)}
                    disabled={!formData.mainHeroes.includes(hero) && formData.mainHeroes.length >= 3}
                    className={`p-2 text-xs rounded-lg border transition-colors ${
                      formData.mainHeroes.includes(hero)
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-glass/10 border-glass/20 text-muted-foreground hover:bg-glass/20'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {hero}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium text-glass-foreground mb-3 block">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes about this account..."
                value={formData.notes}
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
                {isLoading ? 'Adding Account...' : 'Add Account'}
              </GlassButton>
            </div>
          </form>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default AddAccountModal;