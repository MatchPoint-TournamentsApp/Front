import { findSimilar, normalizeName, similarNames } from './names';

describe('names', () => {
  it('normaliza tildes y mayúsculas como el Back', () => {
    expect(normalizeName('  Iñaki   Mimbrero-Pérez ')).toBe('inaki mimbrero-perez');
  });

  it('avisa si solo cambian los signos (el Back los trataría como jugadores distintos)', () => {
    expect(similarNames('Pedro Fernández-López', 'Pedro Fernandez Lopez')).toBe(true);
  });

  it('detecta erratas', () => {
    expect(similarNames('Rafa Luego', 'Rafa Luengo')).toBe(true);
    expect(similarNames('Miguel Monterey', 'Miguel Monterrey')).toBe(true);
    expect(similarNames('Daniela Masrramon', 'Daniela Masramon')).toBe(true);
    expect(similarNames('Iñaqui Mimbrero', 'Iñaki Mimbrero')).toBe(true);
  });

  it('detecta un apellido de más', () => {
    expect(similarNames('Carlos Martin', 'Carlos Martin Moreno')).toBe(true);
  });

  it('no confunde jugadores distintos', () => {
    expect(similarNames('Ivan Pascua', 'Ivan Sanchez')).toBe(false);
    expect(similarNames('Luis Labad', 'Luis Matute')).toBe(false);
    expect(similarNames('Mario Sosa', 'Mario Relva')).toBe(false);
  });

  it('no avisa si ya existe el nombre exacto', () => {
    const list = [{ fullName: 'Rafa Luengo' }, { fullName: 'Rafa Luego' }];
    expect(findSimilar('rafa luego', list)).toBeUndefined();
    expect(findSimilar('Rafa Lueng', [{ fullName: 'Rafa Luengo' }])?.fullName).toBe('Rafa Luengo');
  });
});
