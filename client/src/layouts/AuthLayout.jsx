import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout-box">
        <Outlet />
      </div>
    </div>
  );
}
