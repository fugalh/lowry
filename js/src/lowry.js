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

// custom units and math helpers
math.createUnit('slug', '1 lbf s^2 / ft');
math.createUnit('HP', '550 ft lbf / sec');
math.createUnit('rpm', '1 / minute');
math.createUnit('rps', '1 / second');
math.createUnit('knot', {definition: '0.514444 m/s', aliases: ['knots', 'kt', 'kts', 'kcas', 'ktas']});
math.createUnit('inHg', '3.38639 kPa');

math.lift = (x, u) => {
    return math.isUnit(x) ? x.to(u) : math.unit(x, u);
}

math.lower = (x, u) => {
    return math.isUnit(x) ? x.toNumber(u) : x;
}

// constants
const T0 = math.unit(15, 'degC');
const p0 = math.unit(29.92, 'inHg');
const densityUnit = 'slug / ft^3';
const rho0 = math.unit(0.00237, densityUnit);

// Convert data with units to implicit British engineering units (raw numbers).
// Elements which aren't units will be copied untouched.
function toBritish(data) {
    function _convert(u) {
        const bases = [
            'ft', // length
            'ft^2', // area
            densityUnit,
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
            data[k] = math.lift(data_[k], u);
        }
    }
    return data;
}

// --- Helpers ---

function standardTemperature(pressureAltitude) {
    let T0 = math.unit('15 degC');
    let lapseRate = math.unit(-0.001981, 'K/ft');
    let h = math.lift(pressureAltitude, 'ft');
    return math.add(T0, math.multiply(h, lapseRate)).to('degF');
}

// Relative atmospheric density given height (ft) and temperature (degF)
function relativeDensity(h, T) {
    if (!T) {
        T = standardTemperature(h);
    }
    let h_ = math.lower(h, 'ft');
    let T_ = math.lower(T, 'degF');
    // [PoLA] eq F.2
    return (518.7 / (T_ + 459.7)) * (1 - 6.8752e-6 * h_);
}

// Calculate atmospheric density given height (ft) and temperature (degF)
function density(h, T) {
    return math.multiply(rho0, relativeDensity(h, T));
}

// Calculate true airspeed from
// calibrated airspeed (knots), height (feet), and temperature (degF)
function tas(V_C, h, T) {
    // [Bootstrap] eq 4
    return math.divide(
        math.lift(V_C, 'knots'),
        math.sqrt(relativeDensity(h, T)));
}

function cas(V, h, T) {
   return math.multiply(V, math.sqrt(relativeDensity(h, T)));
}

// [PoLA] eq F.4
function tapeline(dh, h, T) {
    if (!T) {
        T = standardTemperature(h);
    }
    return math.multiply(
        math.divide(
            math.lift(T, 'degF'),
            standardTemperature(h)),
        math.lift(dh, 'ft')).to('ft');
}

