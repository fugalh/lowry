import * as lowry from './lowry'
const math = lowry.math;

// N6346D from Lowry's spreadsheet
const N6346D = {
    tail: "Skyhawk N6346D",
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
const N761S = {
    tail: "Aerotrek N761S",
    S: math.unit('122.53 ft^2'),
    A: 6.74,
    P0: math.unit('100 HP'),
    n0: math.unit(5800 / 2.43, 'rpm'),
    d: math.unit('5.183 ft'),
    drag: {
        W: math.unit('1010 lbf'),
        h: math.unit('5600 ft'),
        dh: math.unit('200 ft'),
        T: math.unit('72 degF'),
        V_Cbg: math.unit('63 mph'),
        dt: math.unit('26.42 s'),
    },
    thrust: {
        W: math.unit('1010 lbf'),
        h: math.unit('5600 ft'),
        dh: math.unit('200 ft'),
        T: math.unit('72 degF'),
        V_Cx: math.unit('63 mph'),
        dt: math.unit('17.2 s'),
        V_CM: math.unit('115 mph'),
    },
};
const input = N761S;
const l = new lowry.Lowry(input);
const W = math.unit('1235 lbf');
const speedUnit = 'mph';

// can you believe javascript doesn't even have range()?
function range(start, stop, step) {
    return Array((stop - start)/step).fill().map((d, i) => i * step + start);
}

let data = range(0, 40000, 500).map((h) => {
    const v = l.Vspeeds(W, math.unit(h, 'ft'));
    if (!v['VM']) {
        return {};
    }
    return {
        ft: h,
        Vx: v['Vx'].toNumber(speedUnit),
        Vy: v['Vy']?.toNumber(speedUnit),
        VM_cas: v.VM?.toNumber(speedUnit),
        VM_tas: v.VM ? lowry.tas(v.VM, h).toNumber(speedUnit) : undefined,
    };
});

import embed from 'vega-embed'

embed('#Vxy', {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    title: `${input.tail} at ${W.toString()}`,
    "description": "Vx and Vy over altitude",
    width: '400',
    "data": {
        values: data,
        as: 'kcas'
    },
    transform: [{fold: ["Vx", "Vy"]}],
    "mark": "line",
    "encoding": {
        "x": { "field": "value", "type": "quantitative", title: `${speedUnit} (calibrated)`, scale: {zero:false} },
        "y": { "field": "ft", "type": "quantitative", title: "Density Altitude (ft)" },
        color: {field: 'key', type: 'nominal'},
        strokeDash: {field: "key", type: "nominal"},
    }
});

embed('#VM', {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    title: `${input.tail} at ${W.toString()}`,
    width: '400',
    "data": {
        values: data,
        as: 'kcas'
    },
    transform: [{fold: ["VM_cas", "VM_tas"]}],
    "mark": "line",
    "encoding": {
        "x": { "field": "value", "type": "quantitative", title: `${speedUnit}`, scale: {zero:false} },
        "y": { "field": "ft", "type": "quantitative", title: "Density Altitude (ft)" },
        color: {field: 'key', type: 'nominal'},
        strokeDash: {field: "key", type: "nominal"},
    }
});

// TODO write Vbg and Vmd to some text span or something
// use immutable.js for ranges and object map and just nice immutability generally
