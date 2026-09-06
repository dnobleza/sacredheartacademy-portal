import PortalLayout from './PortalLayout';
import { REGISTRAR_NAV } from '../data/registrarResources';

function RegistrarLayout() {
  return (
    <PortalLayout
      nav={REGISTRAR_NAV}
      storageKey="registrar.sidebar.collapsed"
      portalLabel="Registrar"
    />
  );
}

export default RegistrarLayout;
