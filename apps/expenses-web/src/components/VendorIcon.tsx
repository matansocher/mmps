import { useState } from 'react';
import { getVendorColor, getVendorInitials, getVendorLogoUrl } from '../lib/vendorIcon';

type Props = {
  readonly vendor: string;
  readonly className?: string; // sizing + shape of the icon box (e.g. "w-9 h-9 rounded-full")
  readonly textClassName?: string; // font size of the initials fallback
};

export function VendorIcon({ vendor, className = '', textClassName = '' }: Props) {
  const logoUrl = getVendorLogoUrl(vendor);
  const [failed, setFailed] = useState(false);
  const showLogo = !!logoUrl && !failed;

  if (showLogo) {
    return (
      <div className={`grid place-items-center overflow-hidden shrink-0 bg-bg-elevated ${className}`}>
        <img src={logoUrl} alt="" loading="lazy" className="w-3/4 h-3/4 object-contain" onError={() => setFailed(true)} />
      </div>
    );
  }

  return (
    <div className={`grid place-items-center overflow-hidden shrink-0 ${className}`} style={{ backgroundColor: getVendorColor(vendor) }}>
      <span className={`font-semibold text-white leading-none ${textClassName}`}>{getVendorInitials(vendor)}</span>
    </div>
  );
}
