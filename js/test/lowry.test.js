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
    drag: {
        W: math.unit('2200 lbf'),
        h: math.unit('5000 ft'),
        dh: math.unit('200 ft'),
        V_Cbg: math.unit('70 kcas'),
        dt: math.unit('17.0 sec'),
    },
    thrust: {
        W: math.unit('2200 lbf'),
        h: math.unit('5000 ft'),
        V_Cx: math.unit('60.5 kcas'),
        V_CM: math.unit('105 kcas'),
    },
};

// [PoLA] table 7.1
const plate71 = {
    S: math.unit('174 ft^2'),
    A: 7.38,
    M0: math.unit('311.2 ft lbf'),
    C: 0.12,
    d: math.unit('6.25 ft'),
    C_D0: 0.037,
    e: 0.72,
    m: 1.70,
    b: -0.0564,
};

test('Data plate', () => {
    let l = new lowry.Lowry(data);
    const plate = l.plate;
    expect(plate.S).toEqual(plate71.S);
    expect(plate.A).toBeCloseTo(plate71.A, 2);
    expect(plate.M0.toNumber('ft lbf')).toBeCloseTo(plate71.M0.toNumber('ft lbf'), 1);
    expect(plate.C).toEqual(plate71.C);
    expect(plate.d).toEqual(plate71.d);
    // Due to compounding imprecision from subtly different methodology, C_D0 is
    // a bit off from the paper and book (which themselves don't quite agree),
    // and e is even further off. But I've checked the equations by hand and the
    // Appendix F test goes carefully through everything (and my numbers agree
    // with Appendix F)
    expect(plate.C_D0).toBeCloseTo(plate71.C_D0, 2);
    expect(plate.e).toBeCloseTo(plate71.e, 1);
    expect(plate.m).toBeCloseTo(plate71.m, 1); // precision??
    expect(plate.b).toBeCloseTo(plate71.b, 1.5); // precision??
});


test('British data plate', () => {
    const l = new lowry.Lowry(lowry.toBritish(data));
    const e = new lowry.Lowry(data).plate;
    const plate = l.britishPlate;

    expect(plate.S).toEqual(e.S.toNumber('ft^2'));
    expect(plate.A).toEqual(e.A);
    expect(plate.M0).toBeCloseTo(e.M0.toNumber('ft lbf'), 1);
    expect(plate.C).toEqual(e.C);
    expect(plate.d).toEqual(e.d.toNumber('ft'));
    expect(plate.C_D0).toEqual(e.C_D0);
    expect(plate.e).toEqual(e.e);
    expect(plate.m).toEqual(e.m);
    expect(plate.b).toEqual(e.b);
});

test('helpers', () => {
    expect(lower(lowry.standardTemperature(36090), 'degC')).
        toBeCloseTo(-56.5, 0.1);
    expect(lowry.relativeDensity(5000)).toBeCloseTo(0.86167);
});

test('composites are numbers at least', () => {
    let l = new lowry.Lowry(data);
    let case1 = l.composites(math.unit('2400 lbf'), math.unit('0 ft'));
    for (k in case1) {
        expect(case1[k]).not.toBeNaN();
    }
});

// see [PoLA] table 7.3, but hand calculated
test('composite values', () => {
    // mock the precise data plate from table 7.1, to avoid compounding error
    let l = new lowry.Lowry(plate71);
    const h = math.unit('0 ft');
    let case1 = l.composites(math.unit('2400 lbf'), h);

    expect(lowry.relativeDensity(h)).toBeCloseTo(1);
    expect(l.dropoffFactor(h)).toBeCloseTo(1);
    expect(case1.E).toBeCloseTo(531.9, 0);
    expect(case1.F).toBeCloseTo(-0.00522, 5);
    expect(case1.G).toBeCloseTo(0.00763, 5);
    expect(case1.H).toBeCloseTo(1673000, -5);
    expect(case1.K).toBeCloseTo(-0.012889, 4);
    expect(case1.Q).toBeCloseTo(-41390, -3);
    expect(case1.R).toBeCloseTo(-129400000, -7);
    expect(case1.U).toBeCloseTo(218100000, -7);
});

