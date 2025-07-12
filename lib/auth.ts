// lib/auth.ts
import Cookies from 'js-cookie';

export interface LoginResponse {
  status: boolean;
  message: string;
  token: string;
  data: {
    id: number;
    name: string;
    email: string;
    role_id: number;
    email_verified_at: string;
    created_at: string;
    updated_at: string;
    role: {
      id: number;
      name: string;
      slug: string;
      description: string;
      created_at: string;
      updated_at: string;
      permissions: Array<{
        id: number;
        name: string;
        slug: string;
        description: string | null;
        created_at: string;
        updated_at: string;
        pivot?: {
          role_id: number;
          permission_id: number;
        };
      }>;
    };
  };
}

// Function untuk menyimpan data login ke cookies
export const saveLoginData = (response: LoginResponse) => {
  try {
    // Simpan token
    Cookies.set('token', response.token, { expires: 7 }); // Expires in 7 days
    
    // Simpan user data
    Cookies.set('user', JSON.stringify(response.data), { expires: 7 });
    
    console.log('Login data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving login data:', error);
    return false;
  }
};

// Function untuk mengambil user data dari cookies
export const getUserData = () => {
  try {
    const userData = Cookies.get('user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Function untuk mengambil token dari cookies
export const getToken = () => {
  return Cookies.get('token');
};

// Function untuk logout (hapus cookies)
export const logout = () => {
  Cookies.remove('token');
  Cookies.remove('user');
  console.log('User logged out successfully');
};

// Function untuk cek apakah user sudah login
export const isAuthenticated = () => {
  const token = getToken();
  const userData = getUserData();
  return token && userData;
};

// Function untuk cek permission user
export const hasPermission = (permissionSlug: string) => {
  const userData = getUserData();
  if (!userData || !userData.role || !userData.role.permissions) {
    return false;
  }
  
  return userData.role.permissions.some(
    (permission: { slug: string }) => permission.slug === permissionSlug
  );
};

// Function untuk mendapatkan semua permissions user
export const getUserPermissions = () => {
  const userData = getUserData();
  if (!userData || !userData.role || !userData.role.permissions) {
    return [];
  }
  
  return userData.role.permissions.map((permission: { slug: string }) => permission.slug);
};