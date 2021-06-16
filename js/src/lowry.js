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
math.createUnit('mph', {definition: '1 mile / hour', aliases: ['mias', 'mcas']});
math.createUnit('inHg', '3.38639 kPa');

math.lift = (x, u) => {
    if (!x) return x;
    return math.isUnit(x) ? x.to(u) : math.unit(x, u);
}

math.lower = (x, u) => {
    return math.isUnit(x) ? x.toNumber(u) : x;
}

// constants
const T0 = math.unit(288.15, 'K');
const lapseRate = math.unit(0.001981, 'K/ft');
const p0 = math.unit(29.921, 'inHg');
const densityUnit = 'slug / ft^3';
const rho0 = math.unit(0.00237, densityUnit);
const T0a = math.divide(T0, lapseRate); // T0 / alpha

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
    let h = math.lift(pressureAltitude, 'ft');
    return math.subtract(T0, math.multiply(h, lapseRate));
}

// Relative atmospheric density given height (ft) and temperature (degF)
function relativeDensity(h, T) {
    let h_ = math.lower(h, 'ft');
    if (T) {
        let T_ = math.lower(T, 'degF');

        // [PoLA] eq F.2
        return (518.7 / (T_ + 459.7)) * (1 - 6.8752e-6 * h_);
    }
    // [PoLA] eq 1.10
    return math.pow(1 - h_ / 145457, 4.25635)
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
        math.sqrt(relativeDensity(h, T))).to('ktas');
}

