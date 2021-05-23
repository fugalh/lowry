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
math.createUnit('knot', {definition: '0.514444 m/s', aliases: ['knots', 'kt', 'kts']});

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
    return rho0_ * (1 - toBritish(h) / 145457)^4.25635
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
        rho_: rho_s_(h),
    });
    // [Bootstrap] eq 4
    return x_.V_C / sqrt(x_.rho_ / rho0_);
}

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
        };
    }

    get plate() {
        return toUnits(this.britishPlate);
    }

    // Dropoff factor
    phi_(h) {
        // [Bootstrap] eq 2
        return (sigma_(h) - this.C) / (1 - this.C);
    }
}

// our version of math with additional units
exports.math = math
exports.Lowry = Lowry;
exports.toBritish = toBritish;
exports.toUnits = toUnits;
