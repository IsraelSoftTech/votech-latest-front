import { useMemo } from 'react';

export const usePermissions = () => {
  const permissions = useMemo(() => {
    try {
      const authUser = JSON.parse(sessionStorage.getItem('authUser') || '{}');
      const isReadOnly = authUser.role === 'Admin1';
      
      return {
        isReadOnly,
        userRole: authUser.role,
        userId: authUser.id
      };
    } catch (error) {
      console.error('Error parsing auth user:', error);
      return {
        isReadOnly: false,
        userRole: null,
        userId: null
      };
    }
  }, []);

  return permissions;
};
