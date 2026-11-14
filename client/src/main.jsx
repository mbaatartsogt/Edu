import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { UserProvider } from './lib/user';
import { CartProvider } from './lib/cart';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* reducedMotion="user" — хэрэглэгч анимэйшн багасгасан бол хүндэтгэнэ */}
      <MotionConfig reducedMotion="user">
        <UserProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </UserProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>,
);
