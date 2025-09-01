import { useMemo } from 'react';

export const usePermissions = () => {
  const authUser = JSON.parse(sessionStorage.getItem('authUser') || '{}');
  
  const permissions = useMemo(() => {
    const role = authUser?.role;
    
    return {
      // Role checks
      isAdmin1: role === 'Admin1',
      isAdmin2: role === 'Admin2', 
      isAdmin3: role === 'Admin3',
      isAdmin4: role === 'Admin4',
      isTeacher: role === 'Teacher',
      isDiscipline: role === 'Discipline',
      isPsychosocialist: role === 'Psychosocialist',
      
      // Permission checks
      canEdit: !(role === 'Admin1'), // Admin1 cannot edit anything
      canDelete: !(role === 'Admin1'), // Admin1 cannot delete anything
      canCreate: !(role === 'Admin1'), // Admin1 cannot create anything
      canView: true, // All roles can view
      
      // Specific permissions for Admin1
      isReadOnly: role === 'Admin1',
      
      // Get user info
      user: authUser,
      role: role
    };
  }, [authUser]);
  
  return permissions;
};

export default usePermissions;