function cas(V, h, T) {
   return math.multiply(V, math.sqrt(relativeDensity(h, T))).to('kcas');
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
        this.d_ = data_.d;

        // [Bootstrap] pg 25
        this.A = data_?.A ?? data_.B * data_.B / data_.S;
        this.M0_ = data_?.M0 ?? data_.P0 / (2 * math.pi * data_.n0);
        this.C = data_?.C ?? 0.12;

        let rho0_ = math.lower(rho0, densityUnit);

        if ('drag' in data) {
            // [PoLA] appendix F
            let drag = data.drag;
            let sigma = relativeDensity(drag.h, drag.T);

            let dh = tapeline(drag.dh, drag.h, drag.T);
            let Vbg = tas(drag.V_Cbg, drag.h, drag.T);
            let gamma_bg = flightAngle(Vbg, dh, drag.dt);

            // [PoLA] eq 9.41
            let W_ = math.lower(drag.W, 'lbf');
            let Vbg_ = Vbg.toNumber('ft/s');
            let rho_ = math.multiply(rho0, sigma).toNumber(densityUnit);
            // I think there's a sign error in [PoLA] eq 9.41,
            // it uses -W but that gives the wrong sign.
            this.C_D0 = W_ * math.sin(gamma_bg) / (rho_ * this.S_ * Vbg_ * Vbg_);

            // [Bootstrap] eq 6, [PoLA] eq 9.42 (wings level)
            this.e = 4 * this.C_D0 / (math.pi * this.A * math.pow(math.tan(gamma_bg), 2));
        }

        if ('thrust' in data) {
            const thrust = data.thrust;
            const W2 = math.pow(toBritish(thrust.W), 2);
            const rho_ = math.lower(density(thrust.h, thrust.T), densityUnit);
            const d_ = this.d_;
            const Vx_ = math.lower(tas(thrust.V_Cx, thrust.h, thrust.T), 'ft/s');
            const Vx4_ = math.pow(Vx_, 4);

            // [Bootstrap] eq 8, [PoLA] eq 7.1
            this.b = (data_.S * this.C_D0 / (2 * d_ * d_)) -
                2 * W2 / (rho_ * rho_ * d_ * d_ *
                    data_.S * math.pi * this.e * this.A * Vx4_);

            const V_M2_ = math.pow(
                tas(thrust.V_CM, thrust.h, thrust.T).toNumber('ft/s'), 2);
            const phi = this.dropoffFactor(thrust.h, thrust.T);
            // [Bootstrap] eq 9, but substituting πM0 = P0/2n0
            this.m = (
                    (d_ * W2) /
                    (math.pi * this.M0_ * phi * rho_ * this.S_ *
                        math.pi * this.e * this.A)
                ) * (
                    (1 / V_M2_) + (V_M2_ / Vx4_)
                );
        }

        // mock overrides for testing
        this.C_D0 = data.C_D0 ?? this.C_D0;
        this.e = data.e ?? this.e;
        this.b = data.b ?? this.b;
        this.m = data.m ?? this.m;
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

    composites(W, h, T) {
        // We don't worry about W/W0, instead we just calculate the base
        // composites on the fly. CPU is cheap.
        const W_ = math.lower(W, 'lbf');
        const rho0_ = math.lower(rho0, densityUnit);
        const phi = this.dropoffFactor(h, T);
        const sigma = relativeDensity(h, T);

        // composites [Bootstrap] pg 27-28
        const E0 = this.m * this.M0_ * 2 * math.pi / this.d_;
        const F0 = rho0_ * this.d_ * this.d_ * this.b;
        const G0 = rho0_ * this.S_ * this.C_D0 / 2;
        const H0 = 2 * W_ * W_ / (rho0_ * this.S_ * math.pi * this.e * this.A);
        const K0 = F0 - G0;
        const Q0 = E0 / K0;
        const R0 = H0 / K0;
        const U0 = H0 / G0;

        return {
            E: phi * E0,
            F: sigma * F0,
            G: sigma * G0,
            H: H0 / sigma,
            K: sigma * K0,
            Q: phi * Q0 / sigma,
            R: R0 / (sigma * sigma),
            U: U0 / (sigma * sigma),
        };
    }

    Vspeeds(W, h, T) {
        let c = this.composites(W, h, T);
        let v = {};

        // [PoLA] eq 7.24
        let tmp = c.Q * c.Q / 36 - c.R / 3;
        if (tmp > 0) {
            tmp = -c.Q / 6 + math.sqrt(tmp);
            if (tmp > 0) {
                v.Vy = math.unit(math.sqrt(tmp), 'ft/s');
            } else {
                v.Vy = NaN;
            }
        }
        tmp = c.Q * c.Q / 4 + c.R;
        if (tmp > 0) {
            tmp = -c.Q / 2 + math.sqrt(tmp);
            if (tmp > 0) {
                v.VM = math.unit(math.sqrt(tmp), 'ft/s');
            } else {
                v.VM = NaN;
            }
        }
        v.Vbg = math.unit(math.pow(c.U, 0.25), 'ft/s');
        v.Vmd = math.unit(math.pow(c.U /3, 0.25), 'ft/s');

        return {
            Vx: cas(math.unit(math.pow(-c.R, 0.25), 'ft/s'), h, T),
            Vy: v.Vy ? cas(v.Vy, h, T) : undefined,
            VM: v.VM ? cas(v.VM, h, T) : undefined,
            Vbg: cas(v.Vbg, h, T),
            Vmd: cas(v.Vmd, h, T),
        };
    }

    performance(V, W, h, T) {
        const c = this.composites(W, h, T);
        let y = {};
        let V2 = math.lower(math.multiply(V, V), 'ft/s');
        y.T = c.E + c.F * V2;

        // hmm, we need to return units here, really, which means we probably
        // should be using units in the composites after all too. and probably
        // should be using units even more thoroughly throughout.
        // Also I'm thinking about overall structure and wondering if it wouldn't be better to have a more functional approach, even.
        // inputs -> plate
        // plate, W, densityAltitude(h, T) -> v speeds
        // plate, V, W, densityAltitude(h, T) -> performance
        // and perhaps, rather than doing all the calculations have functions for each output. But perhaps not. Need to mull that one over.
        // The first is essentially what we have, or not far from it

        // The second and third - do we leave them as methods of plate, or make
        // them just functions. or make objects for (plate, W, sigma) and
        // (plate, V, W, sigma) with getters? The composite base cases could be getters on plate.

        // I should write pseudocode for a few graphs and see what feels right.

        return y;
    }

    // --- Helpers ---

    // phi(sigma(h))
    dropoffFactor(h, T) {
        // [Bootstrap] eq 2
        return (relativeDensity(h, T) - this.C) / (1 - this.C);
    }
}

// our version of math with additional units
exports.math = math
exports.Lowry = Lowry;
exports.toBritish = toBritish;
exports.toUnits = toUnits;
exports.density = density;
exports.relativeDensity = relativeDensity;
exports.tas = tas;
exports.cas = cas;
exports.standardTemperature = standardTemperature;
exports.tapeline = tapeline;
exports.flightAngle = flightAngle;