// expects true airspeed, tapeline dh
function flightAngle(V, dh, dt) {
    // [Bootstrap] eq 3
    return math.lift(
        math.asin(math.divide(dh, math.multiply(V, dt))),
        'radians').to('deg');
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
        this.W0_ = data_.W0;

        // [Bootstrap] pg 25
        this.A = data_?.A ?? data_.B * data_.B / data_.S;
        this.M0_ = data_?.M0 ?? data_.P0 / (2 * math.pi * data_.n0);
        this.C = data_?.C ?? 0.12;

        let rho0_ = math.lower(rho0, densityUnit);

        if ('drag' in data) {
            // TODO adapt to the more accurate approach in [PoLA] appendix F (density altitude and tapeline dh)
            let drag = data.drag;
            let sigma = relativeDensity(drag.h, drag.T);

            // [Bootstrap] eq 3
            let dh = tapeline(drag.dh, drag.h, drag.T);
            let Vbg = tas(drag.V_Cbg, drag.h, drag.T);
            let gamma_bg = flightAngle(Vbg, dh, drag.dt);

            // [Bootstrap] eq 5
            let V_Cbg2 = math.pow(toBritish(drag.V_Cbg), 2);
            this.C_D0 = toBritish(drag.W) * math.sin(gamma_bg) / (rho0_ * V_Cbg2 * data_.S);

            // [PoLA] eq 9.41
            let W_ = math.lower(drag.W, 'lbf');
            let Vbg_ = Vbg.toNumber('ft/s');
            let rho_ = math.multiply(rho0, sigma).toNumber(densityUnit);
            // I think there's a sign error in the book, it uses -W but that gives the wrong sign.
            this.C_D0 = W_ * math.sin(gamma_bg) / (rho_ * this.S_ * Vbg_ * Vbg_);

            // [Bootstrap] eq 6, [PoLA] eq 9.42 (wings level)
            this.e = 4 * this.C_D0 / (math.pi * this.A * math.pow(math.tan(gamma_bg), 2));
        }

        if ('thrust' in data) {
            // TODO take temperature into account for rho and Vx and Vm
            let thrust = data.thrust;
            let W2 = math.pow(toBritish(thrust.W), 2);
            let rho_ = math.lower(density(thrust.h), densityUnit);
            let rho2_ = math.pow(rho_, 2);
            let d2 = math.pow(data_.d, 2);
            let Vx = math.lower(tas(thrust.V_Cx, thrust.h), 'ft/s');
            let Vx4 = math.pow(Vx, 4);

            // [Bootstrap] eq 8
            this.b = (data_.S * this.C_D0 / (2 * d2)) - 2 * W2 / (rho2_ * d2 * data_.S * math.pi * this.e * this.A * Vx4);

            let V_M2 = math.pow(tas(thrust.V_CM, thrust.h).toNumber('ft/s'), 2);
            let phi = this.dropoffFactor(thrust.h);
            // [Bootstrap] eq 9, but substituting M0 for P0/2πn0
            this.m = (data_.d * W2 / (this.M0_ * math.pi * phi * rho_ * data_.S * math.pi * this.e * this.A)) * (1/V_M2 + V_M2/Vx4);
        }

        this.d_ = data_.d;

        // composites [Bootstrap] pg 27-28
        this.E0 = this.m * this.M0_ * 2 * math.pi / this.d_;
        this.F0 = rho0_ * this.d_ * this.d_ * this.b;
        this.G0 = rho0_ * this.S_ * this.C_D0 / 2;
        this.H0 = 2 * this.W0_ * this.W0_ / (rho0_ * this.S_ * math.pi * this.e * this.A);
        this.K0 = this.F0 - this.G0;
        this.Q0 = this.E0 / this.K0;
        this.R0 = this.H0 / this.K0;
        this.U0 = this.H0 / this.G0;
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

    composites(W, h) {
        // TODO density altitude
        let phi = this.dropoffFactor(h);
        let sigma = relativeDensity(h);
        let WW2 = math.pow(math.lower(W, 'lbf') / this.W0_, 2);
        let y = {
            E: phi * this.E0,
            F: sigma * this.F0,
            G: sigma * this.G0,
            H: WW2 * this.H0 / sigma,
            K: sigma * this.K0,
            Q: phi * this.Q0 / sigma,
            R: WW2 * this.R0 / sigma,
            U: WW2 * this.U0 / sigma,
        };
        return y;
    }

    Vspeeds(W, h) {
        let c = this.composites(W, h);
        return {
            // [PoLA] eq 7.24
            Vy: math.unit(cas(math.sqrt(-c.Q / 6 + math.sqrt(c.Q * c.Q / 36 - c.R / 3)), h), 'ft/s'),
            Vx: math.unit(cas(math.pow(-c.R, 0.25), h), 'ft/s'),
        }
    }

    // --- Helpers ---

    // phi(sigma(h))
    dropoffFactor(h) {
        // [Bootstrap] eq 2
        return (relativeDensity(h) - this.C) / (1 - this.C);
    }
}

// our version of math with additional units
exports.math = math
exports.Lowry = Lowry;
exports.toBritish = toBritish;
exports.toUnits = toUnits;
exports.relativeDensity = relativeDensity;
exports.tas = tas;
exports.cas = cas;
exports.standardTemperature = standardTemperature;
exports.tapeline = tapeline;
exports.flightAngle = flightAngle;
