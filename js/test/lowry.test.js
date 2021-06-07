const lowry = require('../src/lowry')
const math = lowry.math;
const lower = math.lower;
const Lowry = lowry.Lowry;

const C = 0.12;

const data = {
    S: math.unit('174 ft^2'),
    B: math.unit('35.83 ft'),
    P0: math.unit('160 HP'),
    n0: math.unit('2700 rpm'),
    // C: 0.12,
    d: math.unit('6.25 ft'),
    W0: math.unit('2400 lbf'),
    drag: {
        W: math.unit('2200 lbf'),
        h: math.unit('5000 ft'),
        T: math.unit('41 degF'),
        dh: math.unit('200 ft'),
        dt: math.unit('17.0 sec'),
        V_Cbg: math.unit('70 kcas'),
    },
    thrust: {
        W: math.unit('2200 lbf'),
        h: math.unit('5000 ft'),
        T: math.unit('41 degF'),
        V_Cx: math.unit('60.5 kcas'),
        V_CM: math.unit('105 kcas'),
    },
};

// [PoLA] table 7.6
const expectedPlate = {
    S: math.unit('174 ft^2'),
    A: 7.378,
    M0: math.unit('311.2 ft lbf'),
    C: 0.12,
    d: math.unit('6.25 ft'),
    C_D0: 0.037,
    e: 0.72,
    m: 1.70,
    b: -0.0564,
};

test('Data plate with units', () => {
    let l = new lowry.Lowry(data);
    const plate = l.plate;
    for (k in expectedPlate) {
        expect(Object.keys(plate)).toContain(k);
    }
    expect(plate.S).toEqual(expectedPlate.S);
    expect(plate.A).toBeCloseTo(expectedPlate.A, 1);
    expect(plate.M0.toNumber('ft lbf')).toBeCloseTo(expectedPlate.M0.toNumber('ft lbf'), 1);
    expect(plate.C).toEqual(expectedPlate.C);
    expect(plate.d).toEqual(expectedPlate.d);
    expect(plate.C_D0).toBeCloseTo(expectedPlate.C_D0, 3);
    expect(plate.e).toBeCloseTo(expectedPlate.e, 2);
    expect(plate.m).toBeCloseTo(expectedPlate.m, 2);
    expect(plate.b).toBeCloseTo(expectedPlate.b, 4);
});

test('British data plate', () => {
    l = new lowry.Lowry(lowry.toBritish(data));
    const plate = l.britishPlate;
    console.log(plate);
    const e = lowry.toBritish(expectedPlate);
    for (k in e) {
        expect(Object.keys(plate)).toContain(k);
    }
    expect(plate.S).toBe(e.S);
    expect(plate.M0).toBeCloseTo(e.M0, 1);
    expect(plate.d).toBe(e.d);
    expect(plate.C_D0).toBeCloseTo(expectedPlate.C_D0, 3);
    expect(plate.e).toBeCloseTo(expectedPlate.e, 2);
    expect(plate.m).toBeCloseTo(expectedPlate.m, 2);
    expect(plate.b).toBeCloseTo(expectedPlate.b, 4);
});

test('helpers', () => {
    expect(lower(lowry.standardTemperature(36090), 'degC')).toBeCloseTo(-56.5, 0.1);
});

test('composites are numbers at least', () => {
    let l = new lowry.Lowry(data);
    let case1 = l.composites(math.unit('2400 lbf'), math.unit('0 ft'));
    expect(case1[k]).not.toBeNaN();
});

// [PoLA] table 7.8
test('composite values', () => {
    let l = new lowry.Lowry(data);

    expect(lowry.relativeDensity(math.unit('0 ft'))).toBe(1);
    expect(l.dropoffFactor(math.unit('0 ft'))).toBe(1);

    let case1 = l.composites(math.unit('2400 lbf'), math.unit('0 ft'));
    let expected = {
        E: 531.9,
        F: -0.0052368,
        G: 0.0076516,
        H: 1668987,
        K: -0.0128884,
        Q: -41270.6,
        R: -129495394,
        U: 218123707,
    };
    for (k in expected) {
        expect(case1[k]).toBeCloseTo(expected[k]);
    }
});

// [PoLA] table 7.8
test('composite values at altitude', () => {
    let l = new lowry.Lowry(data);
    expect(lowry.relativeDensity(math.unit('4000 ft'))).toBeCloseTo(0.8881);
    expect(l.dropoffFactor(math.unit('4000 ft'))).toBeCloseTo(0.8737);

    let case2 = l.composites(math.unit('2200 lbf'), math.unit('4000 ft'));
    expected = {
        E: 464.7,
        F: -0.0046508,
        G: 0.0067952,
        H: 1579142,
        K: -0.0114460,
        Q: -40603.4,
        R: -137964564,
        U: 232389286,
    };
    for (k in expected) {
        expect(case2[k]).toBeCloseTo(expected[k]);
    }
});

test('Vspeeds', () => {
    let l = new lowry.Lowry(data);

    // [PoLA] table 7.4
    let v1 = l.Vspeeds(math.unit(2400, 'lbf'), math.unit(0, 'ft'));
    expect(v1['Vy'].toNumber('kts')).toBeCloseTo(75.8, 0.1);
    expect(v1['Vx'].toNumber('kts')).toBeCloseTo(63.2, 0.1);

    let v2 = l.Vspeeds(math.unit(1800, 'lbf'), math.unit(8000, 'ft'));
    expect(v2['Vy'].toNumber('kts')).toBeCloseTo(65.9, 0.5);
    expect(v2['Vx'].toNumber('kts')).toBeCloseTo(64.7, 0.5);
})

// [PoLA] Appendix F: Flight Test for Drag Parameters
test('Appendix F', () => {
    let Vcbg = math.unit('70.5 kcas');
    let dt = math.unit('39.10 s');
    expect(Vcbg.toNumber('ft/s')).toBeCloseTo(119, 1);
    let h = math.unit('5750 ft');
    let T = math.unit('45 degF');
    expect(lowry.relativeDensity(h, T)).toBeCloseTo(0.9871, 4);
    let Vbg = lowry.tas(Vcbg, h, T);
    expect(Vbg.toNumber('ft/s')).toBeCloseTo(119.8, 1);
    let dh = math.unit('500 ft');
    let tapeline = lowry.tapeline(dh, h, T);
    expect(tapeline.toNumber('ft')).
        toBeCloseTo(506.5, 1);
    expect(lowry.flightAngle(Vbg, tapeline, dt).toNumber('deg')).toBeCloseTo(6.21);

    let l = new Lowry({
        S: math.unit('174 ft^2'),
        A: 7.38,
        drag: {
            W: math.unit('2209 lbf'),
            h: h,
            T: T,
            dh: dh,
            dt: dt,
            V_Cbg: math.unit('70.5 kcas'),
        }
    });
    let plate = l.britishPlate;
    // the book saya 0.0408 but it's not that precise in the intermediate values
    expect(plate.C_D0).toBeCloseTo(0.041, 3.5);
    expect(plate.e).toBeCloseTo(0.595, 2.5);
});

// TODO
// did density altitude and tapeline as per Appendix F for glide,
// no make all the rest of the unit tests pass for C_D0 and e
// and do for climb,
//
// welp, I've decided to redo all the unit stuff and use units throughout and just live with stuff like math.divide et al after all
// V speeds
// curve functions
// Vega Lite graphs
