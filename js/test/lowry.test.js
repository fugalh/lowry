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
const expectedPlate = {
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
    expect(plate.S).toEqual(expectedPlate.S);
    expect(plate.A).toBeCloseTo(expectedPlate.A, 2);
    expect(plate.M0.toNumber('ft lbf')).toBeCloseTo(expectedPlate.M0.toNumber('ft lbf'), 1);
    expect(plate.C).toEqual(expectedPlate.C);
    expect(plate.d).toEqual(expectedPlate.d);
    // Due to compounding imprecision from subtly different methodology, C_D0 is
    // a bit off from the paper and book (which themselves don't quite agree),
    // and e is even further off. But I've checked the equations by hand and the
    // Appendix F test goes carefully through everything (and my numbers agree
    // with Appendix F)
    expect(plate.C_D0).toBeCloseTo(expectedPlate.C_D0, 2);
    expect(plate.e).toBeCloseTo(expectedPlate.e, 1.5);
    expect(plate.m).toBeCloseTo(expectedPlate.m, 1); // precision??
    expect(plate.b).toBeCloseTo(expectedPlate.b, 1.5); // precision??
});


test('British data plate', () => {
    const l = new lowry.Lowry(lowry.toBritish(data));
    const e = new lowry.Lowry(data).plate;
    const plate = l.britishPlate;
    console.log(plate);
    expect(plate.S).toEqual(e.S.toNumber('ft^2'));
    expect(plate.A).toEqual(e.A);
    expect(plate.M0).toBeCloseTo(e.M0.toNumber('ft lbf'));
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

// [PoLA] table 7.8
test('composite values', () => {
    let l = new lowry.Lowry(data);
    let case1 = l.composites(math.unit('2400 lbf'), math.unit('0 ft'));

    expect(lowry.relativeDensity(math.unit('0 ft'))).toBeCloseTo(1);
    expect(l.dropoffFactor(math.unit('0 ft'))).toBeCloseTo(1);
    expect(case1.E).toBeCloseTo(531.9, -3);
    expect(case1.F).toBeCloseTo(-0.0052368, 2.5);
    expect(case1.G).toBeCloseTo(0.0076516, 3);
    expect(case1.H).toBeCloseTo(1668987, -6);
    expect(case1.K).toBeCloseTo(-0.0128884, 3);
    expect(case1.Q).toBeCloseTo(-41270.6, -4);
    expect(case1.R).toBeCloseTo(-129495394, -9);
    expect(case1.U).toBeCloseTo(218123707, -9);
});

// [PoLA] table 7.8
test('composite values at density altitude', () => {
    let l = new lowry.Lowry(data);
    let case2 = l.composites(math.unit('2200 lbf'), math.unit('4000 ft'));
console.log(case2)
    expect(lowry.relativeDensity(math.unit('4000 ft'))).toBeCloseTo(0.8881);
    expect(l.dropoffFactor(math.unit('4000 ft'))).toBeCloseTo(0.8737);
    expect(case2.E).toBeCloseTo(464.7, -3);
    expect(case2.F).toBeCloseTo(-0.0046508, 2.5);
    expect(case2.G).toBeCloseTo(0.0067952, 3);
    expect(case2.H).toBeCloseTo(1579142, -6);
    expect(case2.K).toBeCloseTo(-0.0114460, 3);
    expect(case2.Q).toBeCloseTo(-40603.4, -4);
    expect(case2.R).toBeCloseTo(-137964564, -9);
    expect(case2.U).toBeCloseTo(232389286, -9);
});

test('Vspeeds', () => {
    let l = new lowry.Lowry(data);

    // [PoLA] table 7.4
    let v1 = l.Vspeeds(math.unit(2400, 'lbf'), math.unit(0, 'ft'));
    expect(v1['Vy'].toNumber('kts')).toBeCloseTo(75.8, -1);
    expect(v1['Vx'].toNumber('kts')).toBeCloseTo(63.2, -1);

    let v2 = l.Vspeeds(math.unit(1800, 'lbf'), math.unit(8000, 'ft'));
    expect(v2['Vy'].toNumber('kts')).toBeCloseTo(65.9, -1);
    expect(v2['Vx'].toNumber('kts')).toBeCloseTo(54.7, -1);
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
// now do for climb,
//
// welp, I've decided to redo all the unit stuff and use units throughout and just live with stuff like math.divide et al after all
// V speeds
// curve functions
// Vega Lite graphs
