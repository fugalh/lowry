import * as lowry from './lowry'
const math = lowry.math;

// N6346D from Lowry's spreadsheet
const c172_data = {
    S: math.unit('174 ft^2'),
    B: math.unit('35.83 ft'),
    P0: math.unit('160 HP'),
    n0: math.unit('2700 rpm'),
    d: math.unit('75 in'),
    drag: {
        W: math.unit('2250 lbf'),
        h: math.unit('5000 ft'),
        dh: math.unit('500 ft'),
        T: math.unit('29.5 degF'),
        V_Cbg: math.unit('69 kcas'),
        dt: math.unit('42.06 sec'),
    },
    thrust: {
        W: math.unit('2235 lbf'),
        h: math.unit('5000 ft'),
        dh: math.unit('500 ft'),
        T: math.unit('29 degF'),
        V_Cx: math.unit('61 kcas'),
        dt: math.unit('52.89 s'),
        V_CM: math.unit('105.1 kcas'), // estimated from the model in the spreadsheet
    },
};
const l = new lowry.Lowry(c172_data);
const W = math.unit('2250 lbf');

// can you believe javascript doesn't even have range()?
function range(start, stop, step) {
    return Array((stop - start)/step).fill().map((d, i) => i * step + start);
}

let data = range(0, 14500, 500).map((h) => {
    const v = l.Vspeeds(W, math.unit(h, 'ft'));
    return {
        ft: h,
        Vy: v['Vy'].toNumber('kts'),
        Vx: v['Vx'].toNumber('kts'),
    };
});

import embed from 'vega-embed'

embed('#Vxy', {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    title: "N6346D at 2250 lbf",
    "description": "Vx and Vy over altitude",
    "data": {
        values: data,
        as: 'kcas'
    },
    transform: [{fold: ["Vy", "Vx"]}],
    "mark": "line",
    "encoding": {
        "x": { "field": "value", "type": "quantitative", title: "KCAS", scale: {zero:false} },
        "y": { "field": "ft", "type": "quantitative", title: "Density Altitude (ft)" },
        color: {field: 'key', type: 'nominal'}
    }
});
