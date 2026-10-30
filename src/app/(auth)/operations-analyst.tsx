import React from 'react';
import RoleLoginTemplate from '../../components/RoleLoginTemplate';

export default function OperationsAnalystLoginScreen() {
  return (
    <RoleLoginTemplate
      roleId="operations-analyst"
      defaultEmail="analyst@trustchain.com"
    />
  );
}
