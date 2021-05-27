const lowry = require('./lowry')
const math = lowry.math;
let lower = math.lower;

const C = 0.12;

const data = {
    S: math.unit('174 ft^2'),
    B: math.unit('35.83 ft'),
    P0: math.unit('160 HP'),
    n0: math.unit('2700 rpm'),
    d: math.unit('6.25 ft'),
    W0: math.unit('2400 lbf'),
    drag: {
        W: math.unit('2200 lbf'),
        h: math.unit('5000 ft'),
        T: math.unit('41 degF'),
        dh: math.unit('200 ft'),
        V_Cbg: math.unit('70 kcas'),
        dt: math.unit('17.0 sec'),
    },
    thrust: {
        W: math.unit('2200 lbf'),
        h: math.unit('5000 ft'),
        T: math.unit('41 degF'),
        V_Cx: math.unit('60.5 kcas'),
        V_CM: math.unit('105 kcas'),
    },
};

const expectedPlate = {
    S: math.unit('174 ft^2'),
    A: 7.378,
    M0: math.unit('311.2 ft lbf'),
    C: 0.12,
    d: math.unit('6.25 ft'),
    C_D0: 0.0352,
    e: 0.7054,
    m: 1.7406,
    b: -0.06338,
};

test('Data plate with units', () => {
    let l = new lowry.Lowry(data);
    const plate = l.plate;
    for (k in expectedPlate) {
        expect(Object.keys(plate)).toContain(k);
    }
    expect(plate.S).toEqual(expectedPlate.S);
    expect(plate.A).toBeCloseTo(expectedPlate.A, 0.001);
    expect(plate.M0.toNumber('ft lbf')).toBeCloseTo(expectedPlate.M0.toNumber('ft lbf'), 0.1);
    expect(plate.C).toEqual(C);
    expect(plate.d).toEqual(expectedPlate.d);
    expect(plate.C_D0).toBeCloseTo(expectedPlate.C_D0, 0.0001);
    expect(plate.e).toBeCloseTo(expectedPlate.e, 0.0001);
    expect(plate.m).toBeCloseTo(expectedPlate.m, 0.0001);
    expect(plate.b).toBeCloseTo(expectedPlate.b, 0.0001);
});

test('British data plate', () => {
    l = new lowry.Lowry(lowry.toBritish(data));
    const plate = l.britishPlate;
    const e = lowry.toBritish(expectedPlate);
    for (k in e) {
        expect(Object.keys(plate)).toContain(k);
    }
    expect(plate.S).toBe(e.S);
    expect(plate.M0).toBeCloseTo(e.M0, 0.1);
    expect(plate.d).toBe(e.d);
    expect(plate.C_D0).toBeCloseTo(expectedPlate.C_D0, 0.0001);
    expect(plate.e).toBeCloseTo(expectedPlate.e, 0.0001);
    expect(plate.m).toBeCloseTo(expectedPlate.m, 0.0001);
    expect(plate.b).toBeCloseTo(expectedPlate.b, 0.0001);
});

test('helpers', () => {
    expect(lower(lowry.standardTemperature(36090), 'degC')).toBeCloseTo(-56.5, 0.1);
});

// TODO
// oops, it's supposed to be density altitude not pressure altitude, add OAT to input and calc DA.
// welp, I've decided to redo all the unit stuff and use units throughout and just live with stuff like math.divide et al after all
// composite numbers
// V speeds
// curve functions
// Vega Lite graphs
