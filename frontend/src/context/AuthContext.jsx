import { createContext, useContext, useEffect, useReducer } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  accessToken: localStorage.getItem('accessToken') || null,
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER': return { ...state, user: action.payload, loading: false };
    case 'SET_TOKEN': return { ...state, accessToken: action.payload };
    case 'LOGOUT': return { user: null, accessToken: null, loading: false };
    case 'DONE_LOADING': return { ...state, loading: false };
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.accessToken) {
      authApi.me()
        .then(({ data }) => dispatch({ type: 'SET_USER', payload: data.data }))
        .catch(() => { localStorage.clear(); dispatch({ type: 'LOGOUT' }); });
    } else {
      dispatch({ type: 'DONE_LOADING' });
    }
  }, []);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    dispatch({ type: 'SET_TOKEN', payload: data.data.accessToken });
    dispatch({ type: 'SET_USER', payload: data.data.user });
    return data.data;
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    dispatch({ type: 'SET_TOKEN', payload: data.data.accessToken });
    dispatch({ type: 'SET_USER', payload: data.data.user });
    return data.data;
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    await authApi.logout({ refreshToken: refresh }).catch(() => {});
    localStorage.clear();
    dispatch({ type: 'LOGOUT' });
  };

  const can = (...roles) => roles.includes(state.user?.role);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
