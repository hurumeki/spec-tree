import { NavLink } from 'react-router-dom';

const Nav = () => {
  return (
    <nav className="top-nav">
      <div className="brand">spec-tree</div>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        Traceability Map
      </NavLink>
      <NavLink to="/import" className={({ isActive }) => (isActive ? 'active' : '')}>
        Import JSON
      </NavLink>
    </nav>
  );
};

export default Nav;
