import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

// Use a loader to fetch the current user profile WITHOUT using useEffect!
const dashboardLoader = async () => {
  try {
    const response = await fetch('http://localhost:8000/auth/me', {
      credentials: 'include' // Send HttpOnly cookies (access_token or guest_token)
    });
    
    if (!response.ok) {
      // 401 means unauthenticated - redirect to landing page
      window.location.href = '/';
      return null;
    }
    
    return await response.json(); // has: { name, email, avatar, is_guest }
  } catch (error) {
    console.error(error);
    return null;
  }
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
    loader: dashboardLoader
  }
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
