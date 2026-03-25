/**
 * Utilitários para chamadas de API autenticadas e seguras.
 */

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('synka-token');
  }
  return null;
};

export const setAuthSession = (token: string, user: any) => {
  localStorage.setItem('synka-token', token);
  localStorage.setItem('synka-user', JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem('synka-token');
  localStorage.removeItem('synka-user');
  if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
    window.location.href = '/auth/login';
  }
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    // Sessão expirada ou acesso negado entre tenants
    clearAuthSession();
    throw new Error('Sessão expirada. Redirecionando...');
  }

  return response;
};
