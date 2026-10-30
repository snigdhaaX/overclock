import React from 'react';
import RoleLoginTemplate from '../../components/RoleLoginTemplate';

export default function AdministratorLoginScreen() {
  return (
    <RoleLoginTemplate
      roleId="administrator"
      defaultEmail="admin@trustchain.com"
    />
  );
}
