import { useAppContext } from '../context/AppContext';
import { getEstateScope } from '../utils/access';

/**
 * Dynamic plantation locations derived from the active tenant's uploaded GeoJSON boundary.
 */
export function EstateOptions({ allLabel = 'All Locations' }) {
  const { estates } = useAppContext();
  const scope = getEstateScope();
  const list = scope ? [scope] : estates.map((e) => e.name);
  return (
    <>
      {!scope && <option value="">{allLabel}</option>}
      {list.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </>
  );
}
