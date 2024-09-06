import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './components/Header/Header';

const Layout: React.FC = () => {
  return (
    <div className='bg-black text-white'>
      <Header />
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
