import React from 'react';
import RoleLoginTemplate from '../../components/RoleLoginTemplate';

export default function WarehouseOperatorLoginScreen() {
  return (
    <RoleLoginTemplate
      roleId="warehouse-operator"
      defaultEmail="warehouse@trustchain.com"
    />
  );
}
