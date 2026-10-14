import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App.tsx';
import { CartProvider } from './lib/cart.tsx';
import './index.css';

const router = createBrowserRouter([{ path: '*', element: <App /> }], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  </StrictMode>,
);
