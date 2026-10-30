import React from 'react';
import RoleLoginTemplate from '../../components/RoleLoginTemplate';

export default function ProcurementApproverLoginScreen() {
  return (
    <RoleLoginTemplate
      roleId="procurement-approver"
      defaultEmail="procurement@trustchain.com"
    />
  );
}
