const lowry = require('./lowry')
const math = lowry.math
const c = lowry.constants

const tau = 2 * math.pi;

data = {
    S: math.unit('174 ft^2'),
    B: math.unit('35.83 ft'),
    P0: math.unit('160 HP'),
    n0: math.unit('2700 rpm'),
    d: math.unit('6.25 ft'),
    W0: math.unit('2400 lbf'),
}

test('I know how to program', () => {
    expect(c.rho0.toNumber('kg/m^3')).toBeCloseTo(1.2214478);
})

test('data plate', () => {
    plate = lowry.plate(data);
    expect(plate.S.toNumber('ft^2')).toBe(174);
    expect(plate.A).toBeCloseTo(7.378,0.001);
    expect(plate.M0.toNumber('ft lbf')).toBeCloseTo(311.2, 0.1);
    expect(plate.C).toBe(0.12);
    expect(plate.d.toNumber('ft')).toBe(6.25);
})
