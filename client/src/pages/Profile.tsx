import { useState, useEffect } from 'react';
import { User, Phone, Image, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserProfile, UserDetails } from '@/types';

interface ProfileProps {
  user: UserProfile;
  userDetails: UserDetails | null;
  onSave: (details: { displayName: string; phone: string; logoFile?: File }) => Promise<void>;
  isLoading?: boolean;
}

export default function Profile({
  user,
  userDetails,
  onSave,
  isLoading = false,
}: ProfileProps) {
  const [displayName, setDisplayName] = useState(
    userDetails?.displayName || user.displayName || ''
  );
  const [phone, setPhone] = useState(userDetails?.phone || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    userDetails?.userLogo || user.photoURL || null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Update form fields when userDetails loads or changes
  useEffect(() => {
    if (userDetails) {
      setDisplayName(userDetails.displayName || user.displayName || '');
      setPhone(userDetails.phone || '');
      setLogoPreview(userDetails.userLogo || user.photoURL || null);
    }
  }, [userDetails, user.displayName, user.photoURL]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        displayName,
        phone,
        logoFile: logoFile || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your display name, phone number, and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo/Avatar Upload */}
              <div className="space-y-4">
                <Label htmlFor="logo">Profile Picture</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={logoPreview || undefined} alt={displayName || user.email} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(displayName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label
                      htmlFor="logo"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New Picture
                    </Label>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  <User className="h-4 w-4 inline mr-2" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || isLoading}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-sm font-medium mt-1">{user.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">User ID</Label>
              <p className="text-xs font-mono mt-1 break-all">{user.uid}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
