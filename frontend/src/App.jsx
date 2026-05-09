import React from 'react';
import { createBrowserRouter, RouterProvider, redirect } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

const API = import.meta.env.VITE_API_URL || '/api';

// Redirect to dashboard if user is already logged in
const landingLoader = async () => {
  try {
    const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
    if (response.ok) {
      return redirect("/dashboard");
    }
  } catch (error) {
    console.error("Auth check failed:", error);
  }
  return null;
};

// Use a loader to fetch the current user profile WITHOUT using useEffect!
const dashboardLoader = async () => {
  try {
    const response = await fetch(`${API}/auth/me`, {
      credentials: 'include' // Send HttpOnly cookies (access_token or guest_token)
    });
    
    if (!response.ok) {
      // 401 means unauthenticated - redirect to landing page
      return redirect("/");
    }
    
    return await response.json(); // has: { name, email, avatar, is_guest }
  } catch (error) {
    console.error(error);
    return redirect("/");
  }
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    loader: landingLoader
  },
  {
    path: "/login",
    element: <AuthPage />,
    loader: landingLoader
  },
  {
    path: "/register",
    element: <AuthPage />,
    loader: landingLoader
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    loader: dashboardLoader
  },
  {
    path: "/privacy",
    element: <PrivacyPage />
  },
  {
    path: "/terms",
    element: <TermsPage />
  }
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
