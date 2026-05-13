import React from 'react';
import { createBrowserRouter, RouterProvider, redirect } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import VerifyEmail from './pages/VerifyEmail';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DocumentationPage from './pages/DocumentationPage';

const API = import.meta.env.VITE_API_URL || '/api';

// Redirect to dashboard if user is already logged in
const landingLoader = async () => {
  try {
    const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
    if (response.ok) {
      const user = await response.json();
      if (user.is_guest || user.is_verified) {
        return redirect("/dashboard");
      }
      // If logged in but not verified, stay on landing/login page
      // so they can use the "Back to Sign In" (Logout) button if needed.
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
    
    const user = await response.json(); // has: { name, email, avatar, is_guest, is_verified }
    
    if (!user.is_guest && !user.is_verified) {
      return redirect("/verify-email");
    }
    
    return user;
  } catch (error) {
    console.error(error);
    return redirect("/");
  }
};

const verifyLoader = async () => {
  try {
    const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
    if (!response.ok) return redirect("/login");
    
    const user = await response.json();
    if (user.is_verified) return redirect("/dashboard");
    if (user.is_guest) return redirect("/dashboard");
    
    return user;
  } catch (error) {
    return redirect("/login");
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
    path: "/dashboard/:sessionId?",
    element: <Dashboard />,
    loader: dashboardLoader
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />,
    loader: verifyLoader
  },
  {
    path: "/privacy",
    element: <PrivacyPage />
  },
  {
    path: "/terms",
    element: <TermsPage />
  },
  {
    path: "/docs",
    element: <DocumentationPage />
  }
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
