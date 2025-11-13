import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Profile from './Profile';
import { useAuth } from '@/hooks/useAuth';
import { profileService } from '@/services/profile.service';
import { useToast } from '@/hooks/use-toast';
import type { UpdateUserDetails } from '@/types';

export default function ProfileContainer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery({
    queryKey: ['/api/user-details', user?.uid],
    queryFn: () => profileService.getUserDetails(user!.uid),
    enabled: !!user,
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async ({
      details,
      logoFile,
    }: {
      details: UpdateUserDetails;
      logoFile?: File;
    }) => {
      if (!user) throw new Error('User not authenticated');

      let logoUrl = details.userLogo;

      // Upload logo if provided
      if (logoFile) {
        try {
          // Delete old logo if exists
          if (userDetails?.userLogo) {
            try {
              await profileService.deleteUserLogo(userDetails.userLogo);
            } catch (error) {
              console.error('Failed to delete old logo:', error);
            }
          }

          // Upload new logo
          logoUrl = await profileService.uploadUserLogo(user.uid, logoFile);
        } catch (error) {
          console.error('Logo upload error:', error);
          // If upload fails, show specific error about storage setup
          if (error instanceof Error && error.message.includes('row-level security')) {
            throw new Error(
              'Storage bucket not configured. Please set up the "logos" bucket in Supabase Storage with proper policies. See console for setup instructions.'
            );
          }
          throw error;
        }
      }

      // Update user details
      return profileService.updateUserDetails(user.uid, {
        ...details,
        userLogo: logoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-details', user?.uid] });
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const handleSave = async ({
    displayName,
    phone,
    logoFile,
  }: {
    displayName: string;
    phone: string;
    logoFile?: File;
  }) => {
    await updateProfileMutation.mutateAsync({
      details: {
        displayName: displayName || undefined,
        phone: phone || undefined,
        userLogo: userDetails?.userLogo,
      },
      logoFile,
    });
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <Profile
      user={user}
      userDetails={userDetails || null}
      onSave={handleSave}
      isLoading={isLoading}
    />
  );
}
