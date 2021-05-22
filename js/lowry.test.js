const lowry = require('./lowry')
c = lowry.constants;

test('I know how to program', () => {
    expect(c.rho0.toNumber('kg/m^3')).toBeCloseTo(1.2214478)
})
