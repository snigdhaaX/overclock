import React from 'react';
import RoleLoginTemplate from '../../components/RoleLoginTemplate';

export default function SupplyChainManagerLoginScreen() {
  return (
    <RoleLoginTemplate
      roleId="supply-chain-manager"
      defaultEmail="manager@trustchain.com"
    />
  );
}