// see [PoLA] table 7.3, but hand calculated
test('composite values at density altitude', () => {
    // mock the precise data plate from table 7.1, to avoid compounding error
    let l = new lowry.Lowry(plate71);
    const h = math.unit('8000 ft');
    let case2 = l.composites(math.unit('1800 lbf'), h);

    expect(lowry.relativeDensity(h)).toBeCloseTo(0.7860, 3);
    expect(l.dropoffFactor(h)).toBeCloseTo(0.7568, 3);
    expect(case2.E).toBeCloseTo(402.6, 0);
    expect(case2.F).toBeCloseTo(-0.004103, 5);
    expect(case2.G).toBeCloseTo(0.005997, 5);
    expect(case2.H).toBeCloseTo(1198000, -5);
    expect(case2.K).toBeCloseTo(-0.01010, 4);
    expect(case2.Q).toBeCloseTo(-39850, -3);
    expect(case2.R).toBeCloseTo(-118600000, -7);
    expect(case2.U).toBeCloseTo(199800000, -7);
});

test('Vspeeds', () => {
    let l = new lowry.Lowry(data);

    // [PoLA] table 7.4
    let v1 = l.Vspeeds(math.unit(2400, 'lbf'), math.unit(0, 'ft'));
    expect(v1['Vy'].toNumber('kts')).toBeCloseTo(75.8, 0);
    expect(v1['Vx'].toNumber('kts')).toBeCloseTo(63.2, 0);

    let v2 = l.Vspeeds(math.unit(1800, 'lbf'), math.unit(8000, 'ft'));
    expect(v2['Vy'].toNumber('kts')).toBeCloseTo(65.9, 0);
    expect(v2['Vx'].toNumber('kts')).toBeCloseTo(54.7, 0);
})

// even better, mock the data plate and check the composite and vspeed calculations with precision

// [PoLA] Appendix F: Flight Test for Drag Parameters
test('Appendix F', () => {
    let Vcbg = math.unit('70.5 kcas');
    let dt = math.unit('39.10 s');
    expect(Vcbg.toNumber('ft/s')).toBeCloseTo(119.0, 1);
    let h = math.unit('5750 ft');
    let T = math.unit('45 degF');
    expect(lowry.relativeDensity(h, T)).toBeCloseTo(0.9871, 4);
    expect(lowry.density(h, T).toNumber('slug / ft^3')).toBeCloseTo(0.002339, 5);
    let Vbg = lowry.tas(Vcbg, h, T);
    expect(Vbg.toNumber('ft/s')).toBeCloseTo(119.8, 1);
    let dh = math.unit('500 ft');
    let tapeline = lowry.tapeline(dh, h, T);
    expect(tapeline.toNumber('ft')).toBeCloseTo(506.5, 1);
    expect(lowry.flightAngle(Vbg, tapeline, dt).toNumber('deg')).toBeCloseTo(6.21, 2);

    let l = new Lowry({...data,
        drag: {
            W: math.unit('2209 lbf'),
            h: h,
            T: T,
            dh: dh,
            dt: dt,
            V_Cbg: math.unit('70.5 kcas'),
        }
    });
    const plate = l.britishPlate;
    // hand calculated, slightly different from the book
    expect(plate.C_D0).toBeCloseTo(0.04093, 4);
    expect(plate.e).toBeCloseTo(0.5964, 3);
});

// TODO
// did density altitude and tapeline as per Appendix F for glide,
// now do for climb,
//
// welp, I've decided to redo all the unit stuff and use units throughout and just live with stuff like math.divide et al after all
// V speeds
// curve functions
// Vega Lite graphs