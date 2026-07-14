import { getCosmetic } from './cosmetics';

export function getMapStyles(mapThemeId: string | undefined): google.maps.MapTypeStyle[] | undefined {
  if (mapThemeId === 'map-coast') {
    return [
      { elementType: 'geometry', stylers: [{ color: '#E0F2FE' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#164E63' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#38BDF8' }] },
    ];
  }
  if (mapThemeId === 'map-desert') {
    return [
      { elementType: 'geometry', stylers: [{ color: '#FEF3C7' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#78350F' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFF7ED' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#7DD3FC' }] },
    ];
  }
  if (mapThemeId === 'map-night') {
    return [
      { elementType: 'geometry', stylers: [{ color: '#111827' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#D1D5DB' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#172554' }] },
    ];
  }
  if (mapThemeId === 'map-northern-roads') {
    return [
      { elementType: 'geometry', stylers: [{ color: '#DCFCE7' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#14532D' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#7DD3FC' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#86EFAC' }] },
    ];
  }
  return undefined;
}

export function getPinSymbol(maps: typeof google, pinId: string | undefined): google.maps.Symbol {
  const cosmetic = getCosmetic(pinId);
  return {
    path: maps.maps.SymbolPath.CIRCLE,
    fillColor: cosmetic?.palette[0] ?? '#F97316',
    fillOpacity: 1,
    scale: pinId === 'pin-local-legend' ? 12 : 10,
    strokeColor: cosmetic?.palette[1] ?? '#7C2D12',
    strokeWeight: 4,
  };
}

export function getCosmeticGradient(cosmeticId: string | undefined): string {
  const cosmetic = getCosmetic(cosmeticId);
  return cosmetic ? `linear-gradient(135deg, ${cosmetic.palette[0]}, ${cosmetic.palette[1]})` : 'linear-gradient(135deg, #193049, #102033)';
}
