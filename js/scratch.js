
// I like this

const c172p = {
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

const plate = lowry.bootstrap(c172p)
console.log(plate.toString())

const perf = lowry.performance(plate, W, lowry.densityAltitude(h, T), V?)
// I was thinking of doing getters for laziness for perf, but perf isn't really
// a big deal and that makes us have to pull them out explicitly, but with
// vega-lite if the results are just a map then we can use the output directly.
// Although, we might have to pull anyway to pull the units down.
Range(0, 14000, 500).map(h_rho => lowry.performance(plate, W, h_rho));
Range(0, 130, 1).map(V => lowry.performance(plate, W, h_rho, V))
