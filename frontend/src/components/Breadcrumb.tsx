import React from 'react';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useLocation, Link } from 'react-router-dom';

interface BreadcrumbItem {
  path: string;
  name: string;
}

const Breadcrumb: React.FC = () => {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x);

    const breadcrumbs: BreadcrumbItem[] = [
      { path: '/', name: 'Home' },
    ];

    // Build breadcrumb items
    let currentPath = '';
    for (let i = 0; i < pathnames.length; i++) {
      currentPath += `/${pathnames[i]}`;
      const name = pathnames[i]
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        path: currentPath,
        name: name,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null; // Don't show on home page
  }

  const itemRender = (item: BreadcrumbItem) => {
    const isLast = item.path === location.pathname;
    return isLast ? (
      <span>{item.name}</span>
    ) : (
      <Link to={item.path}>{item.name}</Link>
    );
  };

  return (
    <AntBreadcrumb
      style={{ margin: '16px 0' }}
      itemRender={itemRender}
      items={breadcrumbs.map((item) => ({
        title: item.name,
        path: item.path,
      }))}
    />
  );
};

export default Breadcrumb;
