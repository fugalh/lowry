const math = require('mathjs')
'use strict';

// References:
// [Bootstrap] Lowry, John T. (1995). The Bootstrap Approach to Predicting
// Airplane Flight Performance. Journal of Aviation/Aerospace Education &
// Research, 6(1) https://doi.org/10.15394/jaaer.1995.1167
//
// [PoLA] Lowry, John T. Performance of Light Aircraft. American Institute of
// Aeronautics and Astronautics, Inc., 1999.
// https://arc.aiaa.org/doi/book/10.2514/4.103704

// conventions:
// trailing underscore means a raw number implicitly with British engineering units

// custom units
math.createUnit('slug', '1 lbf s^2 / ft');
math.createUnit('HP', '550 ft lbf / sec');
math.createUnit('rpm', '1 / minute');
math.createUnit('rps', '1 / second');
math.createUnit('knot', {definition: '0.514444 m/s', aliases: ['knots', 'kt', 'kts', 'kcas', 'ktas']});

math.lift = (x, u) => {
    if (math.isUnit(x)) return x.to(u);
    return math.unit(x, u);
}

math.lower = (x, u) => {
    if (math.isUnit(x)) return x.toNumber(u);
    return x.to(u);
}

// constants
const rho0_ = 0.00237;
const rho0 = math.unit(rho0_, 'slug / ft^3')

// Convert data with units to implicit British engineering units (raw numbers).
// Elements which aren't units will be copied untouched.
function toBritish(data) {
    function _convert(u) {
        const bases = [
            'ft', // length
            'ft^2', // area
            'slug / ft^3', // density
            'ft lbf / sec', // power
            'rps', // rotation speed
            'lbf', // weight
            'ft lbf', // torque
            'ft / sec', // velocity
            'sec', // time
            'degF', // temperature
        ];
        if (math.isUnit(u)) {
            for (const base of bases) {
                if (u.equalBase(math.unit(1, base))) {
                    return u.toNumber(base);
                }
            }
        }
        return u;
    }

    // singles
    if (math.isUnit(data)) {
        return _convert(data);
    }
    if (!isNaN(data)) {
        return data;
    }

    // iterables
    let data_ = {};
    for (const [k,v] of Object.entries(data)) {
        data_[k] = _convert(v);
    }
    return data_;
}

// if it's not already a unit, make it one of these
function liftUnit(x, unit) {
    return math.isUnit(x) ? x.to(unit) : math.unit(x, unit);
}

// Convert an object from implicit British engineering units to explicit
// math.Unit objects (by key). Any elements that are already Units will be left
// alone, and any unknown keys will be copied untouched.
function toUnits(data_) {
    let data = {...data_};
    const units = {
        S: 'ft^2',
        B: 'ft',
        P0: 'ft lbf / sec',
        n0: 'rps',
        M0: 'ft lbf',
        d: 'ft',
        T: 'degF',
    }
    for (const [k,u] of Object.entries(units)) {
        if (k in data_) {
            data[k] = liftUnit(data_[k], u);
        }
    }
    return data;
}

// --- Helpers ---

// Calculate atmospheric density given height (ft)
function rho_s_(h) {
    // [PoLA] eq 1.7
    return rho0_ *  math.pow((1 - toBritish(h) / 145457), 4.25635);
}

// Relative atmospheric density given height (ft)
function sigma_(h) {
    // [Bootstrap] pg 25
    return rho_s_(h) / rho0_;
}

// Calculate true airspeed from calibrated airspeed (knot or Unit) and height (feet)
function tas_(V_C, h) {
    let x_ = toBritish({
        V_C: liftUnit(V_C, 'knots'),
        rho: rho_s_(h),
    });
    // [Bootstrap] eq 4
    return x_.V_C / math.sqrt(x_.rho / rho0_);
}


function standardTemperature(pressureAltitude) {
    let T0 = math.unit('15 degC');
    let lapseRate = math.unit(-1.98/1000, 'K/ft');
    let h = math.lift(pressureAltitude, 'ft');
    return math.add(T0, math.multiply(h, lapseRate)).to('degF');
}
exports.standardTemperature = standardTemperature;

class Lowry {
    // Construct with input data, either implicitly in British engineering units, or using math.unit
    // S wing surface area (ft^2)
    // A wing aspect ratio, or B wing span (ft)
    // M0 MSL rated torque (ft lbf), or P0 rated power (ft lbf / s) and n0 rated propeller speed (rps)
    // C (default 0.12)
    // d propeller diameter (ft)
    constructor(data) {
        let data_ = toBritish(data);
        this.S_ = data_.S;

        // [Bootstrap] pg 25
        this.A = data_?.A ?? data_.B * data_.B / data_.S;
        this.M0_ = data_?.M0 ?? data_.P0 / (2 * math.pi * data_.n0);
        this.C = data_?.C ?? 0.12;

        if ('drag' in data) {
            let drag = data.drag;
            let gamma = this.flightAngle(drag.V_Cbg, drag.dh, drag.dt);
            let V_Cbg2 = math.pow(toBritish(drag.V_Cbg), 2);
            // [Bootstrap] eq 5
            this.C_D0 = toBritish(drag.W) * math.sin(gamma) / (rho0_ * V_Cbg2 * data_.S);
            // [Bootstrap] eq 6
            this.e = 4 * this.C_D0 / (math.pi * this.A * math.pow(math.tan(gamma), 2));
        }
        if ('thrust' in data) {
            let thrust = data.thrust;
            let W2 = math.pow(toBritish(thrust.W), 2);
            let rho_ = rho_s_(thrust.h);
            let rho2_ = math.pow(rho_, 2);
            let d2 = math.pow(data_.d, 2);
            let Vx = tas_(thrust.V_Cx, thrust.h);
            let Vx4 = math.pow(Vx, 4);

            // [Bootstrap] eq 8
            this.b = (data_.S * this.C_D0 / (2 * d2)) - 2 * W2 / (rho2_ * d2 * data_.S * math.pi * this.e * this.A * Vx4);

            let Vm2 = math.pow(tas_(thrust.V_Cm, thrust.h), 2);
            // [Bootstrap] eq 9, but substituting M0 for P0/2πn0
            this.m = (data_.d * W2 / (this.M0_ * math.pi * this.phi_(thrust.h) * rho_ * data_.S * math.pi * this.e * this.A)) * (1/Vm2 + Vm2/Vx4);
        }

        this.d_ = data_.d;
    }

    // return the bootstrap data plate in implicit British engineering units
    get britishPlate() {
        return {
            S:  this.S_,
            A:  this.A,
            M0: this.M0_,
            C:  this.C,
            d:  this.d_,
            C_D0: this.C_D0,
            e: this.e,
            b: this.b,
            m: this.m,
        };
    }

    get plate() {
        return toUnits(this.britishPlate);
    }

    // --- Helpers ---

    // Dropoff factor
    phi_(h) {
        // [Bootstrap] eq 2
        return (sigma_(h) - this.C) / (1 - this.C);
    }

    flightAngle(V, dh, dt) {
        // [Bootstrap] eq 3
        return math.unit(math.asin(math.divide(dh, math.multiply(V, dt))), 'radians').to('deg');
    }
}

// our version of math with additional units
exports.math = math
exports.Lowry = Lowry;
exports.toBritish = toBritish;
exports.toUnits = toUnits;
