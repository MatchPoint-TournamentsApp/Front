import { assetUrl } from './asset-url';

describe('imágenes del bucket a través del intermediario de Supabase', () => {
  const direct = 'https://abcdefgh.supabase.co/storage/v1/object/public/matchpoint-public/u1/logo/1.png';

  it('con la dirección directa de Supabase no cambia nada', () => {
    expect(assetUrl(direct, 'https://abcdefgh.supabase.co')).toBe(direct);
  });

  it('con un intermediario propio, la imagen se pide por él', () => {
    expect(assetUrl(direct, 'https://sb.matchzonesports.com'))
      .toBe('https://sb.matchzonesports.com/storage/v1/object/public/matchpoint-public/u1/logo/1.png');
  });

  it('otras imágenes (webs de patrocinadores, ya por el intermediario) y vacíos se quedan igual', () => {
    expect(assetUrl('https://example.com/logo.png', 'https://sb.matchzonesports.com')).toBe('https://example.com/logo.png');
    expect(assetUrl('https://sb.matchzonesports.com/storage/v1/x.png', 'https://sb.matchzonesports.com')).toBe('https://sb.matchzonesports.com/storage/v1/x.png');
    expect(assetUrl(null)).toBe('');
    expect(assetUrl('no es una url', 'https://sb.matchzonesports.com')).toBe('no es una url');
  });
});
