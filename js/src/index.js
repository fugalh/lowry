import * as lowry from './lowry'
const math = lowry.math;

let c172_data = {
    S: math.unit('174 ft^2'),
    B: math.unit('35.83 ft'),
    P0: math.unit('160 HP'),
    n0: math.unit('2700 rpm'),
    d: math.unit('75 in'),
    W0: math.unit('2250 lbf'),
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
        V_CM: math.unit('105 kcas'), //
    },
};

let l = new lowry.Lowry(c172_data);
let W = math.unit('2250 lbf');

// can you believe javascript doesn't even have range()?
function range(start, stop, step) {
    return Array((stop - start)/step).fill().map((d, i) => i * step + start);
}

let data = range(0, 20000, 20000/500).map((h) => {
    let v = l.Vspeeds(W, math.unit(h, 'ft'));
    return {
        ft: h,
        Vy: v['Vy'].toNumber('kcas'),
        Vx: v['Vx'].toNumber('kcas'),
    };
});
console.log(data);

import embed from 'vega-embed'
embed('#Vy', {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Vy over altitude",
    "data": {
        values: data
    },
    "mark": "line",
    "encoding": {
        "x": { "field": "Vy", "type": "quantitative", scale: {zero:false} },
        "y": { "field": "ft", "type": "quantitative" }
    }
});

embed('#Vx', {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Vx over altitude",
    "data": {
        values: data
    },
    "mark": "line",
    "encoding": {
        "x": { "field": "Vx", "type": "quantitative", scale: {zero:false} },
        "y": { "field": "ft", "type": "quantitative" }
    }
});

embed('#Vxy', {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "description": "Vx and Vy over altitude",
    "data": {
        values: data,
        as: 'kcas'
    },
    transform: [{fold: ["Vy", "Vx"]}],
    "mark": "line",
    "encoding": {
        "x": { "field": "value", "type": "quantitative", scale: {zero:false} },
        "y": { "field": "ft", "type": "quantitative" },
        color: {field: 'key', type: 'nominal'}
    }
});
