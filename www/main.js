requirejs.config({
    paths: {
        mathjs: '../js/node_modules/mathjs/lib/browser/math',
        lowry: '../js/lowry',
    }
})
requirejs(["require", "lowry"], function(require) {
    const lowry = require('lowry')
    const math = lowry.math;

    let l = new lowry.Lowry({
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
    });
    let W = math.unit('1800 lbf');

    // can you believe javascript doesn't even have range()?
    function range(start, stop, step) {
        return Array((stop - start)/step).fill().map((d, i) => i * step + start);
    }

    let data = range(0, 20000, 20000/100).map((h) => {
        let v = l.Vspeeds(W, math.unit(h, 'ft'));
        return {
            ft: h,
            Vy: v['Vy'].toNumber('ktas'),
        };
    });

    vegaEmbed('#Vy', {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Vy over altitude",
        "data": {
            values: data
        },
        "mark": "line",
        "encoding": {
            "x": { "field": "ft", "type": "quantitative" },
            "y": { "field": "Vy", "type": "quantitative", scale: {zero:false} }
        }
    });
});
