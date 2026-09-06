import PortalLayout from './PortalLayout';
import { CASHIER_NAV } from '../data/cashierResources';

function CashierLayout() {
  return (
    <PortalLayout nav={CASHIER_NAV} storageKey="cashier.sidebar.collapsed" portalLabel="Cashier" />
  );
}

export default CashierLayout;
